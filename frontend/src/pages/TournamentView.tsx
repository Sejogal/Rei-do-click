import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { tournamentsApi, type TournamentDetail } from "../lib/api";
import { useAuth } from "../store/auth";
import { Bracket } from "../components/tournament/Bracket";

export function TournamentView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const [item, setItem] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState("");
  const load = () => tournamentsApi.get(id).then(setItem).catch((e) => setError((e as Error).message));
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10000); return () => window.clearInterval(timer); }, [id]);
  const action = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); await load(); } catch (e) { setError((e as Error).message); } };
  const cancelTournament = async () => {
    if (!window.confirm("Cancelar este torneio? Esta ação remove o torneio e as inscrições.")) return;
    setError("");
    try { await tournamentsApi.cancel(id); navigate("/tournaments"); }
    catch (e) { setError((e as Error).message); }
  };
  const removeParticipant = async (participantId: string, username: string) => {
    if (!window.confirm(`Remover ${username} deste torneio?`)) return;
    await action(() => tournamentsApi.removeParticipant(id, participantId));
  };
  if (error && !item) return <main className="flex-1 p-10 text-center text-error">{error}</main>;
  if (!item) return <main className="flex-1 p-10 text-center text-sub">A carregar torneio…</main>;
  const joined = item.participants.some((participant) => participant.user_id === user?.id);
  const isHost = user?.id === item.host_id;
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10"><Link to="/tournaments" className="text-xs text-accent hover:underline">← Torneios</Link><header className="my-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-mono text-3xl text-accent">{item.name}</h1><p className="mt-2 text-sm text-sub">{item.participants.length}/{item.max_players} jogadores · {item.status}</p></div><div className="flex flex-wrap gap-2">{item.status === "registration" && user && !joined && item.participants.length < item.max_players && <button onClick={() => void action(() => tournamentsApi.join(id))} className="rounded-lg bg-accent px-4 py-2 font-mono text-xs text-bg">Inscrever-me</button>}{item.status === "registration" && isHost && item.participants.length === item.max_players && <button onClick={() => void action(() => tournamentsApi.start(id))} className="rounded-lg bg-accent px-4 py-2 font-mono text-xs text-bg">Iniciar torneio</button>}{item.status === "registration" && isHost && <button onClick={() => void cancelTournament()} className="rounded-lg border border-error/50 px-4 py-2 font-mono text-xs text-error hover:bg-error/10">Cancelar torneio</button>}</div></header>
    {error && <p role="alert" className="mb-4 text-sm text-error">{error}</p>}
    <section className="mb-8 rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-3 font-mono text-lg">Participantes</h2>{isHost && item.status === "registration" && <p className="mb-3 text-xs text-sub">Podes remover participantes enquanto as inscrições estiverem abertas.</p>}<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">{item.participants.map((participant) => <div key={participant.id} className="flex items-center justify-between gap-2 rounded bg-bg/60 p-3 text-sm"><Link to={`/u/${encodeURIComponent(participant.username)}`} className="min-w-0 truncate hover:text-accent"><span className="mr-2 text-sub">#{participant.seed}</span>{participant.username}</Link>{isHost && item.status === "registration" && participant.user_id !== item.host_id && <button onClick={() => void removeParticipant(participant.user_id, participant.username)} className="shrink-0 text-xs text-error hover:underline">Remover</button>}</div>)}</div></section>
    {item.matches.length > 0 ? <section className="rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-4 font-mono text-lg">Chave do torneio</h2><Bracket matches={item.matches} /></section> : <p className="rounded-xl border border-sub/20 p-8 text-center text-sm text-sub">A chave será criada quando o organizador iniciar o torneio completo.</p>}
  </main>;
}
