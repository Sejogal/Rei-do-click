import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth";

export function Header() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-1 rounded transition ${
        pathname === to ? "text-accent" : "text-sub hover:text-text"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="flex items-center justify-center gap-2 p-6 max-w-5xl mx-auto">
      <Link to="/" className="text-2xl font-mono text-accent mr-6">
        ⌨ typearena
      </Link>
      {link("/", "solo")}
      {link("/multiplayer", "multiplayer")}
      {user ? (
        <>
          {link("/profile", user.username)}
          <button
            onClick={logout}
            className="px-3 py-1 text-sub hover:text-error text-sm font-mono"
          >
            sair
          </button>
        </>
      ) : (
        link("/auth", "entrar")
      )}
    </header>
  );
}