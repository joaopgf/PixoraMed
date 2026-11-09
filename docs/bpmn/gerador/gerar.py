"""Gera os três workflows BPMN 2.0 do PixoraMed em docs/bpmn/.

Uso, da pasta docs/bpmn/gerador:
    python gerar.py

Cada etapa fica numa raia, numa coluna e numa linha (veja kit.py). Os .bpmn seguem o
padrão BPMN 2.0 e foram conferidos no bpmn-js (o mesmo do bpmn.io e do Camunda Modeler),
de onde os PNGs foram exportados.
"""

import sys
from pathlib import Path

from kit import COL, X0, Diagrama

SAIDA = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
SAIDA.mkdir(parents=True, exist_ok=True)


def x(col):
    return X0 + col * COL


# =====================================================================
# 1. Login
# =====================================================================
d = Diagrama("login", "PixoraMed: login e cadastro", [
    ("usuario", "Usuário (navegador)", 2),
    ("api", "API principal", 2),
    ("banco", "Banco de dados (Neon)", 2),
])
d.no("inicio", "startEvent", "Início", "usuario", 0)
d.no("abrir", "userTask", "Abrir a tela de acesso", "usuario", 1)
d.no("g_conta", "exclusiveGateway", "Já tem conta?", "usuario", 2, rotulo="cima")
d.no("informar", "userTask", "Informar e-mail e senha", "usuario", 3)
d.no("preencher", "userTask", "Preencher nome, e-mail, senha e confirmação", "usuario", 3, linha=1)
d.no("g_senhas", "exclusiveGateway", "Senha e confirmação iguais?", "usuario", 4, linha=1, rotulo="cima")
d.no("validar", "serviceTask", "Validar nome, e-mail e senha", "api", 5)
d.no("g_validos", "exclusiveGateway", "Dados válidos e e-mail livre?", "api", 6, rotulo="cima")
d.no("hash", "serviceTask", "Gerar o hash da senha (scrypt com salt)", "api", 7)
d.no("gravar_usuario", "serviceTask", "Gravar o usuário", "banco", 8)
d.no("conferir", "serviceTask", "Buscar o usuário e conferir a senha", "api", 9)
d.no("g_cred", "exclusiveGateway", "E-mail e senha corretos?", "api", 10, rotulo="dir")
d.no("sessao", "serviceTask", "Criar a sessão (token aleatório, 8 horas)", "api", 11)
d.no("gravar_token", "serviceTask", "Gravar só o hash do token", "banco", 12)
d.no("guardar", "userTask", "Guardar o token no navegador", "usuario", 13)
d.no("painel", "userTask", "Acessar o painel", "usuario", 14)
d.no("fim", "endEvent", "Fim", "usuario", 15)

u0 = d.nos["abrir"]["cy"]
u1 = d.nos["preencher"]["cy"]
a0 = d.nos["validar"]["cy"]

d.fluxo("inicio", "abrir")
d.fluxo("abrir", "g_conta")
d.fluxo("g_conta", "informar", "Sim")
d.fluxo("g_conta", "preencher", "Não", rota="vh", rotulo_em=(x(2) + 8, u0 + 70))
d.fluxo("preencher", "g_senhas")
d.fluxo("g_senhas", "preencher", "Não", pontos=[(x(4), u1 + 68), (x(3), u1 + 68)], saida="baixo", entrada="baixo", rotulo_em=(x(4) - 52, u1 + 46))
d.fluxo("g_senhas", "validar", "Sim", rota="hv")
d.fluxo("validar", "g_validos")
d.fluxo("g_validos", "hash", "Sim")
d.fluxo("g_validos", "preencher", "Não", pontos=[(x(6), a0 + 72), (x(3) - 140, a0 + 72), (x(3) - 140, u1)],
        saida="baixo", entrada="esq", rotulo_em=(x(6) + 8, a0 + 40))
d.fluxo("hash", "gravar_usuario", rota="hv")
d.fluxo("gravar_usuario", "sessao", rota="hv")
d.fluxo("informar", "conferir", rota="hv")
d.fluxo("conferir", "g_cred")
d.fluxo("g_cred", "sessao", "Sim", rotulo_em=(x(10) + 40, a0 + 6))
d.fluxo("g_cred", "informar", "Não", pontos=[(x(10), 22), (x(3), 22)], saida="cima", entrada="cima", rotulo_em=(x(10) + 8, 30))
d.fluxo("sessao", "gravar_token", rota="hv")
d.fluxo("gravar_token", "guardar", rota="hv")
d.fluxo("guardar", "painel")
d.fluxo("painel", "fim")

