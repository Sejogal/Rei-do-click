import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { friendsApi, usersApi, type PublicProfileData } from "../lib/api";
import { useAuth } from "../store/auth";

export function PublicProfile() {
  const { username = "" } = useParams();
  const currentUser = useAuth((state) => state.user);
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [error, setError] = useState("");
  const [friendError, setFriendError] = useState("");
  const [friendState, setFriendState] = useState<"checking" | "none" | "friends" | "pending_sent" | "pending_received">("checking");
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    usersApi.publicProfile(username).then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) setError((e as Error).message); });
    return () => { active = false; };
  }, [username]);
  useEffect(() => {
    const targetUsername = data?.profile.username;
    if (!currentUser || !targetUsername || currentUser.username === targetUsername) {
      setFriendState("none");
      return;
    }
    let active = true;
    setFriendState("checking");
    void Promise.all([friendsApi.list(), friendsApi.pending(), friendsApi.sent()]).then(([friends, pending, sent]) => {
      if (!active) return;
      const friend = friends.find((item) => item.username.toLowerCase() === targetUsername.toLowerCase());
      const incoming = pending.find((item) => item.username.toLowerCase() === targetUsername.toLowerCase());
      const outgoing = sent.some((item) => item.username.toLowerCase() === targetUsername.toLowerCase());
      setIncomingRequestId(incoming?.id ?? null);
      setFriendState(friend ? "friends" : incoming ? "pending_received" : outgoing ? "pending_sent" : "none");
    }).catch((e) => { if (active) { setFriendState("none"); setFriendError((e as Error).message); } });
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.username, data?.profile.username]);

  if (error) return <main className="mx-auto flex-1 max-w-4xl px-4 py-12"><p role="alert" className="text-error">{error}</p><Link to="/leaderboard" className="mt-4 inline-block text-accent">Voltar ao ranking</Link></main>;
  if (!data) return <main className="flex flex-1 items-center justify-center text-sub">A carregar perfil…</main>;
  const p = data.profile;
  const xpProgress = Math.min(100, Math.max(0, ((p.xp - (p.level - 1) * p.level * 50) / (p.level * 100)) * 100));
  return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
    <header className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-sub/20 bg-surface/50 p-6">
      <div aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-accent/15 font-mono text-2xl text-accent">{p.username.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0 flex-1"><h1 className="font-mono text-2xl text-text">{p.username}</h1><p className="mt-1 text-xs text-sub">Membro desde {new Date(p.created_at).toLocaleDateString("pt-PT", { dateStyle: "medium" })}</p></div>
      {currentUser && currentUser.username !== p.username && <button type="button" disabled={friendState === "checking" || friendState === "friends" || friendState === "pending_sent"} onClick={() => { setFriendError(""); if (friendState === "pending_received" && incomingRequestId) void friendsApi.accept(incomingRequestId).then(() => { setIncomingRequestId(null); setFriendState("friends"); }).catch((e) => setFriendError((e as Error).message)); else void friendsApi.request(p.username).then(() => setFriendState("pending_sent")).catch((e) => setFriendError((e as Error).message)); }} className="rounded-lg border border-accent/40 px-4 py-2 font-mono text-xs text-accent disabled:cursor-default disabled:opacity-60">{friendState === "checking" ? "A verificar..." : friendState === "friends" ? "Já são amigos" : friendState === "pending_sent" ? "Pedido enviado" : friendState === "pending_received" ? "Aceitar pedido" : "Adicionar amigo"}</button>}
    </header>
    {friendError && <p role="alert" className="mb-4 text-sm text-error">{friendError}</p>}
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="ELO" value={p.elo} /><Stat label="Nível" value={p.level} /><Stat label="Partidas" value={p.matches_played} /><Stat label="Vitórias" value={`${p.matches_won} · ${p.win_rate}%`} />
      <Stat label="Melhor WPM" value={p.best_wpm} /><Stat label="WPM médio" value={p.avg_wpm} /><Stat label="Testes solo" value={p.total_races} /><Stat label="XP" value={p.xp} />
    </section>
    <div className="mb-8 rounded-lg border border-sub/15 bg-surface/40 p-4"><div className="mb-2 flex justify-between font-mono text-xs text-sub"><span>Progresso do nível {p.level}</span><span>{Math.round(xpProgress)}%</span></div><div className="h-2 overflow-hidden rounded bg-bg"><div className="h-full bg-accent" style={{ width: `${xpProgress}%` }} /></div></div>
    <section className="mb-8 rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-4 font-mono text-lg text-text">Conquistas ({data.achievements.length})</h2>{data.achievements.length ? <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{data.achievements.map((a) => <article key={a.code} className="rounded-lg border border-accent/30 bg-accent/5 p-3"><h3 className="font-mono text-sm text-accent">{a.label}</h3><p className="mt-1 text-xs text-sub">{a.description}</p></article>)}</div> : <p className="text-sm text-sub">Ainda sem conquistas desbloqueadas.</p>}</section>
    <section className="rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-4 font-mono text-lg text-text">Partidas recentes</h2>{data.matches.length ? <div className="divide-y divide-sub/10">{data.matches.map((m) => { const own = m.participants.find((part) => part.username === p.username); return <div key={m.id} className="grid gap-2 py-3 text-sm sm:grid-cols-4"><span className="text-sub">{m.finished_at ? new Date(m.finished_at).toLocaleDateString("pt-PT") : "Em curso"}</span><span>{own?.left_race ? "Desistiu" : own?.position ? `#${own.position}` : "Sem posição"}</span><span>{own?.wpm ?? 0} WPM · {own?.accuracy ?? 0}%</span><span className="text-sub">{m.player_count} jogadores</span></div>; })}</div> : <p className="text-sm text-sub">Sem partidas registadas.</p>}</section>
    <Link to="/leaderboard" className="mt-6 inline-block font-mono text-sm text-accent hover:underline">← Voltar ao ranking</Link>
  </main>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg border border-sub/15 bg-surface/40 p-4"><p className="font-mono text-xs text-sub">{label}</p><p className="mt-1 font-mono text-xl text-accent">{value}</p></div>; }
