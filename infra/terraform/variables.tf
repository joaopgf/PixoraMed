# Variáveis de entrada do Terraform. As sensíveis vêm do terraform.tfvars (fora do git) ou de TF_VAR_*.

variable "neon_api_key" {
  description = "Chave da API do Neon (console.neon.tech > Account settings > API keys)"
  type        = string
  sensitive   = true
}

variable "render_api_key" {
  description = "Chave da API do Render (dashboard.render.com > Account settings > API keys)"
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "ID do workspace no Render (começa com usr- ou tea-)"
  type        = string
}

variable "vercel_api_token" {
  description = "Token da API da Vercel (vercel.com > Account settings > Tokens)"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "Repositório no formato dono/nome, ex.: grupo/PixoraMed"
  type        = string
}

variable "branch" {
  description = "Branch publicada"
  type        = string
  default     = "main"
}

variable "database_name" {
  description = "Nome do projeto no Neon"
  type        = string
  default     = "PixoraMedDB"
}

variable "project_name" {
  description = "Prefixo dos recursos. O backend vira <project_name>.onrender.com e o site <project_name>.vercel.app"
  type        = string
  default     = "pixoramed"
}
