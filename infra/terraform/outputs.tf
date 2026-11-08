output "app_url" {
  description = "Open this in a browser (public load balancer)."
  value       = "http://${aws_lb.public.dns_name}"
}

output "aws_region" {
  value = var.aws_region
}

output "github_actions_role_arn" {
  description = "oidc mode: set as the GitHub variable AWS_ROLE_ARN."
  value       = local.use_oidc ? aws_iam_role.github_actions[0].arn : null
}

output "github_access_key_id" {
  description = "access_key mode: GitHub environment secret AWS_ACCESS_KEY_ID (environment: production)."
  value       = local.use_oidc ? null : aws_iam_access_key.github_actions[0].id
}

output "github_secret_access_key" {
  description = "access_key mode: GitHub environment secret AWS_SECRET_ACCESS_KEY. Read it with: terraform output -raw github_secret_access_key"
  value       = local.use_oidc ? null : aws_iam_access_key.github_actions[0].secret
  sensitive   = true
}

output "ecr_registry" {
  value = local.registry
}

output "ecr_repositories" {
  value = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "image_tag_parameter" {
  value = aws_ssm_parameter.image_tag.name
}

output "web_asg_name" {
  value = aws_autoscaling_group.web.name
}

output "app_asg_name" {
  value = aws_autoscaling_group.app.name
}

output "internal_alb_dns" {
  description = "Internal API load balancer (resolvable only inside the VPC)."
  value       = aws_lb.internal.dns_name
}

output "db_endpoint" {
  description = "Private database endpoint (not reachable from the internet)."
  value       = aws_db_instance.main.address
}

output "uploads_bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "dashboard_url" {
  value = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "github_variables" {
  description = "GitHub repository variables (Settings > Secrets and variables > Actions > Variables). APP_URL is the app_url output."
  value = {
    AWS_REGION   = var.aws_region
    AWS_ROLE_ARN = local.use_oidc ? aws_iam_role.github_actions[0].arn : "(not used in access_key mode)"
  }
}
