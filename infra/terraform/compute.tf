# ---------------------------------------------------------------------------
# Compute: one Launch Template + Auto Scaling Group per tier, spread across
# both AZs, registered with its load balancer target group.
# ---------------------------------------------------------------------------

# Latest Amazon Linux 2023 AMI (patched image on every new launch)
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"

  instance_tags = {
    web = { Name = "${var.project}-web", Tier = "web" }
    app = { Name = "${var.project}-app", Tier = "app" }
  }
}

# ---- Web tier ----
resource "aws_launch_template" "web" {
  name_prefix            = "${var.project}-web-"
  image_id               = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.web.id]
  update_default_version = true

  iam_instance_profile {
    arn = aws_iam_instance_profile.web.arn
  }

  # IMDSv2 only; hop limit 2 so containers can use the instance role
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/web-user-data.sh.tftpl", {
    project         = var.project
    region          = var.aws_region
    registry        = local.registry
    image_tag_param = aws_ssm_parameter.image_tag.name
    web_secret_arn  = aws_secretsmanager_secret.web.arn
    api_upstream    = "${aws_lb.internal.dns_name}:80"
    log_group       = aws_cloudwatch_log_group.web.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = local.instance_tags.web
  }
  tag_specifications {
    resource_type = "volume"
    tags          = local.instance_tags.web
  }
}

resource "aws_autoscaling_group" "web" {
  name                      = "${var.project}-web-asg"
  vpc_zone_identifier       = aws_subnet.web[*].id
  min_size                  = var.web_min_size
  desired_capacity          = var.web_desired_capacity
  max_size                  = var.web_max_size
  target_group_arns         = [aws_lb_target_group.web.arn]
  health_check_type         = "ELB" # replace instances the ALB marks unhealthy
  health_check_grace_period = 300
  default_instance_warmup   = 120
  wait_for_capacity_timeout = "0" # do not block terraform on boot (images may not exist yet)

  launch_template {
    id      = aws_launch_template.web.id
    version = aws_launch_template.web.latest_version
  }

  # Changing the launch template rolls instances one by one, keeping >= 50% serving
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 120
    }
  }

  enabled_metrics = [
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupMinSize",
    "GroupMaxSize",
    "GroupTotalInstances",
  ]

  dynamic "tag" {
    for_each = local.instance_tags.web
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    ignore_changes = [desired_capacity] # owned by the scaling policies after creation
  }
}

# Elasticity signal 1: keep average CPU near the target
resource "aws_autoscaling_policy" "web_cpu" {
  name                   = "${var.project}-web-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target_percent
  }
}

# Elasticity signal 2: keep requests per instance near the target
resource "aws_autoscaling_policy" "web_requests" {
  name                   = "${var.project}-web-requests-target"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.public.arn_suffix}/${aws_lb_target_group.web.arn_suffix}"
    }
    target_value = var.web_requests_per_target
  }

  depends_on = [aws_lb_listener.public_http]
}

# ---- Application tier ----
resource "aws_launch_template" "app" {
  name_prefix            = "${var.project}-app-"
  image_id               = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.app.id]
  update_default_version = true

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/app-user-data.sh.tftpl", {
    project         = var.project
    region          = var.aws_region
    registry        = local.registry
    image_tag_param = aws_ssm_parameter.image_tag.name
    db_secret_arn   = aws_secretsmanager_secret.db.arn
    app_secret_arn  = aws_secretsmanager_secret.app.arn
    uploads_bucket  = aws_s3_bucket.uploads.bucket
    client_url      = "http://${aws_lb.public.dns_name}"
    seed_demo_data  = tostring(var.seed_demo_data)
    log_group       = aws_cloudwatch_log_group.app.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = local.instance_tags.app
  }
  tag_specifications {
    resource_type = "volume"
    tags          = local.instance_tags.app
  }

  # The secret versions must exist before an instance tries to read them
  depends_on = [
    aws_secretsmanager_secret_version.db,
    aws_secretsmanager_secret_version.app,
  ]
}

resource "aws_autoscaling_group" "app" {
  name                      = "${var.project}-app-asg"
  vpc_zone_identifier       = aws_subnet.app[*].id
  min_size                  = var.app_min_size
  desired_capacity          = var.app_desired_capacity
  max_size                  = var.app_max_size
  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300
  default_instance_warmup   = 120
  wait_for_capacity_timeout = "0"

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 120
    }
  }

  enabled_metrics = [
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupMinSize",
    "GroupMaxSize",
    "GroupTotalInstances",
  ]

  dynamic "tag" {
    for_each = local.instance_tags.app
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}

resource "aws_autoscaling_policy" "app_cpu" {
  name                   = "${var.project}-app-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target_percent
  }
}
