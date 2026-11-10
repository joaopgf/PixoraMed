"""Gera os três workflows BPMN 2.0 do PixoraMed em docs/bpmn/.

Uso, da pasta docs/bpmn/generator:
    python generate.py

Cada etapa fica numa raia, numa coluna e numa linha (veja kit.py). Os .bpmn seguem o
padrão BPMN 2.0 e foram conferidos no bpmn-js (o mesmo do bpmn.io e do Camunda Modeler),
de onde os PNGs foram exportados.
"""

import sys
from pathlib import Path

from kit import COL, X0, Diagram

OUTPUT_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def x(col):
    return X0 + col * COL


# =====================================================================
# 1. Login
# =====================================================================
d = Diagram("login", "PixoraMed: login e cadastro", [
    ("usuario", "Usuário (navegador)", 2),
    ("api", "Backend (Spring Boot)", 2),
    ("banco", "Banco de dados (Neon)", 2),
])
d.node("inicio", "startEvent", "Início", "usuario", 0)
d.node("abrir", "userTask", "Abrir a tela de acesso", "usuario", 1)
d.node("g_conta", "exclusiveGateway", "Já tem conta?", "usuario", 2, label="top")
d.node("informar", "userTask", "Informar e-mail e senha", "usuario", 3)
d.node("preencher", "userTask", "Preencher nome, e-mail, senha e confirmação", "usuario", 3, row=1)
d.node("g_senhas", "exclusiveGateway", "Senha e confirmação iguais?", "usuario", 4, row=1, label="top")
d.node("validar", "serviceTask", "Validar nome, e-mail e senha", "api", 5)
d.node("g_validos", "exclusiveGateway", "Dados válidos e e-mail livre?", "api", 6, label="top")
d.node("hash", "serviceTask", "Gerar o hash da senha (BCrypt)", "api", 7)
d.node("gravar_usuario", "serviceTask", "Gravar o usuário", "banco", 8)
d.node("conferir", "serviceTask", "Buscar o usuário e conferir a senha", "api", 9)
d.node("g_cred", "exclusiveGateway", "E-mail e senha corretos?", "api", 10, label="right")
d.node("sessao", "serviceTask", "Gerar o token JWT (assinado, válido por 8 horas)", "api", 11)
d.node("guardar", "userTask", "Guardar o token no navegador", "usuario", 12)
d.node("painel", "userTask", "Acessar o painel", "usuario", 13)
d.node("fim", "endEvent", "Fim", "usuario", 14)

u0 = d.nodes["abrir"]["cy"]
u1 = d.nodes["preencher"]["cy"]
a0 = d.nodes["validar"]["cy"]

d.flow("inicio", "abrir")
d.flow("abrir", "g_conta")
d.flow("g_conta", "informar", "Sim")
d.flow("g_conta", "preencher", "Não", route="vh", label_at=(x(2) + 8, u0 + 70))
d.flow("preencher", "g_senhas")
d.flow("g_senhas", "preencher", "Não", points=[(x(4), u1 + 68), (x(3), u1 + 68)], exit_side="bottom", entry_side="bottom", label_at=(x(4) - 52, u1 + 46))
d.flow("g_senhas", "validar", "Sim", route="hv")
d.flow("validar", "g_validos")
d.flow("g_validos", "hash", "Sim")
d.flow("g_validos", "preencher", "Não", points=[(x(6), a0 + 72), (x(3) - 140, a0 + 72), (x(3) - 140, u1)],
        exit_side="bottom", entry_side="left", label_at=(x(6) + 8, a0 + 40))
d.flow("hash", "gravar_usuario", route="hv")
d.flow("gravar_usuario", "sessao", route="hv")
d.flow("informar", "conferir", route="hv")
d.flow("conferir", "g_cred")
d.flow("g_cred", "sessao", "Sim", label_at=(x(10) + 40, a0 + 6))
d.flow("g_cred", "informar", "Não", points=[(x(10), 22), (x(3), 22)], exit_side="top", entry_side="top", label_at=(x(10) + 8, 30))
d.flow("sessao", "guardar", route="hv")
d.flow("guardar", "painel")
d.flow("painel", "fim")