d.nota("n_validar", "Nome de 2 a 80 letras, e-mail válido e senha de 8 a 128 caracteres. E-mail já cadastrado é recusado.", "validar", -105, 95, 330, 60)
d.nota("n_hash", "A senha nunca é guardada: só o hash scrypt com salt.", "hash", -105, 70, 260, 52)
d.nota("n_cred", "Mesma mensagem para e-mail inexistente e senha errada, para não revelar quem tem conta.", "g_cred", -120, 70, 300, 60)
d.nota("n_sessao", "\"Sair\" apaga a sessão. Sessão vencida ou apagada volta para o login.", "sessao", -105, -(a0 - u1) - 30, 280, 52, lado="cima")
d.nota("n_token", "O banco guarda só o SHA-256 do token.", "gravar_token", -105, 70, 240, 45)
d.nota("n_guardar", "\"Manter conectado\": localStorage. Sem a opção: sessionStorage, que some ao fechar a aba.", "guardar", -340, 75, 300, 60)
d.nota("n_painel", "Análises e histórico exigem o token (Authorization: Bearer).", "painel", -105, 75, 290, 52)
d.salvar(SAIDA / "1_login.bpmn")

# =====================================================================
# 2. Microsserviço de IA
# =====================================================================
d = Diagrama("ia", "PixoraMed: microsserviço de IA", [
    ("api", "API principal", 2),
    ("ia", "Microsserviço de IA (Docker)", 3),
])
d.no("sobe", "startEvent", "Container da IA sobe", "ia", 0)
d.no("carregar", "serviceTask", "Carregar os modelos ONNX da pasta models/", "ia", 1)
d.no("saude", "serviceTask", "Responder /saude (health check)", "ia", 2)
d.no("pronta", "endEvent", "Pronta para pedidos", "ia", 3)

d.no("pedido", "startEvent", "Pedido de análise (usuário logado)", "api", 4)
d.no("g_tam", "exclusiveGateway", "Imagem até 10 MB?", "api", 5, rotulo="cima")
d.no("grande", "endEvent", "Recusada: imagem grande demais", "api", 5, linha=1)
d.no("enviar", "serviceTask", "Enviar modelo e imagem à IA, com o token", "api", 6)
d.no("g_token", "exclusiveGateway", "Token válido?", "ia", 7, linha=1, rotulo="esq")
d.no("r401", "endEvent", "Recusado (401)", "ia", 7, linha=2)
d.no("g_modelo", "exclusiveGateway", "Modelo carregado?", "ia", 8, linha=1, rotulo="cima")
d.no("r404", "endEvent", "Recusado (404)", "ia", 8, linha=2)
d.no("preproc", "serviceTask", "Ler e pré-processar a imagem (igual ao treino)", "ia", 9, linha=1)
d.no("g_img", "exclusiveGateway", "Imagem válida?", "ia", 10, linha=1, rotulo="cima")
d.no("r422", "endEvent", "Recusado (422)", "ia", 10, linha=2)
d.no("rodar", "serviceTask", "Executar o modelo ONNX", "ia", 11, linha=1)
d.no("devolver", "serviceTask", "Devolver as probabilidades", "ia", 12, linha=1)
d.no("decidir", "serviceTask", "Decidir a classe (inconclusivo e limiar da Pele)", "api", 13)
d.no("gravar", "serviceTask", "Gravar o resultado (sem a imagem)", "api", 14)
d.no("responder", "serviceTask", "Responder ao navegador", "api", 15)
d.no("entregue", "endEvent", "Resultado entregue", "api", 16)

d.fluxo("sobe", "carregar")
d.fluxo("carregar", "saude")
d.fluxo("saude", "pronta")
d.fluxo("pedido", "g_tam")
d.fluxo("g_tam", "grande", "Não", rotulo_em=(x(5) + 8, d.nos["g_tam"]["cy"] + 40))
d.fluxo("g_tam", "enviar", "Sim")
d.fluxo("enviar", "g_token", rota="hv")
d.fluxo("g_token", "r401", "Não", rotulo_em=(x(7) + 8, d.nos["g_token"]["cy"] + 40))
d.fluxo("g_token", "g_modelo", "Sim")
d.fluxo("g_modelo", "r404", "Não", rotulo_em=(x(8) + 8, d.nos["g_modelo"]["cy"] + 40))
d.fluxo("g_modelo", "preproc", "Sim")
d.fluxo("preproc", "g_img")
d.fluxo("g_img", "r422", "Não", rotulo_em=(x(10) + 8, d.nos["g_img"]["cy"] + 40))
d.fluxo("g_img", "rodar", "Sim")
d.fluxo("rodar", "devolver")
d.fluxo("devolver", "decidir", rota="hv")
d.fluxo("decidir", "gravar")
d.fluxo("gravar", "responder")
d.fluxo("responder", "entregue")

