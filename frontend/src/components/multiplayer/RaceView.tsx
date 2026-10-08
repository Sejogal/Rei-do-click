import { useCallback, useMemo } from "react";
import { useMultiplayer } from "../../store/multiplayer";
import { useRaceEngine } from "../../hooks/useRaceEngine";
import { Word } from "../typing/Word";

const RACE_WORDS = 30;

export function RaceView() {
  const {
    raceText,
    status,
    players,
    myId,
    sendProgress,
    sendFinished,
  } = useMultiplayer();

  const enabled = status === "racing" && !!raceText;

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
    text: raceText,
    enabled,
    onProgress: handleProgress,
    onFinish: handleFinish,
  });

  // Ordena jogadores por progresso (para as barras)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      const aProg = a.word * 1000 + a.char;
      const bProg = b.word * 1000 + b.char;
      return bProg - aProg;
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
        {sortedPlayers.map((p) => {
          const progress = p.finished
            ? 100
            : Math.min(100, ((p.word + p.char / 10) / RACE_WORDS) * 100);
          return (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className={p.id === myId ? "text-accent" : "text-text"}>
                  {p.username}
                  {p.id === myId && " (tu)"}
                  {p.finished && " ✔"}
                </span>
                <span className="text-sub">
                  {p.finished ? `${Math.round(p.wpm)} wpm` : `${Math.round(progress)}%`}
                </span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    p.id === myId ? "bg-accent" : "bg-sub"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Texto a digitar */}
      <div className="bg-surface/50 rounded-lg p-6">
        <div className="flex flex-wrap gap-x-3 gap-y-3 text-lg md:text-xl font-mono leading-relaxed select-none">
          {words.map((w, i) => (
            <Word
              key={i}
              data={w}
              activeChar={i === currentWord ? currentChar : null}
              isPast={i < currentWord}
              setActiveRef={() => {}}
            />
          ))}
        </div>
      </div>

      {finished && (
        <p className="text-center text-accent font-mono text-sm">
          terminaste! à espera dos outros...
        </p>
      )}
    </div>
  );
}