d.note("n_validar", "Nome de 2 a 80 letras, e-mail válido e senha de 8 a 128 caracteres. E-mail já cadastrado é recusado.", "validar", -105, 95, 330, 60)
d.note("n_hash", "A senha nunca é guardada: só o hash BCrypt.", "hash", -105, 70, 260, 52)
d.note("n_cred", "Mesma mensagem para e-mail inexistente e senha errada, para não revelar quem tem conta.", "g_cred", -120, 70, 300, 60)
d.note("n_sessao", "O token não fica no banco. \"Sair\" apaga o token do navegador; token vencido volta para o login.", "sessao", -250, -(a0 - u1) - 30, 270, 52, side="top")
d.note("n_guardar", "\"Manter conectado\": localStorage. Sem a opção: sessionStorage, que some ao fechar a aba.", "guardar", -105, 75, 255, 60)
d.note("n_painel", "Análises e histórico exigem o token (Authorization: Bearer).", "painel", -95, 75, 290, 52)
d.save(OUTPUT_DIR / "1_login.bpmn")

# =====================================================================
# 2. Microsserviço de IA
# =====================================================================
d = Diagram("ia", "PixoraMed: microsserviço de IA", [
    ("api", "Backend (Spring Boot)", 2),
    ("ia", "ai-service (FastAPI + ONNX, Docker)", 3),
])
d.node("sobe", "startEvent", "Container da IA sobe", "ia", 0)
d.node("carregar", "serviceTask", "Carregar os modelos ONNX da pasta models/", "ia", 1)
d.node("saude", "serviceTask", "Responder /health (health check)", "ia", 2)
d.node("pronta", "endEvent", "Pronta para pedidos", "ia", 3)

d.node("pedido", "startEvent", "Pedido de análise (usuário logado)", "api", 4)
d.node("g_tam", "exclusiveGateway", "Imagem até 10 MB?", "api", 5, label="top")
d.node("grande", "endEvent", "Recusada: imagem grande demais", "api", 5, row=1)
d.node("enviar", "serviceTask", "Enviar modelo e imagem à IA, com o token", "api", 6)
d.node("g_token", "exclusiveGateway", "Token válido?", "ia", 7, row=1, label="left")
d.node("r401", "endEvent", "Recusado (401)", "ia", 7, row=2)
d.node("g_modelo", "exclusiveGateway", "Modelo carregado?", "ia", 8, row=1, label="top")
d.node("r404", "endEvent", "Recusado (404)", "ia", 8, row=2)
d.node("preproc", "serviceTask", "Ler e pré-processar a imagem (igual ao treino)", "ia", 9, row=1)
d.node("g_img", "exclusiveGateway", "Imagem válida?", "ia", 10, row=1, label="top")
d.node("r422", "endEvent", "Recusado (422)", "ia", 10, row=2)
d.node("rodar", "serviceTask", "Executar o modelo ONNX", "ia", 11, row=1)
d.node("devolver", "serviceTask", "Devolver as probabilidades", "ia", 12, row=1)
d.node("decidir", "serviceTask", "Decidir a classe (inconclusivo e limiar da Pele)", "api", 13)
d.node("gravar", "serviceTask", "Gravar o resultado (sem a imagem)", "api", 14)
d.node("responder", "serviceTask", "Responder ao navegador", "api", 15)
d.node("entregue", "endEvent", "Resultado entregue", "api", 16)

d.flow("sobe", "carregar")
d.flow("carregar", "saude")
d.flow("saude", "pronta")
d.flow("pedido", "g_tam")
d.flow("g_tam", "grande", "Não", label_at=(x(5) + 8, d.nodes["g_tam"]["cy"] + 40))
d.flow("g_tam", "enviar", "Sim")
d.flow("enviar", "g_token", route="hv")
d.flow("g_token", "r401", "Não", label_at=(x(7) + 8, d.nodes["g_token"]["cy"] + 40))
d.flow("g_token", "g_modelo", "Sim")
d.flow("g_modelo", "r404", "Não", label_at=(x(8) + 8, d.nodes["g_modelo"]["cy"] + 40))
d.flow("g_modelo", "preproc", "Sim")
d.flow("preproc", "g_img")
d.flow("g_img", "r422", "Não", label_at=(x(10) + 8, d.nodes["g_img"]["cy"] + 40))
d.flow("g_img", "rodar", "Sim")
d.flow("rodar", "devolver")
d.flow("devolver", "decidir", route="hv")
d.flow("decidir", "gravar")
d.flow("gravar", "responder")
d.flow("responder", "entregue")

