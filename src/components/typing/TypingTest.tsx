import { useTypingEngine } from "../../hooks/useTypingEngine";
import { Word } from "./Word";
import { Results } from "../results/Results";

export function TypingTest() {
  const { words, currentWord, currentChar, started, finished, stats, reset } =
    useTypingEngine();

  if (finished && stats) {
    return <Results stats={stats} onRestart={reset} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex flex-wrap gap-x-3 gap-y-3 text-2xl font-mono leading-relaxed select-none">
        {words.map((w, i) => (
          <Word
            key={i}
            data={w}
            activeChar={i === currentWord ? currentChar : null}
            isPast={i < currentWord}
          />
        ))}
      </div>
      {!started && (
        <p className="mt-8 text-sub text-sm text-center">
          Começa a digitar para iniciar · Tab para reiniciar
        </p>
      )}
    </div>
  );
}