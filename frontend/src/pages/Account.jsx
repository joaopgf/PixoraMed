// Tela da conta: dados do usuário logado e o botão de sair.
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { initials, PageHeader } from "../components/common";
import Icon from "../components/Icon";
import InfoPair from "../components/InfoPair";
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
        <InfoPair label="E-mail">{user?.email}</InfoPair>
        <InfoPair label="Conta criada em">{user ? formatDate(user.createdAt) : ""}</InfoPair>
        <InfoPair label="Permissão">Análises e histórico próprio</InfoPair>
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
