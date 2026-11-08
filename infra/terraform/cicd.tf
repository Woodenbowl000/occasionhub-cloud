# ---------------------------------------------------------------------------
# CI/CD identity for GitHub Actions. Two modes (var.github_auth_mode):
#
#  "access_key" (default): a dedicated IAM user whose only permissions are the
#    deploy policy below. Its key pair is stored as encrypted GitHub
#    *environment* secrets in "production", which only the main branch can use.
#    Used because the AWS-managed SCP of a new-experience (Free plan) project
#    denies iam:*Provider*, so an OIDC identity provider cannot be created.
#
#  "oidc": keyless OpenID Connect federation, the preferred option where the
#    account allows identity providers. One-hour credentials for a role that
#    only trusts this repository's main branch / production environment.
# ---------------------------------------------------------------------------

locals {
  use_oidc = var.github_auth_mode == "oidc"
}

# The deploy permissions, identical in both modes
data "aws_iam_policy_document" "github_actions" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # this action does not support resource scoping
  }
  statement {
    sid = "PushImages"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [for r in aws_ecr_repository.this : r.arn]
  }
  statement {
    sid       = "PublishImageTag"
    actions   = ["ssm:GetParameter", "ssm:PutParameter"]
    resources = [aws_ssm_parameter.image_tag.arn]
  }
  statement {
    sid     = "RollingDeploy"
    actions = ["autoscaling:StartInstanceRefresh", "autoscaling:CancelInstanceRefresh"]
    # Name pattern instead of a reference, so this identity can be created
    # before the Auto Scaling Groups exist (bootstrap stage 1 in the README)
    resources = ["arn:aws:autoscaling:${var.aws_region}:${data.aws_caller_identity.current.account_id}:autoScalingGroup:*:autoScalingGroupName/${var.project}-*"]
  }
  statement {
    sid = "ReadDeployState"
    actions = [
      "autoscaling:DescribeAutoScalingGroups",
      "autoscaling:DescribeInstanceRefreshes",
      "ec2:DescribeLaunchTemplates",
      "ec2:DescribeLaunchTemplateVersions",
    ]
    resources = ["*"] # describe actions do not support resource scoping
  }
}

# ---- Mode "access_key": deploy-only IAM user (no console password) ----
resource "aws_iam_user" "github_actions" {
  count = local.use_oidc ? 0 : 1
  name  = "${var.project}-github-actions"
  path  = "/ci/"
}

resource "aws_iam_user_policy" "github_actions" {
  count  = local.use_oidc ? 0 : 1
  name   = "ci-cd-deploy"
  user   = aws_iam_user.github_actions[0].name
  policy = data.aws_iam_policy_document.github_actions.json
}

# The secret key lives only in the local, git-ignored Terraform state. Read it
# once with `terraform output -raw github_secret_access_key` and paste it into
# GitHub. Rotate: terraform apply -replace='aws_iam_access_key.github_actions[0]'
resource "aws_iam_access_key" "github_actions" {
  count = local.use_oidc ? 0 : 1
  user  = aws_iam_user.github_actions[0].name
}

# ---- Mode "oidc": keyless federation ----
resource "aws_iam_openid_connect_provider" "github" {
  count           = local.use_oidc && var.create_github_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = local.use_oidc && !var.create_github_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_assume" {
  count = local.use_oidc ? 1 : 0
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type = "Federated"
      identifiers = [var.create_github_oidc_provider ?
        aws_iam_openid_connect_provider.github[0].arn :
      data.aws_iam_openid_connect_provider.github[0].arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_repo}:environment:production",
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  count                = local.use_oidc ? 1 : 0
  name                 = "${var.project}-github-actions"
  assume_role_policy   = data.aws_iam_policy_document.github_assume[0].json
  max_session_duration = 3600
}

resource "aws_iam_role_policy" "github_actions" {
  count  = local.use_oidc ? 1 : 0
  name   = "ci-cd-deploy"
  role   = aws_iam_role.github_actions[0].id
  policy = data.aws_iam_policy_document.github_actions.json
}
