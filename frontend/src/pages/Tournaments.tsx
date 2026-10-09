import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, tournamentsApi, type TournamentSummary } from "../lib/api";
import { useAuth } from "../store/auth";

export function Tournaments() {
  const { user } = useAuth();
  const canOrganize = user && ["pro", "team"].includes(user.plan.trim().toLowerCase());
  const [rows, setRows] = useState<TournamentSummary[]>([]);
  const [name, setName] = useState("");
  const [size, setSize] = useState<8 | 16>(8);
  const [error, setError] = useState("");
  const load = () => tournamentsApi.list().then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void authApi.me().then((fresh) => { if (active) useAuth.setState({ user: fresh }); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);
  const create = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await tournamentsApi.create(name, size); setName(""); await load(); } catch (e) { setError((e as Error).message); } };
  return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10"><header className="mb-7"><p className="font-mono text-xs uppercase tracking-widest text-sub">Competição</p><h1 className="mt-2 font-mono text-3xl text-accent">Torneios</h1><p className="mt-2 text-sm text-sub">Chaves de eliminação direta para 8 ou 16 jogadores.</p></header>
    {error && <p role="alert" className="mb-4 text-sm text-error">{error}</p>}
    {canOrganize ? <form onSubmit={(e) => void create(e)} className="mb-7 grid gap-3 rounded-xl border border-sub/20 bg-surface/50 p-5 sm:grid-cols-[1fr_auto_auto]"><input value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={100} required placeholder="Nome do torneio" className="rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text"/><select value={size} onChange={(e) => setSize(Number(e.target.value) as 8 | 16)} className="rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text"><option value={8}>8 jogadores</option><option value={16}>16 jogadores</option></select><button className="rounded-lg bg-accent px-4 py-2 font-mono text-xs text-bg">Criar torneio</button></form> : !user ? <p className="mb-7 text-sm text-sub">Inicia sessão para criar ou entrar num torneio.</p> : null}
    <div className="grid gap-3">{rows.map((item) => <Link key={item.id} to={`/tournaments/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sub/20 bg-surface/50 p-4 hover:border-accent/40"><div><h2 className="font-mono text-lg text-text">{item.name}</h2><p className="mt-1 text-xs text-sub">{item.participants_count}/{item.max_players} jogadores · {new Date(item.created_at).toLocaleDateString("pt-PT")}</p></div><span className="rounded-full border border-accent/30 px-3 py-1 font-mono text-xs text-accent">{item.status === "registration" ? "Inscrições" : item.status === "in_progress" ? "Em curso" : "Terminado"}</span></Link>)}{rows.length === 0 && <p className="rounded-xl border border-sub/20 p-8 text-center text-sm text-sub">Ainda não há torneios. Cria o primeiro.</p>}</div>
  </main>;
}
