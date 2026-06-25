output "aws_account_id" {
  description = "AWS Account ID"
  value       = local.account_id
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    for repo in aws_ecr_repository.repos : repo.name => repo.repository_url
  }
}

output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_registry_url" {
  description = "ECR registry URL"
  value       = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "github_secrets_needed" {
  description = "GitHub Secrets required for the pipeline"
  value = [
    "AWS_ACCESS_KEY_ID        = (from AWS Academy Learner Lab)",
    "AWS_SECRET_ACCESS_KEY    = (from AWS Academy Learner Lab)",
    "AWS_SESSION_TOKEN        = (from AWS Academy Learner Lab)",
    "AWS_REGION               = ${var.aws_region}",
    "EKS_CLUSTER              = ${module.eks.cluster_name}",
    "JWT_SECRET               = (generate a secure random string)",
    "DB_USER                  = smartlogix_user",
    "DB_PASSWORD              = (generate a secure password)",
  ]
}
