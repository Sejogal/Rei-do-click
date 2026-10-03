import { Link, useLocation } from "react-router-dom";

export function Header() {
  const { pathname } = useLocation();
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
    <header className="flex items-center gap-2 p-6 max-w-5xl mx-auto">
      <Link to="/" className="text-2xl font-mono text-accent mr-6">
        ⌨ typearena
      </Link>
      {link("/", "solo")}
      {link("/multiplayer", "multiplayer")}
    </header>
  );
}