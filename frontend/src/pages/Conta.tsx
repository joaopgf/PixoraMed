import { useNavigate } from "react-router-dom";

import { Alerta, CabecalhoPagina } from "../components/Estrutura";
import Icone from "../components/Icone";
import { useEstado } from "../estado";

const CONTROLES = [
  { titulo: "Autenticação multifator (MFA)", nota: "Não implementada neste projeto" },
  { titulo: "Controle de acesso por função", nota: "Perfis, permissões e escopo institucional" },
  { titulo: "Trilha de auditoria", nota: "Registro de acesso, envio, execução e revisão" },
  { titulo: "Criptografia e retenção", nota: "Política de armazenamento e descarte" },
];

export default function Conta() {
  const navegar = useNavigate();
  const { sair } = useEstado();

  return (
    <>
      <CabecalhoPagina
        rotulo="PREFERÊNCIAS"
        titulo="Conta e segurança"
        descricao="Configurações ilustrativas do ambiente e pontos previstos para uma implantação real."
      />
      <div className="account-grid">
        <section className="profile-card">
          <div className="profile-hero">
            <span className="avatar large">PD</span>
            <div>
              <h3>Profissional demonstrativo</h3>
              <p>Perfil ilustrativo · Médico / pesquisador</p>
            </div>
          </div>
          <div className="info-pair">
            <span>E-mail</span>
            <strong>demo@pixoramed.local</strong>
          </div>
          <div className="info-pair">
            <span>Instituição</span>
            <strong>Ambiente de apresentação</strong>
          </div>
          <div className="info-pair">
            <span>Permissão</span>
            <strong>Navegação e análises de demonstração</strong>
          </div>
          <div className="info-pair">
            <span>Sessão</span>
            <strong>Local no navegador</strong>
          </div>
          <button
            type="button"
            className="btn danger"
            style={{ marginTop: 18, width: "100%" }}
            onClick={() => {
              sair();
              navegar("/");
            }}
          >
            Encerrar demonstração <Icone nome="logout" />
          </button>
        </section>

        <section className="profile-card">
          <h3 style={{ margin: "0 0 7px", fontSize: 15 }}>Segurança e privacidade</h3>
          <p className="muted small" style={{ margin: "0 0 14px", lineHeight: 1.6 }}>
            Os itens abaixo precisariam ser implementados antes de qualquer uso com dados reais.
          </p>
          {CONTROLES.map((controle) => (
            <div key={controle.titulo} className="setting-row">
              <div>
                <strong>{controle.titulo}</strong>
                <small>{controle.nota}</small>
              </div>
              <span className="pill neutral">Pendente</span>
            </div>
          ))}
          <div className="setting-row">
            <div>
              <strong>Imagens enviadas</strong>
              <small>Processadas em memória e descartadas; o banco guarda só o resultado</small>
            </div>
            <span className="pill success">Ativo</span>
          </div>
        </section>
      </div>
      <div style={{ marginTop: 15 }}>
        <Alerta tipo="info" icone="shield">
          <strong>Antes de usar com pacientes.</strong>
          <br />
          Seria necessário implementar autenticação real, autorização, proteção de dados pessoais sensíveis, gestão de consentimento
          e base legal adequada (LGPD), auditoria e validação clínica e regulatória.
        </Alerta>
      </div>
    </>
  );
}
