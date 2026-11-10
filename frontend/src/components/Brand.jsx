// Logotipo da PixoraMed com link (para a página inicial ou para o painel).
import { Link } from "react-router-dom";

export default function Brand({ to = "/", className = "" }) {
  return (
    <Link className={`brand ${className}`} to={to}>
      <span className="brand-mark">P</span>
      <span>PixoraMed</span>
    </Link>
  );
}
