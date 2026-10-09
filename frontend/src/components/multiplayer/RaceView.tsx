import { useCallback, useEffect, useMemo, useState } from "react";
import { useMultiplayer } from "../../store/multiplayer";
import { useRaceEngine } from "../../hooks/useRaceEngine";
import { Word } from "../typing/Word";
import { Caret } from "../typing/Caret";


export function RaceView() {
  const {
    raceText,
    status,
    players,
    myId,
    sendProgress,
    sendFinished,
    eliminated,
    gameMode,
    raceStartAt,
  } = useMultiplayer();

  const myPlayer = players.find((player) => player.id === myId);
  const relayStart = gameMode === "relay" ? myPlayer?.relay_start ?? 0 : 0;
  const relayEnd = gameMode === "relay" ? myPlayer?.relay_end ?? 0 : undefined;
  const typedText = useMemo(() => {
    if (!raceText || gameMode !== "relay" || relayEnd === undefined) return raceText;
    return raceText.split(/\s+/).slice(relayStart, relayEnd).join(" ");
  }, [raceText, gameMode, relayStart, relayEnd]);
  const priorTeammate = gameMode === "relay" ? players.find((p) => p.team_id === myPlayer?.team_id && (p.relay_end ?? 0) <= relayStart && p.id !== myId) : undefined;
  const relayActive = gameMode !== "relay" || !priorTeammate || priorTeammate.finished;
  const enabled = status === "racing" && !!typedText && relayActive && !eliminated.includes(myId ?? "");

  const handleProgress = useCallback(
    (word: number, char: number, wpm: number) => {
      sendProgress(word, char, wpm);
    },
    [sendProgress]
  );

  const handleFinish = useCallback(
    (stats: { wpm: number; accuracy: number }) => {
      sendFinished(stats.wpm, stats.accuracy);
    },
    [sendFinished]
  );

  const { words, currentWord, currentChar, finished } = useRaceEngine({
    text: typedText,
    enabled,
    onProgress: handleProgress,
    onFinish: handleFinish,
  });
  const [activeRef, setActiveRef] = useState<HTMLElement | null>(null);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "racing" || gameMode !== "blind") return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [status, gameMode]);

  const blind = gameMode === "blind" && !!raceStartAt && now >= raceStartAt * 1000 + 10_000;

  useEffect(() => {
    if (status !== "racing") setShowAllPlayers(false);
  }, [status]);

  // Ordena jogadores por progresso (para as barras)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aEliminated = eliminated.includes(a.id);
      const bEliminated = eliminated.includes(b.id);
      if (aEliminated && !bEliminated) return 1;
      if (!aEliminated && bEliminated) return -1;
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      const aProg = a.word * 1000 + a.char;
      const bProg = b.word * 1000 + b.char;
      return bProg - aProg;
    });
  }, [players, eliminated]);

  const wordCount = gameMode === "survival" ? 50 : 30;
  const relayTeams = useMemo(() => {
    const groups = new Map<string, typeof players>();
    for (const player of players) if (player.team_id) groups.set(player.team_id, [...(groups.get(player.team_id) ?? []), player]);
    return [...groups.entries()].map(([teamId, members]) => {
      const total = members.reduce((sum, player) => sum + Math.max(1, (player.relay_end ?? 0) - (player.relay_start ?? 0)), 0);
      const completed = members.reduce((sum, player) => {
        const segment = Math.max(1, (player.relay_end ?? 0) - (player.relay_start ?? 0));
        return sum + (player.finished ? segment : Math.min(segment, Math.max(0, player.word - (player.relay_start ?? 0))));
      }, 0);
      return { teamId, members, progress: total ? Math.round(completed / total * 100) : 0 };
    });
  }, [players]);

  if (!raceText) {
    return (
      <div className="text-center py-10">
        <p className="text-sub font-mono text-sm">a preparar corrida...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barras de progresso dos outros jogadores */}
      <div className="bg-surface/50 rounded-lg p-4 space-y-3">
        <p className="text-sub text-xs font-mono mb-2">progresso</p>
        {gameMode === "relay" && <div className="space-y-3">{relayTeams.map((team) => <div key={team.teamId}><div className="mb-1 flex justify-between font-mono text-xs"><span>{team.teamId} · {team.members.map((player) => player.username).join(" + ")}</span><span>{team.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-accent transition-all" style={{ width: `${team.progress}%` }} /></div></div>)}</div>}
        <div className={showAllPlayers ? "max-h-96 space-y-3 overflow-y-auto pr-1" : "space-y-3"}>
        {(gameMode === "relay" ? [] : showAllPlayers ? sortedPlayers : sortedPlayers.slice(0, 6)).map((p) => {
          const isEliminated = eliminated.includes(p.id);
          const playerWord = gameMode === "relay" ? Math.max(0, p.word - (p.relay_start ?? 0)) : p.word;
          const playerWordCount = gameMode === "relay" ? Math.max(1, (p.relay_end ?? 0) - (p.relay_start ?? 0)) : wordCount;
          const progress = p.finished && !isEliminated
            ? 100
            : Math.min(100, ((playerWord + p.char / 10) / playerWordCount) * 100);
          return (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className={p.id === myId ? "text-accent" : "text-text"}>
                  {p.username}
                  {p.id === myId && " (tu)"}
                  {isEliminated ? " ☠" : p.finished && " ✔"}
                </span>
                <span className="text-sub">
                  {isEliminated ? `eliminado em ${p.word} palavras` : p.finished ? `${Math.round(p.wpm)} wpm` : `${Math.round(progress)}%`}
                </span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ease-out ${
                    isEliminated ? "bg-error opacity-60" : p.id === myId ? "bg-accent" : "bg-sub"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
        </div>
        {sortedPlayers.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllPlayers((visible) => !visible)}
            aria-expanded={showAllPlayers}
            className="w-full rounded-md border border-sub/20 px-3 py-2 font-mono text-xs text-sub transition-colors hover:border-accent/40 hover:text-accent"
          >
            {showAllPlayers ? "ver menos" : `ver todos (${sortedPlayers.length})`}
          </button>
        )}
      </div>

      {/* Texto a digitar */}
      <div className="bg-surface/50 rounded-lg p-6 animate-[fadeIn_0.3s_ease-out]">
        {gameMode === "survival" && <p className="mb-4 font-mono text-xs text-accent">Sobrevivência · dificuldade {Math.min(5, Math.floor(currentWord / 10) + 1)}/5</p>}
        {gameMode === "relay" && <p className="mb-4 font-mono text-xs text-accent">Revezamento · {myPlayer?.team_id ?? "equipa"}{!relayActive ? " · à espera do colega" : " · tua vez"}</p>}
        {gameMode === "blind" && blind && <p className="mb-4 rounded bg-accent/10 p-3 text-center font-mono text-xs text-accent">Texto escondido. Continua a digitar de memória.</p>}
        <div className="relative flex flex-wrap gap-x-3 gap-y-3 text-lg md:text-xl font-mono leading-relaxed select-none">
          <Caret targetRef={activeRef} />
          {(blind ? [] : words).map((w, i) => (
            <Word
              key={i}
              data={w}
              activeChar={i === currentWord ? currentChar : null}
              isPast={i < currentWord}
              setActiveRef={setActiveRef}
            />
          ))}
        </div>
      </div>

      {finished && (
        <p className="text-center text-accent font-mono text-sm">
          terminaste! à espera dos outros...
        </p>
      )}
      {myId && eliminated.includes(myId) && (
        <p className="text-center text-error font-mono text-sm animate-[fadeIn_0.3s_ease-out]">
          foste eliminado! a corrida continua para os outros.
        </p>
      )}
    </div>
  );
}
