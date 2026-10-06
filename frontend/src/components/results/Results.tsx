import type { TypingStats } from "../../types";

export function Results({
  stats,
  onRestart,
}: {
  stats: TypingStats;
  onRestart: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <Stat label="wpm" value={stats.wpm} accent />
        <Stat label="precisão" value={`${stats.accuracy}%`} accent />
        <Stat label="raw" value={stats.raw} />
        <Stat label="consistência" value={`${stats.consistency}%`} />
      </div>
      <div className="flex justify-center gap-4">
        <button
          onClick={onRestart}
          className="px-6 py-2 rounded bg-surface hover:bg-opacity-80 text-accent font-mono"
        >
          Reiniciar (Tab)
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-sub text-sm lowercase">{label}</div>
      <div
        className={`text-4xl font-mono ${
          accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}