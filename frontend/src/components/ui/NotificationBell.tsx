import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../store/notifications";

export function NotificationBell() {
  const { items, markRead, markAllRead, remove } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.read).length;
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  const label = (item: (typeof items)[number]) => {
    const name = item.payload.username;
    if (item.type === "friend_request") return `Pedido de amizade de ${name}`;
    if (item.type === "friend_accepted") return `${name} aceitou o teu pedido`;
    if (item.type === "room_invite") return `${name} convidou-te para a sala ${item.payload.room_id}`;
    if (item.type === "tournament_match") return `Partida do torneio ${item.payload.name ?? ""} na sala ${item.payload.room_id ?? ""}`;
    if (item.type === "achievement") return `Conquista desbloqueada: ${item.payload.label ?? item.payload.code}`;
    return "Nova notificação";
  };
  return <div ref={containerRef} className="relative"><button type="button" aria-label={`Notificações (${unread} não lidas)`} onClick={() => setOpen((value) => !value)} className="relative grid size-10 place-items-center rounded-lg text-sub transition-colors hover:bg-surface hover:text-accent"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-[10px] text-bg">{unread}</span>}</button>
    {open && <div className="absolute right-0 top-10 z-50 w-80 max-w-[90vw] rounded-xl border border-sub/20 bg-bg p-3 shadow-xl"><div className="flex items-center justify-between border-b border-sub/10 pb-2"><strong className="font-mono text-xs">Notificações</strong>{unread > 0 && <button onClick={() => void markAllRead()} className="text-[10px] text-accent">Marcar todas como lidas</button>}</div><div className="max-h-80 overflow-y-auto">{items.length ? items.map((item) => <div key={item.id} className={`border-b border-sub/10 py-3 text-xs ${item.read ? "text-sub" : "text-text"}`}><div>{label(item)}</div><div className="mt-2 flex gap-3">{item.type === "friend_request" && <Link onClick={() => setOpen(false)} to="/friends" className="text-accent">Ver pedido</Link>}{(item.type === "room_invite" || item.type === "tournament_match") && <Link onClick={() => { void markRead(item.id); setOpen(false); }} to={`/multiplayer?room=${encodeURIComponent(item.payload.room_id ?? "")}`} className="text-accent">Abrir sala</Link>} {!item.read && <button onClick={() => void markRead(item.id)} className="text-sub">Lida</button>}<button onClick={() => void remove(item.id)} className="text-error">Remover</button></div></div>) : <p className="py-5 text-center text-xs text-sub">Sem notificações.</p>}</div></div>}
  </div>;
}
