terraform {
  required_version = ">= 1.6"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = ">= 0.6"
    }
    render = {
      source  = "render-oss/render"
      version = ">= 1.3"
    }
    vercel = {
      source  = "vercel/vercel"
      version = ">= 2.0"
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
