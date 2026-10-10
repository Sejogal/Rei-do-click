import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useFriends } from "../store/friends";
import { useMultiplayer } from "../store/multiplayer";
import { useAuth } from "../store/auth";
import { friendsApi, type FriendSearchResult } from "../lib/api";

export function Friends() {
  const user = useAuth((s) => s.user);
  const { friends, pending, sent, refresh, request, accept, reject, remove, inviteToRoom } = useFriends();
  const roomId = useMultiplayer((s) => s.roomId);
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { if (user) { void refresh().catch((e) => setError((e as Error).message)); const id = window.setInterval(() => void refresh().catch(() => {}), 20000); return () => window.clearInterval(id); } }, [user?.id, refresh]);
  useEffect(() => {
    const query = username.trim();
    if (query.length < 2) { setSearchResults([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void friendsApi.search(query).then((results) => { if (active) setSearchResults(results); })
        .catch((e) => { if (active) setError((e as Error).message); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [username]);
  const action = async (work: () => Promise<unknown>, message = "") => { setError(""); setNotice(""); try { await work(); setNotice(message); } catch (e) { setError((e as Error).message); } };
  const chooseSearchResult = async (result: FriendSearchResult) => {
    await action(async () => {
      if (result.relationship === "none") await request(result.username);
      else if (result.relationship === "pending_received" && result.friendship_id) await accept(result.friendship_id);
      await refresh();
      setSearchResults(await friendsApi.search(username.trim()));
    }, result.relationship === "pending_received" ? "Pedido aceite." : "Pedido de amizade enviado.");
  };
  if (!user) return <main className="flex-1 p-12 text-center text-sub">Inicia sessão para gerir os teus amigos. <Link className="text-accent" to="/auth">Entrar</Link></main>;
  return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10"><header className="mb-7"><p className="font-mono text-xs uppercase tracking-widest text-sub">Comunidade</p><h1 className="mt-2 font-mono text-3xl text-accent">Amigos</h1><p className="mt-2 text-sm text-sub">Adiciona jogadores, acompanha quem está online e convida para a tua sala.</p></header>
    {error && <p role="alert" className="mb-4 text-sm text-error">{error}</p>}{notice && <p role="status" className="mb-4 text-sm text-accent">{notice}</p>}
    <section className="mb-6 rounded-xl border border-sub/20 bg-surface/50 p-5"><label htmlFor="friend-search" className="mb-2 block font-mono text-sm">Procurar jogadores</label><input id="friend-search" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Escreve pelo menos 2 letras do nome" autoComplete="off" className="w-full rounded-lg border border-sub/20 bg-bg px-3 py-2 text-sm text-text"/>{username.trim().length > 0 && username.trim().length < 2 && <p className="mt-2 text-xs text-sub">Escreve mais uma letra para procurar.</p>}{searching && <p className="mt-3 text-xs text-sub">A procurar...</p>}{username.trim().length >= 2 && !searching && searchResults.length === 0 && <p className="mt-3 text-xs text-sub">Não foram encontrados jogadores.</p>}<div className="mt-3 grid gap-2">{searchResults.map((result) => <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sub/10 bg-bg/60 px-3 py-2"><Link to={`/u/${encodeURIComponent(result.username)}`} className="font-mono text-sm text-text hover:text-accent">{result.username}</Link><button type="button" disabled={result.relationship === "friends" || result.relationship === "pending_sent"} onClick={() => void chooseSearchResult(result)} className="rounded border border-accent/30 px-3 py-1.5 font-mono text-xs text-accent disabled:cursor-default disabled:opacity-60">{result.relationship === "friends" ? "Já são amigos" : result.relationship === "pending_sent" ? "Pedido enviado" : result.relationship === "pending_received" ? "Aceitar pedido" : "Adicionar"}</button></div>)}</div></section>
    <section className="mb-6 rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-3 font-mono text-lg">Pedidos recebidos <span className="text-xs text-sub">{pending.length}</span></h2>{pending.length ? pending.map((item) => <div key={item.id} className="flex items-center justify-between border-t border-sub/10 py-3"><Link to={`/u/${encodeURIComponent(item.username)}`} className="text-accent">{item.username}</Link><div className="flex gap-2"><button onClick={() => void action(() => accept(item.id), "Amizade aceite.")} className="rounded bg-accent px-3 py-1.5 font-mono text-xs text-bg">Aceitar</button><button onClick={() => void action(() => reject(item.id))} className="rounded border border-sub/20 px-3 py-1.5 font-mono text-xs text-sub">Rejeitar</button></div></div>) : <p className="text-sm text-sub">Sem pedidos pendentes.</p>}</section>
    <section className="mb-6 rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-3 font-mono text-lg">Amigos <span className="text-xs text-sub">{friends.length}</span></h2>{friends.length ? friends.map((friend) => <div key={friend.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-sub/10 py-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${friend.is_online ? "bg-green-400" : "bg-sub/40"}`} /><Link to={`/u/${encodeURIComponent(friend.username)}`} className="font-mono text-sm text-text hover:text-accent">{friend.username}</Link><span className="text-xs text-sub">{friend.is_online ? "online" : "offline"}</span></div><div className="flex gap-2">{roomId && <button onClick={() => void action(() => inviteToRoom(friend.id, roomId), "Convite enviado.")} className="rounded border border-accent/30 px-3 py-1.5 font-mono text-xs text-accent">Convidar para sala</button>}<button onClick={() => void action(() => remove(friend.friendship_id ?? friend.id))} className="rounded border border-sub/20 px-3 py-1.5 font-mono text-xs text-sub">Remover</button></div></div>) : <p className="text-sm text-sub">Ainda não tens amigos. Procura alguém pelo nome de utilizador.</p>}</section>
    {sent.length > 0 && <section className="rounded-xl border border-sub/20 bg-surface/50 p-5"><h2 className="mb-3 font-mono text-lg">Pedidos enviados</h2>{sent.map((item) => <div key={item.id} className="border-t border-sub/10 py-2 text-sm text-sub">{item.username} · pendente</div>)}</section>}
  </main>;
}
