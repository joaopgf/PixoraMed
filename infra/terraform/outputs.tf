output "url_api" {
  description = "Endereço da API (a documentação fica em /docs)"
  value       = render_web_service.api.url
}

output "url_app" {
  description = "Endereço do app"
  value       = "https://${vercel_project.web.name}.vercel.app"
}

output "database_url" {
  description = "Conexão do Postgres (para rodar scripts/importar_resultados.py contra a nuvem)"
  value       = neon_project.banco.connection_uri
  sensitive   = true
}
