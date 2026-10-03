import { Link } from "react-router-dom";
import { getResults, getAggregate, clearResults } from "../lib/storage";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function Profile() {
  const [tick, setTick] = useState(0);
  const results = getResults();
  const agg = getAggregate();

  const chartData = [...results]
    .reverse()
    .slice(-30)
    .map((r, i) => ({
      i: i + 1,
      wpm: r.stats.wpm,
      accuracy: r.stats.accuracy,
    }));

  const handleClear = () => {
    if (confirm("Apagar todo o histórico?")) {
      clearResults();
      setTick(tick + 1);
    }
  };

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
      <h1 className="text-3xl font-mono text-accent mb-8">perfil</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <Stat label="testes" value={agg.count} />
        <Stat label="melhor wpm" value={agg.bestWpm} accent />
        <Stat label="wpm médio" value={agg.avgWpm} />
        <Stat label="precisão média" value={`${agg.avgAccuracy}%`} />
        <Stat label="tempo total" value={`${Math.floor(agg.totalTime / 60)}min`} />
      </div>

      {chartData.length > 1 && (
        <div className="bg-surface/50 rounded-lg p-6 mb-8">
          <h2 className="text-sub text-sm mb-4">últimos {chartData.length} testes</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#2a2a2c" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="#646669" fontSize={12} />
              <YAxis stroke="#646669" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1c",
                  border: "1px solid #2a2a2c",
                  borderRadius: "8px",
                  color: "#e2e2e2",
                }}
              />
              <Line
                type="monotone"
                dataKey="wpm"
                stroke="#e2b714"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-surface/50 rounded-lg p-6">
        <h2 className="text-sub text-sm mb-4">histórico</h2>
        {results.length === 0 ? (
          <p className="text-sub">Ainda não tens testes. Faz um!</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.slice(0, 30).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm font-mono py-2 border-b border-sub/10"
              >
                <span className="text-sub">
                  {new Date(r.timestamp).toLocaleDateString("pt-PT")}
                </span>
                <span className="text-accent">{r.stats.wpm} wpm</span>
                <span>{r.stats.accuracy}%</span>
                <span className="text-sub">
                  {r.config.mode === "time"
                    ? `${r.config.time}s`
                    : `${r.config.wordCount}p`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <button
          onClick={handleClear}
          className="mt-6 text-sub hover:text-error text-sm font-mono"
        >
          apagar histórico
        </button>
      )}

      <Link
        to="/"
        className="block mt-8 text-accent font-mono text-sm hover:underline"
      >
        ← voltar
      </Link>
    </main>
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
    <div className="bg-surface/50 rounded-lg p-4">
      <div className="text-sub text-xs lowercase mb-1">{label}</div>
      <div className={`text-2xl font-mono ${accent ? "text-accent" : "text-text"}`}>
        {value}
      </div>
    </div>
  );
}