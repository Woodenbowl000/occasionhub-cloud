terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.90"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # The state file holds secrets in plain text (CI access key, database
  # password, JWT key). It is kept OUTSIDE the project folder, in a sibling
  # folder "occasionhub-terraform-state", so zipping or uploading the project
  # can never include it. Back that folder up privately; delete it after
  # `terraform destroy`.
  backend "local" {
    path = "../../../occasionhub-terraform-state/terraform.tfstate"
  }

  # For a team, use an encrypted S3 bucket with locking instead, for example:
  # backend "s3" {
  #   bucket       = "occasionhub-tfstate-<account-id>"
  #   key          = "prod/terraform.tfstate"
  #   region       = "ap-southeast-2"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
      Course    = "SE-490-CEA"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
