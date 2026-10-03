import { useCallback, useEffect, useRef, useState } from "react";
import { useTypingEngine } from "../../hooks/useTypingEngine";
import { Word } from "./Word";
import { Caret } from "./Caret";
import { Results } from "../results/Results";
import { useConfig } from "../../store/config";

const LINES_VISIBLE = 3;

export function TypingTest() {
    const { words, currentWord, currentChar, started, finished, stats, reset, timeLeft } = useTypingEngine();

    const { config } = useConfig();

    const [activeRef, setActiveRef] = useState<HTMLElement | null>(null);
    const [offsetY, setOffsetY] = useState(0);
    const [focused, setFocused] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const setRef = useCallback((el: HTMLElement | null) => {
        setActiveRef(el);
    }, []);

    // Reset do scroll quando as palavras mudam (novo teste)
    useEffect(() => {
        setOffsetY(0);
    }, [words]);

    // Scroll automático: quando a linha ativa passa da 3ª, sobe
    useEffect(() => {
        if (!activeRef || !containerRef.current) return;

        const rect = activeRef.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const lineHeight = rect.height + 12; // altura do char + gap-y-3
        const linesFromTop = Math.floor(
            (rect.top - containerRect.top + offsetY) / lineHeight
        );

        if (linesFromTop >= LINES_VISIBLE) {
            setOffsetY((prev) => prev + lineHeight);
        }
    }, [activeRef, offsetY]);

    // Foco / desfoco da janela
    useEffect(() => {
        const onBlur = () => setFocused(false);
        const onFocus = () => setFocused(true);
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);
        return () => {
            window.removeEventListener("blur", onBlur);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    // Se clicares no overlay, volta a focar
    const handleRefocus = () => {
        setFocused(true);
        window.focus();
    };

    if (finished && stats) {
        return <Results stats={stats} onRestart={reset} />;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 w-full">
            {/* Timer — só aparece no modo tempo */}
            {config.mode === "time" && started && (
                <div className="text-accent font-mono text-2xl mb-6 text-center">
                    {Math.ceil(timeLeft ?? 0)}s
                </div>
            )}
            <div className="relative">
                {!focused && (
                    <div
                        onClick={handleRefocus}
                        className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-bg/40 cursor-pointer rounded"
                    >
                        <span className="text-sub text-sm">Clica para focar</span>
                    </div>
                )}

                <div
                    className="overflow-hidden"
                    style={{ height: `calc(2.75rem * ${LINES_VISIBLE})` }}
                >
                    <div
                        ref={containerRef}
                        className="relative flex flex-wrap gap-x-3 gap-y-3 text-2xl font-mono leading-relaxed select-none transition-transform duration-200 ease-out"
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
                    Começa a digitar para iniciar · Tab para reiniciar
                </p>
            )}
        </div>
    );
}