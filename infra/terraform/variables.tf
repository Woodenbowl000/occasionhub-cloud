# ---------------------------------------------------------------------------
# General
# ---------------------------------------------------------------------------
variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "occasionhub"
}

variable "aws_region" {
  description = "AWS Region to deploy into. Must be the Region your AWS project was created in."
  type        = string
  default     = "ap-southeast-2" # Sydney
}

variable "aws_profile" {
  description = "AWS CLI profile Terraform signs in with (created by `aws login --profile <name>`). null = default credential chain."
  type        = string
  default     = null
}

variable "github_repo" {
  description = "GitHub repository allowed to deploy, as owner/name (e.g. aliafzal/occasionhub-cloud)."
  type        = string
}

variable "github_auth_mode" {
  description = "How GitHub Actions authenticates to AWS: access_key (deploy-only IAM user, keys in GitHub environment secrets) or oidc (keyless; needs an account that allows IAM identity providers)."
  type        = string
  default     = "access_key"
  validation {
    condition     = contains(["access_key", "oidc"], var.github_auth_mode)
    error_message = "The github_auth_mode must be access_key or oidc."
  }
}

variable "create_github_oidc_provider" {
  description = "oidc mode only: create the GitHub OIDC identity provider. Set false if the account already has one."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "Address range of the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to spread subnets and instances over."
  type        = number
  default     = 2
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "Use 2 or 3 Availability Zones (the ALB and RDS subnet group need at least 2)."
  }
}

variable "single_nat_gateway" {
  description = "true = one NAT gateway (cheaper, single point of failure for outbound traffic). false = one per AZ."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Compute
# ---------------------------------------------------------------------------
variable "instance_type" {
  description = "EC2 instance type for both tiers."
  type        = string
  default     = "t3.micro"
}

variable "web_min_size" {
  type    = number
  default = 2
}
variable "web_desired_capacity" {
  type    = number
  default = 2
}
variable "web_max_size" {
  type    = number
  default = 4
}

variable "app_min_size" {
  type    = number
  default = 2
}
variable "app_desired_capacity" {
  type    = number
  default = 2
}
variable "app_max_size" {
  type    = number
  default = 4
}

variable "cpu_target_percent" {
  description = "Target average CPU for target-tracking auto scaling."
  type        = number
  default     = 50
}

variable "web_requests_per_target" {
  description = "Target ALB requests per web instance per minute (second scaling signal)."
  type        = number
  default     = 1000
}

variable "initial_image_tag" {
  description = "Image tag instances start with before the pipeline has published one."
  type        = string
  default     = "bootstrap"
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL major version (PostGIS and pg_trgm are available on RDS)."
  type        = string
  default     = "16"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_max_allocated_storage" {
  description = "Upper limit (GB) for RDS storage auto scaling; 0 disables it (default, stays within the Free Tier 20 GB)."
  type        = number
  default     = 0
}

variable "db_multi_az" {
  description = "Standby replica in a second AZ with automatic failover. Doubles database cost."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Automated backup retention. Accounts on the AWS Free plan may be limited to 1 day."
  type        = number
  default     = 1
}

variable "db_name" {
  type    = string
  default = "occasionhub"
}

variable "db_username" {
  type    = string
  default = "occasionhub_admin"
}

# ---------------------------------------------------------------------------
# Application settings and optional third-party keys
# (kept in AWS Secrets Manager, never in the image or the pipeline)
# ---------------------------------------------------------------------------
variable "seed_demo_data" {
  description = "Load the demo venues and accounts on first start (idempotent)."
  type        = bool
  default     = true
}

variable "stripe_secret_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "google_client_id" {
  type    = string
  default = ""
}

variable "resend_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "email_from" {
  type    = string
  default = ""
}

# ---------------------------------------------------------------------------
# Monitoring and cost control
# ---------------------------------------------------------------------------
variable "alert_email" {
  description = "Email address that receives CloudWatch alarms and billing alerts (confirm the subscription email AWS sends)."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly AWS spend that triggers billing alerts at 50%, 80% and 100% (actual) and 100% (forecast)."
  type        = number
  default     = 25
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "enable_flow_logs" {
  description = "Record VPC network flow logs (accepted and rejected traffic) in CloudWatch."
  type        = bool
  default     = true
}
