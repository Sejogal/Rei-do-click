import { useCallback, useEffect, useRef, useState } from "react";
import { useTypingEngine } from "../../hooks/useTypingEngine";
import { useConfig } from "../../store/config";
import { useIsMobile } from "../../hooks/useIsMobile";
import { Word } from "./Word";
import { Caret } from "./Caret";
import { Results } from "../results/Results";
import { HiddenInput } from "./HiddenInput";

export function TypingTest() {
  const {
    words,
    currentWord,
    currentChar,
    started,
    finished,
    stats,
    reset,
    timeLeft,
    handleInput,
    handleKeyDownInput,
  } = useTypingEngine();

  const { config } = useConfig();
  const isMobile = useIsMobile();
  const linesVisible = isMobile ? 2 : 3;
  const fontSize = isMobile ? "text-lg" : "text-2xl";
  const gap = isMobile ? "gap-x-2 gap-y-2" : "gap-x-3 gap-y-3";
  // Altura de uma linha de texto + o gap vertical do flex-wrap.
  // Deve corresponder ao leading-relaxed e ao gap-y-* usados abaixo.
  const lineHeightRem = isMobile ? 2.33 : 3.19;

  const [activeRef, setActiveRef] = useState<HTMLElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [focused, setFocused] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setRef = useCallback((el: HTMLElement | null) => {
    setActiveRef(el);
  }, []);

  // Repor o scroll apenas quando um novo teste começa.
  useEffect(() => {
    if (currentWord === 0) setOffsetY(0);
  }, [currentWord]);

  // Scroll automático
  useEffect(() => {
    if (!activeRef || !viewportRef.current) return;

    const rect = activeRef.getBoundingClientRect();
    const viewportRect = viewportRef.current.getBoundingClientRect();
    const lineHeight = rect.height + (isMobile ? 8 : 12);
    const linesFromTop = Math.floor(
      (rect.top - viewportRect.top) / lineHeight
    );

    if (linesFromTop >= linesVisible) {
      setOffsetY((prev) => prev + lineHeight);
    }
  }, [activeRef, offsetY, linesVisible, isMobile]);

  // Foco/desfoco — só faz sentido em desktop.
  // Em mobile, o teclado abre/fecha e o blur dispara constantemente.
  useEffect(() => {
    if (isMobile) return;

    const onBlur = () => setFocused(false);
    const onFocus = () => setFocused(true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [isMobile]);

  // Foco automático do input em mobile
  useEffect(() => {
    if (isMobile) {
      // Pequeno delay para o browser permitir o focus
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isMobile]);

  // Clicar em qualquer sítio → foca o input
  const handleClick = () => {
    inputRef.current?.focus();
    setFocused(true);
  };

  if (finished && stats) {
    return <Results stats={stats} onRestart={reset} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 w-full">
      {/* Timer — modo tempo */}
      {config.mode === "time" && started && (
        <div className="text-accent font-mono text-2xl mb-6 text-center">
          {Math.ceil(timeLeft ?? 0)}s
        </div>
      )}

      {/* Contagem — modo palavras */}
      {config.mode === "words" && (
        <div className="text-sub font-mono text-sm mb-6 text-center">
          {Math.min(currentWord + 1, words.length)}
          <span className="text-sub/50"> / </span>
          {words.length}
        </div>
      )}

      <div className="relative" onClick={handleClick}>
        <HiddenInput
          ref={inputRef}
          onInput={handleInput}
          onKeyDown={handleKeyDownInput}
        />

        {!focused && !isMobile && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-bg/40 rounded"
          >
            <span className="text-sub text-sm">Clica para focar</span>
          </div>
        )}

        <div
          ref={viewportRef}
          className="overflow-hidden"
          style={{ height: `calc(${lineHeightRem}rem * ${linesVisible})` }}
        >
          <div
            className={`relative flex flex-wrap ${gap} ${fontSize} font-mono leading-relaxed select-none transition-transform duration-200 ease-out`}
            style={{ transform: `translateY(-${offsetY}px)` }}
          >
            <Caret targetRef={activeRef} />
            {words.map((w, i) => (
              <Word
                key={i}
                data={w}
                activeChar={i === currentWord ? currentChar : null}
                isPast={i < currentWord}
                setActiveRef={setRef}
              />
            ))}
          </div>
        </div>
      </div>

      {!started && (
        <p className="mt-8 text-sub text-sm text-center">
          {isMobile
            ? "Toca no texto para abrir o teclado"
            : "Começa a digitar para iniciar · Tab ou Esc para reiniciar"}
        </p>
      )}
    </div>
  );
}
