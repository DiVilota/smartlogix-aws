module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  create_iam_role = false
  iam_role_arn    = aws_iam_role.eks_cluster.arn

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }

  eks_managed_node_groups = {
    main = {
      instance_types = [var.node_instance_type]
      min_size       = var.node_group_min_size
      max_size       = var.node_group_max_size
      desired_size   = var.node_group_desired_size

      capacity_type = "SPOT"
    }
  }

  node_security_group_additional_rules = {
    ingress_postgres = {
      description                   = "Allow PostgreSQL within VPC"
      protocol                      = "tcp"
      from_port                     = 5432
      to_port                       = 5432
      type                          = "ingress"
      source_cluster_security_group = true
    }
    ingress_backend = {
      description                   = "Allow Spring Boot services"
      protocol                      = "tcp"
      from_port                     = 8080
      to_port                       = 8085
      type                          = "ingress"
      source_cluster_security_group = true
    }
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}
