# Valores mostrados depois do apply (terraform output). Os sensíveis só aparecem com "terraform output -raw <nome>".

output "frontend_url" {
  description = "Endereço do site na Vercel"
  value       = local.frontend_url
}

output "backend_url" {
  description = "Endereço do backend no Render (a API fica em /api). Deve ser o mesmo do frontend/vercel.json"
  value       = render_web_service.backend.url
}

output "ai_service_url" {
  description = "Endereço do ai-service no Render (só /health é público)"
  value       = render_web_service.ai_service.url
}

output "database_url" {
  description = "Conexão do Postgres no formato postgresql:// (para psql ou pgAdmin)"
  value       = neon_project.database.connection_uri
  sensitive   = true
}
