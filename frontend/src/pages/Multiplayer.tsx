import { useEffect, useRef, useState } from "react";
import { useAuth } from "../store/auth";
import { useMultiplayer } from "../store/multiplayer";
import { apiGet, apiPost, authApi } from "../lib/api";
import { RaceView } from "../components/multiplayer/RaceView";
import { Chat } from "../components/multiplayer/Chat";

interface AvailableRoom {
  room_id: string;
  players_count: number;
  max_players: number;
  game_mode: "race" | "elimination" | "survival" | "blind" | "relay";
}

export function Multiplayer() {
  const { user } = useAuth();
  const {
    roomId,
    players,
    maxPlayers,
    status,
    countdown,
    error,
    myId,
    hostId,
    connect,
    disconnect,
    setReady,
    gameMode,
    setGameMode,
    setMaxPlayers,
    eliminated,
    eliminationNotice,
    teamRanking,
  } = useMultiplayer();

  const [searching, setSearching] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[] | null>(null);
  const [lobbyTab, setLobbyTab] = useState<"play" | "rooms">("play");
  const [localMax, setLocalMax] = useState(maxPlayers);
  const attemptedInvite = useRef<string | null>(null);

  const isHost = myId === hostId;
  const planMax = user && ["pro", "team"].includes(user.plan.trim().toLowerCase()) ? 20 : 4;

  useEffect(() => {
    if (!user) return;
    let active = true;
    void authApi.me().then((fresh) => { if (active) useAuth.setState({ user: fresh }); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    setLocalMax(maxPlayers);
  }, [maxPlayers]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      useMultiplayer.getState().disconnect();
    };
  }, []);

  useEffect(() => {
    if (!user || roomId) return;
    const inviteCode = new URLSearchParams(window.location.search)
      .get("room")
      ?.trim()
      .toUpperCase();
    if (!inviteCode || attemptedInvite.current === inviteCode) return;
    const timeout = window.setTimeout(() => {
      attemptedInvite.current = inviteCode;
      void connect(inviteCode, user.username);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [user, roomId, connect]);

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-mono text-accent mb-2">multiplayer</h1>
          <p className="text-sub font-mono text-sm">
            Faz login para jogar.
          </p>
        </div>
      </main>
    );
  }

  const handleMatchmake = async () => {
    setSearching(true);
    setActionError("");
    try {
      const rooms = await apiGet<AvailableRoom[]>("/multiplayer/rooms");
      setAvailableRooms(rooms);
      setLobbyTab("rooms");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível procurar uma sala.");
    } finally {
      setSearching(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setSearching(true);
    setActionError("");
    try {
      await connect(roomId, user.username);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível entrar na sala.");
      setAvailableRooms(null);
    } finally {
      setSearching(false);
    }
  };

  const handleCreatePrivate = async () => {
    setSearching(true);
    setActionError("");
    try {
      const res = await apiPost<{ room_id: string }>("/multiplayer/create-private");
      await connect(res.room_id, user.username);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível criar a sala.");
    } finally {
      setSearching(false);
    }
  };

  const handleCreatePublic = async () => {
    setSearching(true);
    setActionError("");
    try {
      const res = await apiPost<{ room_id: string }>("/multiplayer/create-public");
      await connect(res.room_id, user.username);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível criar a sala pública.");
    } finally {
      setSearching(false);
    }
  };

  const handleJoinCode = async () => {
    if (joinCode.length < 4) return;
    setSearching(true);
    setActionError("");
    try {
      await connect(joinCode, user.username);
    } finally {
      setSearching(false);
    }
  };

  const handleCopyLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}/multiplayer?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia o link da sala:", url);
    }
  };

  const handleLeave = () => {
    disconnect();
  };

  const me = players.find((p) => p.id === myId);
  const canReady = status === "waiting" && me && !me.ready;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-mono text-accent">multiplayer</h1>
        <p className="mt-2 text-sm text-sub">Encontra uma sala, cria a tua ou entra com um código.</p>
      </div>
      {eliminationNotice && <div role="status" className="fixed right-4 top-20 z-50 rounded-lg border border-error bg-surface p-4 text-error font-mono animate-[slideIn_0.25s_ease-out]">☠ {eliminationNotice}</div>}

      {error && (
        <p className="text-error font-mono text-sm mb-4">{error}</p>
      )}
      {actionError && (
        <p className="text-error font-mono text-sm mb-4">{actionError}</p>
      )}

      {!roomId && (
        <>
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-1 rounded-xl border border-sub/20 bg-surface/50 p-1" role="tablist" aria-label="Lobby multiplayer">
          <button type="button" role="tab" aria-selected={lobbyTab === "play"} onClick={() => setLobbyTab("play")}
            className={`rounded-lg px-4 py-3 font-mono text-sm transition-colors ${lobbyTab === "play" ? "bg-accent text-bg" : "text-sub hover:text-text"}`}>
            Jogar
          </button>
          <button type="button" role="tab" aria-selected={lobbyTab === "rooms"}
            onClick={() => availableRooms === null ? void handleMatchmake() : setLobbyTab("rooms")}
            className={`rounded-lg px-4 py-3 font-mono text-sm transition-colors ${lobbyTab === "rooms" ? "bg-accent text-bg" : "text-sub hover:text-text"}`}>
            Salas abertas{availableRooms?.length ? ` · ${availableRooms.length}` : ""}
          </button>
        </div>
        <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-sub/20 bg-surface/30 p-5 md:p-7 animate-[fadeIn_0.3s_ease-out]">
          {lobbyTab === "play" && <>
          <div className="mb-5">
            <h2 className="font-mono text-xl text-text">Como queres jogar?</h2>
            <p className="mt-1 text-sm text-sub">Encontra jogadores ou prepara uma sala para os teus amigos.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-accent/30 bg-bg/50 p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">Público</span>
            <h3 className="mt-2 font-mono text-lg text-text">Encontrar jogadores</h3>
            <p className="mt-2 min-h-10 text-sm text-sub">Vê as salas abertas e escolhe quando queres entrar.</p>
          <button
            onClick={handleMatchmake}
            disabled={searching}
            className="mt-5 w-full rounded-lg bg-accent px-4 py-3 font-mono text-sm text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {searching ? "a procurar..." : "procurar partida"}
          </button>
          <button
            onClick={handleCreatePublic}
            disabled={searching}
            className="mt-2 w-full rounded-lg border border-sub/30 px-4 py-2.5 font-mono text-xs text-text hover:border-accent/60 hover:text-accent disabled:opacity-50"
          >
            criar sala pública
          </button>
          </section>
          <section className="rounded-xl border border-sub/20 bg-bg/50 p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-sub">Privado</span>
            <h3 className="mt-2 font-mono text-lg text-text">Jogar com amigos</h3>
            <p className="mt-2 min-h-10 text-sm text-sub">Cria uma sala privada ou entra com um código.</p>
          <button
            onClick={handleCreatePrivate}
            disabled={searching}
            className="mt-5 w-full rounded-lg border border-sub/30 px-4 py-3 font-mono text-sm text-text hover:border-accent/60 hover:text-accent disabled:opacity-50"
          >
            criar sala privada
          </button>
          <form onSubmit={(event) => { event.preventDefault(); void handleJoinCode(); }} className="mt-3 flex gap-2 rounded-lg border border-sub/20 bg-surface/40 p-2">
            <input
              aria-label="Código da sala"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="código da sala"
              className="min-w-0 flex-1 bg-transparent px-2 font-mono text-sm text-text uppercase outline-none placeholder:text-sub"
            />
            <button
              type="submit"
              disabled={searching || joinCode.length < 4}
              className="rounded-lg bg-surface px-5 py-2 font-mono text-sm text-text hover:text-accent disabled:opacity-40"
            >
              entrar
            </button>
          </form>
          </section>
          </div>
          </>}
          {lobbyTab === "rooms" && availableRooms !== null && (
            <section aria-live="polite" role="tabpanel" className="animate-[fadeIn_0.3s_ease-out]">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Lobby público</p>
                  <h2 className="mt-1 font-mono text-xl text-text">Salas abertas</h2>
                  <p className="mt-1 text-sm text-sub">Escolhe uma sala para entrar na partida.</p>
                </div>
                <button type="button" onClick={() => void handleMatchmake()} disabled={searching}
                  className="rounded-lg border border-sub/30 px-4 py-2 font-mono text-xs text-text transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50">
                  {searching ? "a atualizar..." : "Atualizar lista"}
                </button>
              </div>
              {availableRooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-sub/30 bg-bg/40 px-5 py-10 text-center">
                  <div aria-hidden="true" className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface font-mono text-xl text-sub">...</div>
                  <p className="font-mono text-sm text-text">Nenhuma sala pública disponível</p>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-sub">Podes atualizar a lista daqui a pouco ou criar uma sala e esperar que outros jogadores entrem.</p>
                  <button type="button" onClick={() => void handleCreatePublic()} disabled={searching}
                    className="mt-5 rounded-lg bg-accent px-5 py-2.5 font-mono text-xs text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
                    Criar sala pública
                  </button>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {availableRooms.map((room) => {
                    const occupancy = room.max_players > 0 ? Math.min(100, (room.players_count / room.max_players) * 100) : 0;
                    return (
                      <li key={room.room_id} className="rounded-xl border border-sub/20 bg-bg/50 p-4 transition-colors hover:border-accent/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] uppercase tracking-wider text-sub">Código da sala</p>
                            <p className="mt-1 truncate font-mono text-lg tracking-wider text-accent">{room.room_id}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-sub/25 bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-text">
                            {({ race: "Corrida", elimination: "Eliminacao", survival: "Sobrevivencia", blind: "As cegas", relay: "Revezamento" } as Record<string, string>)[room.game_mode]}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between font-mono text-xs">
                            <span className="text-sub">Jogadores</span>
                            <span className="text-text">{room.players_count} <span className="text-sub">/ {room.max_players}</span></span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label="Ocupação da sala" aria-valuemin={0} aria-valuemax={room.max_players} aria-valuenow={room.players_count}>
                            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${occupancy}%` }} />
                          </div>
                        </div>
                        <button type="button" onClick={() => void handleJoinRoom(room.room_id)}
                          disabled={searching || room.players_count >= room.max_players}
                          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 font-mono text-xs text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                          {searching ? "a entrar..." : room.players_count >= room.max_players ? "Sala cheia" : "Entrar na sala"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
        </>
      )}
      {roomId && (
        <>
          <div className="bg-surface/50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sub text-xs font-mono">sala</p>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-accent font-mono text-xl">{roomId}</p>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${planMax > 4 ? "border-accent/40 text-accent" : "border-sub/30 text-sub"}`}>
                    {planMax > 4 ? "pro" : "free"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="text-sub hover:text-accent font-mono text-xs"
                  >
                    {copied ? "copiado!" : "copiar link"}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sub text-xs font-mono">{players.length}/{maxPlayers} jogadores</p>
                <p key={status} className="text-text font-mono animate-[fadeIn_0.3s_ease-out]">{status}</p>
              </div>
            </div>

            {isHost && status === "waiting" && (
              <div className="mb-4 rounded-lg border border-sub/20 bg-bg/40 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="room-player-limit" className="font-mono text-xs text-sub">Limite de jogadores</label>
                  <span className="font-mono text-sm text-accent">{localMax} <span className="text-sub">/ {planMax}</span></span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    aria-label="Reduzir limite de jogadores"
                    disabled={localMax <= 2}
                    onClick={() => {
                      const next = Math.max(2, localMax - 1);
                      setLocalMax(next);
                      setMaxPlayers(next);
                    }}
                    className="flex size-10 items-center justify-center rounded-lg border border-sub/30 font-mono text-xl text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="min-w-24 text-center font-mono text-xs text-sub">{players.length} na sala · limite {localMax}</span>
                  <button
                    type="button"
                    aria-label="Aumentar limite de jogadores"
                    disabled={localMax >= planMax}
                    onClick={() => {
                      const next = Math.min(planMax, localMax + 1);
                      setLocalMax(next);
                      setMaxPlayers(next);
                    }}
                    className="flex size-10 items-center justify-center rounded-lg border border-sub/30 font-mono text-xl text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
                <p className="mt-2 text-center font-mono text-[10px] text-sub">Plano {planMax > 4 ? "Pro" : "Free"}: até {planMax} jogadores</p>
              </div>
            )}
            {!isHost && <p className="mb-4 font-mono text-xs text-sub">Esta sala tem limite de {maxPlayers} jogadores, definido pelo anfitrião. O teu plano permite criar salas até {planMax}.</p>}

            {isHost && status === "waiting" && players.length >= 2 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-sm">
                <span className="text-sub">modo:</span>
                {(["race", "elimination", "survival", "blind", "relay"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setGameMode(mode)}
                    className={`rounded px-3 py-1 ${gameMode === mode ? "bg-accent text-bg" : "bg-bg text-text hover:text-accent"}`}>
                    {({ race: "Corrida", elimination: "Eliminacao", survival: "Sobrevivencia", blind: "As cegas", relay: "Revezamento" } as Record<string, string>)[mode]}
                  </button>
                ))}
                <p className="w-full text-xs text-sub">{{ race: "Vence quem terminar primeiro.", elimination: "O último é eliminado por etapas.", survival: "Texto maior com pontuação e números.", blind: "O texto desaparece após 10 segundos.", relay: "Equipas de dois revezam em segmentos." }[gameMode]}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-bg/40 rounded px-4 py-2 font-mono text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-text">
                      {p.username}
                      {p.id === myId && (
                        <span className="text-sub text-xs ml-2">(tu)</span>
                      )}
                    </span>
                    {p.ready && (
                      <span className="text-accent text-xs">ready</span>
                    )}
                  </div>
                  <span className="text-accent">
                    {eliminated.includes(p.id)
                      ? "☠ eliminado"
                      : p.finished ? `✔ ${Math.round(p.wpm)} wpm`
                      : `${Math.round(p.wpm)} wpm`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div key={`chat-${status}`} className="animate-[fadeIn_0.3s_ease-out]"><Chat /></div>

          {/* Countdown */}
          {countdown !== null && (
            <div className="text-center py-10">
              <p key={countdown} className="text-accent font-mono text-8xl animate-[pop_0.4s_ease-out]">{countdown}</p>
            </div>
          )}

          {/* Corrida */}
          {status === "racing" && <div className="animate-[fadeIn_0.3s_ease-out]">
            {gameMode === "elimination" && <p className="mb-4 rounded bg-surface/70 px-4 py-2 text-center font-mono text-sm text-accent">MODO ELIMINAÇÃO · intervalo: 10 palavras</p>}
            <RaceView />
            <div className="mt-5 flex justify-center">
              <button type="button" onClick={handleLeave}
                className="rounded border border-error/50 px-5 py-2 font-mono text-sm text-error hover:bg-error/10">
                desistir da partida
              </button>
            </div>
          </div>}


          {/* Resultados */}
          {status === "finished" && (
            <div className="bg-surface/50 rounded-lg p-6 mt-6 animate-[fadeIn_0.3s_ease-out]">
              <h2 className="text-accent font-mono text-lg mb-4">
                {gameMode === "elimination" ? "sobrevivente · eliminados" : "resultados"}
              </h2>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {gameMode === "relay" ? teamRanking.map((team) => <div key={team.team_id} className="flex items-center justify-between rounded bg-bg/40 px-4 py-3 font-mono"><span><strong className="mr-3 text-accent">{team.position}.</strong>{team.players.join(" + ")}</span><span className="text-accent">{Math.round(team.average_wpm)} wpm médio</span></div>) : players.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-bg/40 rounded px-4 py-3 font-mono"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-accent text-xl w-6">{i + 1}</span>
                      <span
                        className={
                          p.id === myId ? "text-accent" : "text-text"
                        }
                      >
                        {p.username}
                        {p.id === myId && " (tu)"}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      {gameMode === "elimination" && <span className={eliminated.includes(p.id) ? "text-error" : "text-accent"}>{eliminated.includes(p.id) ? "eliminado" : i === 0 ? "sobrevivente" : "classificado"}</span>}
                      <span className="text-accent">{Math.round(p.wpm)} wpm</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-center gap-3">
                {isHost && (
                  <button
                    onClick={() =>
                      useMultiplayer.getState().requestRematch()
                    }
                    className="px-6 py-2 bg-accent text-bg font-mono rounded"
                  >
                    jogar outra vez
                  </button>
                )}
                <button
                  onClick={handleLeave}
                  className="px-6 py-2 bg-surface text-sub hover:text-error font-mono rounded"
                >
                  sair
                </button>
              </div>
            </div>
          )}

          {/* Ações enquanto espera */}
          {status === "waiting" && (
            <div className="flex gap-4 justify-center">
              {canReady && (
                <button
                  onClick={setReady}
                  className="px-6 py-3 bg-accent text-bg font-mono rounded"
                >
                  estou pronto
                </button>
              )}
              <button
                onClick={handleLeave}
                className="px-6 py-3 bg-surface text-sub hover:text-error font-mono rounded"
              >
                sair
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
