import { useNavigate } from "react-router-dom";

import { Alerta, CabecalhoPagina, iniciais } from "../components/Estrutura";
import Icone from "../components/Icone";
import { useEstado } from "../estado";
import { formatarData } from "../modulos";

const ATIVOS = [
  { titulo: "Login com e-mail e senha", nota: "Senha guardada só como hash scrypt com salt" },
  { titulo: "Sessão com validade", nota: "Expira em 8 horas; ao sair, o token é apagado no servidor" },
  { titulo: "Histórico por usuário", nota: "Cada conta vê só as próprias análises" },
];

const CONTROLES = [
  { titulo: "Autenticação multifator (MFA)", nota: "Não implementada neste projeto" },
  { titulo: "Recuperação e troca de senha", nota: "E-mail de redefinição e confirmação de conta" },
  { titulo: "Proteção contra tentativas repetidas", nota: "Limite de tentativas e bloqueio temporário" },
  { titulo: "Controle de acesso por função", nota: "Perfis, permissões e escopo institucional" },
  { titulo: "Trilha de auditoria", nota: "Registro de acesso, envio, execução e revisão" },
  { titulo: "Criptografia e retenção", nota: "Política de armazenamento e descarte" },
];

export default function Conta() {
  const navegar = useNavigate();
  const { sair, usuario } = useEstado();

  return (
    <>
      <CabecalhoPagina
        rotulo="PREFERÊNCIAS"
        titulo="Conta e segurança"
        descricao="Dados da sua conta, o que já protege o acesso e o que ainda falta para uma implantação real."
      />
      <div className="account-grid">
        <section className="profile-card">
          <div className="profile-hero">
            <span className="avatar large">{iniciais(usuario?.nome ?? "")}</span>
            <div>
              <h3>{usuario?.nome}</h3>
              <p>Conta da PixoraMed</p>
            </div>
          </div>
          <div className="info-pair">
            <span>E-mail</span>
            <strong>{usuario?.email}</strong>
          </div>
          <div className="info-pair">
            <span>Conta criada em</span>
            <strong>{usuario ? formatarData(usuario.criado_em) : ""}</strong>
          </div>
          <div className="info-pair">
            <span>Permissão</span>
            <strong>Análises e histórico próprio</strong>
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
            Sair da conta <Icone nome="logout" />
          </button>
        </section>

        <section className="profile-card">
          <h3 style={{ margin: "0 0 7px", fontSize: 15 }}>Segurança e privacidade</h3>
          <p className="muted small" style={{ margin: "0 0 14px", lineHeight: 1.6 }}>
            O que já está ativo e o que precisaria ser implementado antes de qualquer uso com dados reais.
          </p>
          {ATIVOS.map((controle) => (
            <div key={controle.titulo} className="setting-row">
              <div>
                <strong>{controle.titulo}</strong>
                <small>{controle.nota}</small>
              </div>
              <span className="pill success">Ativo</span>
            </div>
          ))}
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
          Seria necessário reforçar a autenticação (MFA, recuperação de senha), autorização por perfil, proteção de dados pessoais sensíveis, gestão de consentimento
          e base legal adequada (LGPD), auditoria e validação clínica e regulatória.
        </Alerta>
      </div>
    </>
  );
}
