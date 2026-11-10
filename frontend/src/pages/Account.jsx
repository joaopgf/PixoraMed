// Tela da conta: dados do usuário logado e o botão de sair.
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { initials, PageHeader } from "../components/common";
import Icon from "../components/Icon";
import { formatDate } from "../utils/modules";

export default function Account() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  return (
    <>
      <PageHeader label="PREFERÊNCIAS" title="Conta e segurança" description="Dados da sua conta na PixoraMed." />
      <section className="profile-card" style={{ maxWidth: 560 }}>
        <div className="profile-hero">
          <span className="avatar large">{initials(user?.name ?? "")}</span>
          <div>
            <h3>{user?.name}</h3>
            <p>Conta da PixoraMed</p>
          </div>
        </div>
        <div className="info-pair">
          <span>E-mail</span>
          <strong>{user?.email}</strong>
        </div>
        <div className="info-pair">
          <span>Conta criada em</span>
          <strong>{user ? formatDate(user.createdAt) : ""}</strong>
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
            logout();
            navigate("/");
          }}
        >
          Sair da conta <Icon name="logout" />
        </button>
      </section>
    </>
  );
}
