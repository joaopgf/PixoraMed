import { useNavigate } from "react-router-dom";

import { CabecalhoPagina, iniciais } from "../components/Estrutura";
import Icone from "../components/Icone";
import { useEstado } from "../estado";
import { formatarData } from "../modulos";

export default function Conta() {
  const navegar = useNavigate();
  const { sair, usuario } = useEstado();

  return (
    <>
      <CabecalhoPagina
        rotulo="PREFERÊNCIAS"
        titulo="Conta e segurança"
        descricao="Dados da sua conta na PixoraMed."
      />
      <section className="profile-card" style={{ maxWidth: 560 }}>
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
    </>
  );
}