d.note("n_carregar", "Uma vez, na subida. Cada pedido usa o modelo que já está na memória.", "carregar", -105, 70, 300, 52)
d.note("n_saude", "O Render chama /health para saber se o serviço está no ar. É a única rota sem token.", "saude", -50, 70, 300, 60)
d.note("n_enviar", "Espera até 120 s, porque no Render gratuito a IA pode estar dormindo. Sem resposta: \"serviço de IA indisponível\" (503).",
       "enviar", -105, 70, 330, 75)
d.note("n_token", "Cabeçalho X-Internal-Token. O token (AI_SERVICE_TOKEN) é gerado pelo Terraform e o mesmo vai para os dois serviços.", "g_token", -330, -150, 280, 60, side="left")
d.note("n_401", "O backend responde \"serviço de IA indisponível\" (503) e registra o erro.", "r401", -330, -25, 270, 52, side="left")
d.note("n_recusas", "Nos dois casos, o backend repassa a recusa ao navegador com a mesma mensagem.", "r422", 50, -25, 280, 52, side="right")
d.note("n_preproc", "Oral e Cérebro: OpenCV, BGR para RGB, 128x128, divisão por 255. Pele: PIL, 224x224, normalização ImageNet.",
       "preproc", -105, -150, 330, 60)
d.note("n_devolver", "A IA não decide a classe, não acessa o banco e não guarda a imagem.", "devolver", -60, 70, 290, 52)
d.note("n_decidir", "Oral e Cérebro: \"inconclusivo\" abaixo de 80%. Pele: maligno a partir de 18%, com aviso de baixa certeza abaixo de 80%.",
       "decidir", 25, 70, 330, 75)
d.save(OUTPUT_DIR / "2_ai_service.bpmn")

# =====================================================================
# 3. Uso do sistema
# =====================================================================
d = Diagram("uso", "PixoraMed: análise de uma imagem", [
    ("usuario", "Usuário", 2),
    ("sistema", "Sistema (site e backend)", 4),
    ("ia", "ai-service", 2),
])
# O login fica no workflow 1: este processo começa com o usuário já logado
d.node("inicio", "startEvent", "Usuário logado", "usuario", 1)
d.node("kind", "userTask", "Escolher o tipo de câncer", "usuario", 2)
d.node("enviar", "userTask", "Enviar a imagem", "usuario", 3)
d.node("valida_nav", "serviceTask", "Validar formato e tamanho", "sistema", 3, row=1)
d.node("g_arquivo", "exclusiveGateway", "Arquivo aceito?", "sistema", 4, row=1)
d.node("consent", "userTask", "Confirmar o consentimento", "usuario", 5)
d.node("revisar", "userTask", "Revisar o caso e executar a análise", "usuario", 6)
d.node("enviar_ia", "serviceTask", "Enviar a imagem ao serviço de IA", "sistema", 6, row=1)
d.node("valida_ia", "serviceTask", "Ler e pré-processar a imagem", "ia", 7)
d.node("g_img", "exclusiveGateway", "Imagem válida?", "ia", 8, label="right")
d.node("modelo", "serviceTask", "Usar o modelo já carregado", "ia", 9)
d.node("rodar", "serviceTask", "Executar o modelo ONNX", "ia", 10)
d.node("probs", "serviceTask", "Devolver as probabilidades", "ia", 11)
d.node("g_modulo", "exclusiveGateway", "Módulo?", "sistema", 12, row=1, label="left")
d.node("g_conf", "exclusiveGateway", "Confiança >= 80%?", "sistema", 13, label="top")
d.node("classe", "serviceTask", "Definir a classe prevista", "sistema", 14)
d.node("inconclusivo", "serviceTask", "Definir \"inconclusivo\"", "sistema", 14, row=1)
d.node("pele", "serviceTask", "Aplicar o limiar de 18% (benigno ou maligno)", "sistema", 14, row=2)
d.node("g_junta", "exclusiveGateway", None, "sistema", 15, row=1)
d.node("registrar", "serviceTask", "Registrar o resultado no banco", "sistema", 16, row=1)
d.node("exibir", "serviceTask", "Exibir o resultado e os avisos", "sistema", 17, row=1)
d.node("ver", "userTask", "Visualizar o resultado", "usuario", 17)
d.node("fim", "endEvent", "Fim", "usuario", 18)

