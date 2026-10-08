import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { useMultiplayer } from "../store/multiplayer";
import { apiPost } from "../lib/api";
import { RaceView } from "../components/multiplayer/RaceView";

export function Multiplayer() {
  const { user } = useAuth();
  const {
    roomId,
    players,
    status,
    countdown,
    error,
    myId,
    hostId,
    connect,
    disconnect,
    setReady,
  } = useMultiplayer();

  const [searching, setSearching] = useState(false);

  const isHost = myId === hostId;

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      useMultiplayer.getState().disconnect();
    };
  }, []);

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
    try {
      const res = await apiPost<{ room_id: string }>("/multiplayer/matchmake");
      await connect(res.room_id, user.username);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleLeave = () => {
    disconnect();
  };

  const me = players.find((p) => p.id === myId);
  const canReady = status === "waiting" && me && !me.ready;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      <h1 className="text-3xl font-mono text-accent mb-8">multiplayer</h1>

      {error && (
        <p className="text-error font-mono text-sm mb-4">{error}</p>
      )}

      {!roomId && (
        <div className="text-center py-20">
          <button
            onClick={handleMatchmake}
            disabled={searching}
            className="px-8 py-4 bg-accent text-bg font-mono rounded disabled:opacity-50"
          >
            {searching ? "a procurar..." : "procurar corrida"}
          </button>
          <p className="text-sub font-mono text-xs mt-4">
            até 4 jogadores por sala
          </p>
        </div>
      )}

      {roomId && (
        <>
          <div className="bg-surface/50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sub text-xs font-mono">sala</p>
                <p className="text-accent font-mono text-xl">{roomId}</p>
              </div>
              <div className="text-right">
                <p className="text-sub text-xs font-mono">estado</p>
                <p className="text-text font-mono">{status}</p>
              </div>
            </div>

            <div className="space-y-2">
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
                    {p.finished
                      ? `✔ ${Math.round(p.wpm)} wpm`
                      : `${Math.round(p.wpm)} wpm`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Countdown */}
          {countdown !== null && (
            <div className="text-center py-10">
              <p className="text-accent font-mono text-8xl">{countdown}</p>
            </div>
          )}

          {/* Corrida */}
          {status === "racing" && <RaceView />}


          {/* Resultados */}
          {status === "finished" && (
            <div className="bg-surface/50 rounded-lg p-6 mt-6">
              <h2 className="text-accent font-mono text-lg mb-4">
                resultados
              </h2>
              <div className="space-y-2">
                {players.map((p, i) => (
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
                      <span className="text-accent">
                        {Math.round(p.wpm)} wpm
                      </span>
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