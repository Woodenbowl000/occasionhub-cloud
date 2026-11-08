# ---------------------------------------------------------------------------
# Container registry: one private ECR repository per image
#   client  - Next.js front end  (web tier)
#   proxy   - Nginx edge proxy   (web tier)
#   server  - Express API        (application tier)
# ---------------------------------------------------------------------------

locals {
  images = toset(["client", "proxy", "server"])
}

resource "aws_ecr_repository" "this" {
  for_each = local.images

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "IMMUTABLE" # a tag (git SHA) always means the same image
  force_delete         = true        # coursework: destroy even if images remain

  image_scanning_configuration {
    scan_on_push = true # basic CVE scan of every pushed image
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 10 most recent images (enough for rollbacks)"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ---------------------------------------------------------------------------
# Release pointer: the image tag every instance runs. The pipeline writes the
# new git SHA here and then starts a rolling instance refresh; new instances
# read it at boot. Terraform creates it once and then leaves its value alone.
# ---------------------------------------------------------------------------
resource "aws_ssm_parameter" "image_tag" {
  name        = "/${var.project}/image-tag"
  description = "Container image tag (git commit SHA) deployed to all tiers"
  type        = "String"
  value       = var.initial_image_tag

  lifecycle {
    ignore_changes = [value]
  }
}