d.nota("n_carregar", "Uma vez, na subida. Cada pedido usa o modelo que já está na memória.", "carregar", -105, 70, 300, 52)
d.nota("n_saude", "O Render chama /saude para saber se o serviço está no ar. É a única rota sem token.", "saude", -50, 70, 300, 60)
d.nota("n_enviar", "Espera até 120 s, porque no Render gratuito a IA pode estar dormindo. Sem resposta: \"serviço de IA indisponível\" (503).",
       "enviar", -105, 70, 330, 75)
d.nota("n_token", "Cabeçalho X-Token-IA. O token é gerado pelo Terraform e o mesmo vai para os dois serviços.", "g_token", -330, -150, 280, 60, lado="esq")
d.nota("n_401", "A API responde \"serviço de IA indisponível\" (503) e registra o erro.", "r401", -330, -25, 270, 52, lado="esq")
d.nota("n_recusas", "Nos dois casos, a API repassa a recusa ao navegador com a mesma mensagem.", "r422", 50, -25, 280, 52, lado="dir")
d.nota("n_preproc", "Oral e Cérebro: OpenCV, BGR para RGB, 128x128, divisão por 255. Pele: PIL, 224x224, normalização ImageNet.",
       "preproc", -105, -150, 330, 60)
d.nota("n_devolver", "A IA não decide a classe, não acessa o banco e não guarda a imagem.", "devolver", -60, 70, 290, 52)
d.nota("n_decidir", "Oral e Cérebro: \"inconclusivo\" abaixo de 80%. Pele: maligno a partir de 18%, com aviso de baixa certeza abaixo de 80%.",
       "decidir", 25, 70, 330, 75)
d.salvar(SAIDA / "2_microsservico_ia.bpmn")

# =====================================================================
# 3. Uso do sistema
# =====================================================================
d = Diagrama("uso", "PixoraMed: análise de uma imagem", [
    ("usuario", "Usuário", 2),
    ("sistema", "Sistema (site e API principal)", 4),
    ("ia", "Microsserviço de IA", 2),
])
d.no("inicio", "startEvent", "Início", "usuario", 0)
d.no("entrar", "userTask", "Entrar na conta", "usuario", 1)
d.no("tipo", "userTask", "Escolher o tipo de câncer", "usuario", 2)
d.no("enviar", "userTask", "Enviar a imagem", "usuario", 3)
d.no("valida_nav", "serviceTask", "Validar formato e tamanho", "sistema", 3, linha=1)
d.no("g_arquivo", "exclusiveGateway", "Arquivo aceito?", "sistema", 4, linha=1)
d.no("consent", "userTask", "Confirmar o consentimento", "usuario", 5)
d.no("revisar", "userTask", "Revisar o caso e executar a análise", "usuario", 6)
d.no("enviar_ia", "serviceTask", "Enviar a imagem ao serviço de IA", "sistema", 6, linha=1)
d.no("valida_ia", "serviceTask", "Ler e pré-processar a imagem", "ia", 7)
d.no("g_img", "exclusiveGateway", "Imagem válida?", "ia", 8, rotulo="dir")
d.no("modelo", "serviceTask", "Usar o modelo já carregado", "ia", 9)
d.no("rodar", "serviceTask", "Executar o modelo ONNX", "ia", 10)
d.no("probs", "serviceTask", "Devolver as probabilidades", "ia", 11)
d.no("g_modulo", "exclusiveGateway", "Módulo?", "sistema", 12, linha=1, rotulo="esq")
d.no("g_conf", "exclusiveGateway", "Confiança >= 80%?", "sistema", 13, rotulo="cima")
d.no("classe", "serviceTask", "Definir a classe prevista", "sistema", 14)
d.no("inconclusivo", "serviceTask", "Definir \"inconclusivo\"", "sistema", 14, linha=1)
d.no("pele", "serviceTask", "Aplicar o limiar de 18% (benigno ou maligno)", "sistema", 14, linha=2)
d.no("g_junta", "exclusiveGateway", None, "sistema", 15, linha=1)
d.no("registrar", "serviceTask", "Registrar o resultado no banco", "sistema", 16, linha=1)
d.no("exibir", "serviceTask", "Exibir o resultado e os avisos", "sistema", 17, linha=1)
d.no("ver", "userTask", "Visualizar o resultado", "usuario", 17)
d.no("fim", "endEvent", "Fim", "usuario", 18)

