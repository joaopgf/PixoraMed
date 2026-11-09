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

variable "github_repo" {
  description = "Repositório no formato dono/nome, ex.: grupo/PixoraMed"
  type        = string
}

variable "branch" {
  description = "Branch publicada"
  type        = string
  default     = "main"
}

variable "nome" {
  description = "Prefixo dos recursos"
  type        = string
  default     = "pixoramed"
}
