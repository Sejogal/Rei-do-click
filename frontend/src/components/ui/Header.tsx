import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../store/auth";
import { NotificationBell } from "./NotificationBell";

type IconName = "solo" | "multiplayer" | "ranking" | "tournaments" | "about" | "settings" | "admin" | "friends" | "profile" | "logout" | "login";

function NavIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    solo: <><path d="M4 19 10 5l2 8 2-5 6 11"/><path d="M3 21h18"/></>,
    multiplayer: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20"/></>,
    ranking: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></>,
    tournaments: <><path d="M4 4h6v5H4zM14 15h6v5h-6zM4 15h6v5H4z"/><path d="M7 9v3h10v3M17 12V9"/></>,
    about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.9-2 3.4-2.2-.5a8 8 0 0 1-2 .9L14 23h-4l-.4-2.2a8 8 0 0 1-2-.9l-2.2.5-2-3.4 1.1-1.9a8 8 0 0 1 0-2.2l-1.1-1.9 2-3.4 2.2.5a8 8 0 0 1 2-.9L10 5h4l.4 2.2a8 8 0 0 1 2 .9l2.2-.5 2 3.4-1.1 1.9a8 8 0 0 1-.1 2.1z" transform="translate(0 -2) scale(.9)"/></>,
    admin: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/></>,
    friends: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 15a5 5 0 0 1 5 5"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    login: <><path d="M14 17l5-5-5-5M19 12H7"/><path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" {...common}>{paths[name]}</svg>;
}

export function Header() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const iconLink = (to: string, label: string, icon: IconName) => (
    <Link to={to} aria-label={label} title={label}
      className={`grid size-10 place-items-center rounded-lg transition-colors ${pathname === to ? "bg-accent/10 text-accent" : "text-sub hover:bg-surface hover:text-accent"}`}>
      <NavIcon name={icon} />
    </Link>
  );

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-1.5 px-4 py-4">
      <Link to="/" aria-label="Rei do clique — início" className="mr-auto whitespace-nowrap text-xl font-mono text-accent sm:text-2xl">
        <img src="/favicon-rei-do-clique.png" alt="" aria-hidden="true" className="mr-2 inline-block size-7 rounded-md align-middle" />Rei do clique
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-wrap items-center justify-center gap-1">
        {iconLink("/", "Solo", "solo")}
        {iconLink("/multiplayer", "Multiplayer", "multiplayer")}
        {iconLink("/leaderboard", "Ranking", "ranking")}
        {iconLink("/tournaments", "Torneios", "tournaments")}
        {iconLink("/sobre", "Sobre o projeto", "about")}
        {iconLink("/settings", "Definições", "settings")}
        {user && iconLink("/friends", "Amigos", "friends")}
        {user?.is_admin && iconLink("/admin", "Administração", "admin")}
        {user && <NotificationBell />}
        {user ? iconLink("/profile", `Perfil de ${user.username}`, "profile") : iconLink("/auth", "Entrar", "login")}
        {user && <button type="button" onClick={logout} aria-label="Sair" title="Sair" className="grid size-10 place-items-center rounded-lg text-sub transition-colors hover:bg-surface hover:text-error"><NavIcon name="logout" /></button>}
      </nav>
    </header>
  );
}