u0 = d.nos["entrar"]["cy"]
sB = d.nos["valida_nav"]["cy"]

d.fluxo("inicio", "entrar")
d.fluxo("entrar", "tipo")
d.fluxo("tipo", "enviar")
d.fluxo("enviar", "valida_nav")
d.fluxo("valida_nav", "g_arquivo")
d.fluxo("g_arquivo", "enviar", "Não", pontos=[(x(4), u0)], saida="cima", entrada="dir", rotulo_em=(x(4) + 8, sB - 100))
d.fluxo("g_arquivo", "consent", "Sim", rota="hv", rotulo_em=(x(4) + 45, sB - 26))
d.fluxo("consent", "revisar")
d.fluxo("revisar", "enviar_ia")
d.fluxo("enviar_ia", "valida_ia", rota="hv")
d.fluxo("valida_ia", "g_img")
d.fluxo("g_img", "enviar", "Não", pontos=[(x(8), 22), (x(3), 22)], saida="cima", entrada="cima", rotulo_em=(x(8) + 8, 30))
d.fluxo("g_img", "modelo", "Sim", rotulo_em=(x(8) + 40, d.nos["g_img"]["cy"] + 6))
d.fluxo("modelo", "rodar")
d.fluxo("rodar", "probs")
d.fluxo("probs", "g_modulo", rota="hv")
d.fluxo("g_modulo", "g_conf", "Oral ou Cérebro", rota="vh", rotulo_em=(x(12) + 8, d.nos["g_conf"]["cy"] + 30))
d.fluxo("g_modulo", "pele", "Pele", rota="vh", rotulo_em=(x(12) + 8, d.nos["pele"]["cy"] - 26))
d.fluxo("g_conf", "classe", "Sim")
d.fluxo("g_conf", "inconclusivo", "Não", rota="vh", rotulo_em=(x(13) + 8, sB - 26))
d.fluxo("classe", "g_junta", rota="hv")
d.fluxo("inconclusivo", "g_junta")
d.fluxo("pele", "g_junta", rota="hv")
d.fluxo("g_junta", "registrar")
d.fluxo("registrar", "exibir")
d.fluxo("exibir", "ver")
d.fluxo("ver", "fim")

d.nota("n_entrar", "Detalhado no workflow 1 (login). Análise e histórico exigem login.", "entrar", -105, 70, 300, 52)
d.nota("n_valida_nav", "No navegador: PNG, JPG ou WEBP, até 10 MB.", "valida_nav", -105, 70, 260, 45)
d.nota("n_consent", "Material autorizado e desidentificado. Sem marcar, a análise não é liberada.", "consent", 25, 70, 290, 60)
d.nota("n_enviar_ia", "Detalhado no workflow 2 (microsserviço de IA).", "enviar_ia", -105, 70, 260, 45)
d.nota("n_valida_ia", "Imagem ilegível ou menor que o mínimo: a análise é recusada com a mensagem do erro.", "g_img", -10, 95, 300, 60)
d.nota("n_modelo", "Os modelos são carregados uma vez, quando o serviço sobe.", "modelo", 40, 70, 280, 45)
d.nota("n_probs", "Oral e Cérebro: softmax, não calibrado. Pele: média calibrada de 5 EfficientNet-B0. A IA não decide a classe.",
       "probs", 40, 70, 330, 60)
d.nota("n_pele", "Pele não tem inconclusivo: vira maligno a partir de 18%. Se nenhuma classe chega a 80%, mantém a classe e avisa baixa certeza.",
       "pele", -105, 70, 360, 60)
d.nota("n_registrar", "Só usuário, modelo, classe, confiança e horário. A imagem é descartada.", "registrar", -105, 70, 300, 52)
d.nota("n_ver", "Avisos: modelo experimental, baixa certeza (Pele) e o que o resultado não informa (Cérebro).", "ver", -350, 70, 320, 60)
d.salvar(SAIDA / "3_uso_do_sistema.bpmn")
print("ok")