u0 = d.nodes["kind"]["cy"]
sB = d.nodes["valida_nav"]["cy"]

d.flow("inicio", "kind")
d.flow("kind", "enviar")
d.flow("enviar", "valida_nav")
d.flow("valida_nav", "g_arquivo")
d.flow("g_arquivo", "enviar", "Não", points=[(x(4), u0)], exit_side="top", entry_side="right", label_at=(x(4) + 8, sB - 100))
d.flow("g_arquivo", "consent", "Sim", route="hv", label_at=(x(4) + 45, sB - 26))
d.flow("consent", "revisar")
d.flow("revisar", "enviar_ia")
d.flow("enviar_ia", "valida_ia", route="hv")
d.flow("valida_ia", "g_img")
d.flow("g_img", "enviar", "Não", points=[(x(8), 22), (x(3), 22)], exit_side="top", entry_side="top", label_at=(x(8) + 8, 30))
d.flow("g_img", "modelo", "Sim", label_at=(x(8) + 40, d.nodes["g_img"]["cy"] + 6))
d.flow("modelo", "rodar")
d.flow("rodar", "probs")
d.flow("probs", "g_modulo", route="hv")
d.flow("g_modulo", "g_conf", "Oral ou Cérebro", route="vh", label_at=(x(12) + 8, d.nodes["g_conf"]["cy"] + 30))
d.flow("g_modulo", "pele", "Pele", route="vh", label_at=(x(12) + 8, d.nodes["pele"]["cy"] - 26))
d.flow("g_conf", "classe", "Sim")
d.flow("g_conf", "inconclusivo", "Não", route="vh", label_at=(x(13) + 8, sB - 26))
d.flow("classe", "g_junta", route="hv")
d.flow("inconclusivo", "g_junta")
d.flow("pele", "g_junta", route="hv")
d.flow("g_junta", "registrar")
d.flow("registrar", "exibir")
d.flow("exibir", "ver")
d.flow("ver", "fim")

d.note("n_inicio", "O login está no workflow 1. Análise e histórico só ficam disponíveis para o usuário logado.", "inicio", -370, -26, 300, 52, side="left")
d.note("n_valida_nav", "No navegador: PNG, JPG ou WEBP, até 10 MB.", "valida_nav", -105, 70, 260, 45)
d.note("n_consent", "Material autorizado e desidentificado. Sem marcar, a análise não é liberada.", "consent", 25, 70, 290, 60)
d.note("n_enviar_ia", "Detalhado no workflow 2 (microsserviço de IA).", "enviar_ia", -105, 70, 260, 45)
d.note("n_valida_ia", "Imagem ilegível ou menor que o mínimo: a análise é recusada com a mensagem do erro.", "g_img", -10, 95, 300, 60)
d.note("n_modelo", "Os modelos são carregados uma vez, quando o serviço sobe.", "modelo", 40, 70, 280, 45)
d.note("n_probs", "Oral e Cérebro: softmax, não calibrado. Pele: média calibrada de 5 EfficientNet-B0. A IA não decide a classe.",
       "probs", 40, 70, 330, 60)
d.note("n_pele", "Pele não tem inconclusivo: vira maligno a partir de 18%. Se nenhuma classe chega a 80%, mantém a classe e avisa baixa certeza.",
       "pele", -105, 70, 360, 60)
d.note("n_registrar", "Só usuário, modelo, classe, confiança e horário. A imagem é descartada.", "registrar", -105, 70, 300, 52)
d.note("n_ver", "Avisos: modelo experimental, baixa certeza (Pele) e o que o resultado não informa (Cérebro).", "ver", -350, 70, 320, 60)
d.save(OUTPUT_DIR / "3_system_usage.bpmn")
print("ok")
