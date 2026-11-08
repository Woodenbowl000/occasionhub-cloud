# ---------------------------------------------------------------------------
# Security groups: one per tier, each allowing ONLY the next hop.
#
#   internet --80--> [alb-public] --80--> [web] --80--> [alb-internal]
#            --3002--> [app] --5432--> [db]
#
# Terraform removes AWS's default "allow all outbound" rule, so every egress
# below is explicit too. No security group allows SSH: administrators use
# AWS Systems Manager Session Manager instead.
# ---------------------------------------------------------------------------

resource "aws_security_group" "alb_public" {
  name        = "${var.project}-alb-public-sg"
  description = "Internet-facing ALB: HTTP from anywhere, forwards only to the web tier"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-alb-public-sg" }
}

resource "aws_security_group" "web" {
  name        = "${var.project}-web-sg"
  description = "Web tier: accepts traffic only from the public ALB"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-web-sg" }
}

resource "aws_security_group" "alb_internal" {
  name        = "${var.project}-alb-internal-sg"
  description = "Internal ALB: accepts traffic only from the web tier"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-alb-internal-sg" }
}

resource "aws_security_group" "app" {
  name        = "${var.project}-app-sg"
  description = "Application tier: accepts traffic only from the internal ALB"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-app-sg" }
}

resource "aws_security_group" "db" {
  name        = "${var.project}-db-sg"
  description = "Database: PostgreSQL only from the application tier, no outbound"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-db-sg" }
}

# ---- Public ALB ----
resource "aws_vpc_security_group_ingress_rule" "alb_public_http" {
  security_group_id = aws_security_group.alb_public.id
  description       = "HTTP from the internet"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "alb_public_to_web" {
  security_group_id            = aws_security_group.alb_public.id
  description                  = "To web tier"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

# ---- Web tier ----
resource "aws_vpc_security_group_ingress_rule" "web_from_alb" {
  security_group_id            = aws_security_group.web.id
  description                  = "HTTP from the public ALB only"
  referenced_security_group_id = aws_security_group.alb_public.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "web_to_internal_alb" {
  security_group_id            = aws_security_group.web.id
  description                  = "API calls to the internal ALB"
  referenced_security_group_id = aws_security_group.alb_internal.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "web_https_out" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS out via NAT: ECR image pulls, SSM, CloudWatch, Secrets Manager, OS packages"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

# ---- Internal ALB ----
resource "aws_vpc_security_group_ingress_rule" "alb_internal_from_web" {
  security_group_id            = aws_security_group.alb_internal.id
  description                  = "HTTP from the web tier only"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "alb_internal_to_app" {
  security_group_id            = aws_security_group.alb_internal.id
  description                  = "To application tier"
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 3002
  to_port                      = 3002
}

# ---- Application tier ----
resource "aws_vpc_security_group_ingress_rule" "app_from_internal_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "API port from the internal ALB only"
  referenced_security_group_id = aws_security_group.alb_internal.id
  ip_protocol                  = "tcp"
  from_port                    = 3002
  to_port                      = 3002
}

resource "aws_vpc_security_group_egress_rule" "app_to_db" {
  security_group_id            = aws_security_group.app.id
  description                  = "PostgreSQL to the database"
  referenced_security_group_id = aws_security_group.db.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_egress_rule" "app_https_out" {
  security_group_id = aws_security_group.app.id
  description       = "HTTPS out: ECR, S3 (via endpoint), Secrets Manager, CloudWatch, Stripe/Resend APIs"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

# ---- Database ----
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  description                  = "PostgreSQL from the application tier only"
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}
# (no egress rules on the database security group)
