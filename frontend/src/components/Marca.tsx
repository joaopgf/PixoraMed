import { Link } from "react-router-dom";

export default function Marca({ para = "/", className = "" }: { para?: string; className?: string }) {
  return (
    <Link className={`brand ${className}`} to={para}>
      <span className="brand-mark">P</span>
      <span>PixoraMed</span>
    </Link>
  );
}
