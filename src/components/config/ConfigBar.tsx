import { useConfig } from "../../store/config";
import type { TestMode } from "../../types";

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

export function ConfigBar() {
  const { config, update } = useConfig();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-10 font-mono text-sm bg-surface/50 rounded-lg px-4 py-2">
      {/* Modo: tempo / palavras */}
      <div className="flex gap-1">
        {(["time", "words"] as TestMode[]).map((m) => (
          <Btn
            key={m}
            active={config.mode === m}
            onClick={() => update({ mode: m })}
          >
            {m === "time" ? "tempo" : "palavras"}
          </Btn>
        ))}
      </div>

      <Divider />

      {/* Valores conforme modo */}
      {config.mode === "time"
        ? TIME_OPTIONS.map((t) => (
            <Btn
              key={t}
              active={config.time === t}
              onClick={() => update({ time: t })}
            >
              {t}
            </Btn>
          ))
        : WORD_OPTIONS.map((w) => (
            <Btn
              key={w}
              active={config.wordCount === w}
              onClick={() => update({ wordCount: w })}
            >
              {w}
            </Btn>
          ))}

      <Divider />

      {/* Toggles */}
      <Btn
        active={config.punctuation}
        onClick={() => update({ punctuation: !config.punctuation })}
      >
        pontuação
      </Btn>
      <Btn
        active={config.numbers}
        onClick={() => update({ numbers: !config.numbers })}
      >
        números
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded transition ${
        active ? "text-accent" : "text-sub hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-sub/30 mx-1" />;
}