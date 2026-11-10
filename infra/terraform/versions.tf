# Versão do Terraform, providers (com versão fixa) e autenticação de cada provedor.
terraform {
  required_version = ">= 1.6"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0"
    }
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "5.26.1"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }
  }
}

provider "neon" {
  api_key = var.neon_api_key
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id
}

provider "vercel" {
  api_token = var.vercel_api_token
}
