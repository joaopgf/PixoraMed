output "url_app" {
  description = "Endereço do app. A API fica no mesmo endereço, em /api, e a documentação em /docs"
  value       = render_web_service.api.url
}

output "url_ia" {
  description = "Endereço do microsserviço de IA (só /saude é público; /docs mostra as rotas)"
  value       = render_web_service.ia.url
}

output "database_url" {
  description = "Conexão do Postgres (para rodar scripts/importar_resultados.py contra a nuvem)"
  value       = neon_project.banco.connection_uri
  sensitive   = true
}
