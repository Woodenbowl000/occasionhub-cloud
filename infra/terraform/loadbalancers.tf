# ---------------------------------------------------------------------------
# Load balancing
#   public ALB   (public subnets)  -> web target group  (web tier, port 80)
#   internal ALB (app subnets)     -> app target group  (app tier, port 3002)
# ---------------------------------------------------------------------------

# ---- Public, internet-facing ----
resource "aws_lb" "public" {
  name                       = "${var.project}-public-alb"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb_public.id]
  subnets                    = aws_subnet.public[*].id
  drop_invalid_header_fields = true
  idle_timeout               = 60

  tags = { Name = "${var.project}-public-alb" }
}

resource "aws_lb_target_group" "web" {
  name                 = "${var.project}-web-tg"
  port                 = 80
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "instance"
  deregistration_delay = 30 # let in-flight requests finish during deploys

  health_check {
    path                = "/healthz"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${var.project}-web-tg" }
}

resource "aws_lb_listener" "public_http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# ---- Internal (not reachable from the internet) ----
resource "aws_lb" "internal" {
  name                       = "${var.project}-internal-alb"
  internal                   = true
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb_internal.id]
  subnets                    = aws_subnet.app[*].id
  drop_invalid_header_fields = true
  idle_timeout               = 60

  tags = { Name = "${var.project}-internal-alb" }
}

resource "aws_lb_target_group" "app" {
  name                 = "${var.project}-app-tg"
  port                 = 3002
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "instance"
  deregistration_delay = 30

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${var.project}-app-tg" }
}

resource "aws_lb_listener" "internal_http" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
