import { useState } from "react";
import { useConfig } from "../../store/config";
import type { TextSource } from "../../types";
import { useIsMobile } from "../../hooks/useIsMobile";
import { CustomModal } from "./CustomModal";

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];
const SOURCES: TextSource[] = ["words", "quote", "code", "custom"];

export function ConfigBar() {
  const { config, update } = useConfig();
  const isMobile = useIsMobile();
  const [customOpen, setCustomOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSourceClick = (s: TextSource) => {
    if (s === "custom") {
      setCustomOpen(true);
      return;
    }
    update({ source: s });
  };

  // Conteúdo da barra — reutilizado em desktop e mobile
  const content = (
    <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-sm">
      {/* Source */}
      <div className="flex gap-1">
        {SOURCES.map((s) => (
          <Btn
            key={s}
            active={config.source === s}
            onClick={() => handleSourceClick(s)}
          >
            {s}
          </Btn>
        ))}
      </div>

      <Divider />

      {/* Modo: tempo / palavras */}
      <div className="flex gap-1">
        {(["time", "words"] as const).map((m) => (
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

      {/* Valores */}
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

  return (
    <>
      {isMobile ? (
        <>
          <button
            onClick={() => setMobileOpen(true)}
            className="mb-6 px-4 py-2 rounded bg-surface text-accent font-mono text-sm"
          >
            ⚙ config
          </button>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface rounded-lg p-6 max-w-md w-full">
                {content}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="mt-6 text-accent font-mono text-sm block mx-auto"
                >
                  fechar
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mb-10 bg-surface/50 rounded-lg px-4 py-2">
          {content}
        </div>
      )}

      <CustomModal open={customOpen} onClose={() => setCustomOpen(false)} />
    </>
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