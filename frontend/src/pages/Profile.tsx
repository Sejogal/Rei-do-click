import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../store/auth";
import { achievementsApi, authApi, matchesApi, resultsApi, type AchievementInfo, type MatchResponse, type ResultStats } from "../lib/api";
import { getResults, getAggregate, clearResults } from "../lib/storage";

interface DisplayResult {
  id: string;
  wpm: number;
  accuracy: number;
  consistency: number;
  mode: string;
  duration: number;
  created_at: string;
}

export function Profile() {
  const { user } = useAuth();

  const [results, setResults] = useState<DisplayResult[]>([]);
  const [stats, setStats] = useState<ResultStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [achievements, setAchievements] = useState<AchievementInfo[]>([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([authApi.me(), matchesApi.list(30), achievementsApi.list()]).then(([fresh, history, badges]) => {
      if (cancelled) return;
      useAuth.setState({ user: fresh });
      setMatches(history);
      setAchievements(badges);
    }).catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      if (user) {
        // ── Modo servidor ──
        try {
          const [list, s] = await Promise.all([
            resultsApi.list(30, 0),
            resultsApi.stats(),
          ]);
          if (cancelled) return;

          setResults(
            list.map((r) => ({
              id: r.id,
              wpm: r.wpm,
              accuracy: r.accuracy,
              consistency: r.consistency,
              mode: r.mode,
              duration: r.duration,
              created_at: r.created_at,
            }))
          );
          setStats(s);
        } catch (e) {
          if (cancelled) return;
          setError((e as Error).message);
        }
      } else {
        // ── Modo local ──
        const local = getResults();
        const agg = getAggregate();
        if (cancelled) return;

        setResults(
          local.map((r) => ({
            id: r.id,
            wpm: r.stats.wpm,
            accuracy: r.stats.accuracy,
            consistency: r.stats.consistency,
            mode: r.config.mode,
            duration:
              r.config.mode === "time" ? r.config.time : r.config.wordCount,
            created_at: new Date(r.timestamp).toISOString(),
          }))
        );
        setStats({
          count: agg.count,
          best_wpm: agg.bestWpm,
          avg_wpm: agg.avgWpm,
          avg_accuracy: agg.avgAccuracy,
          avg_consistency: agg.avgConsistency,
          total_time_seconds: agg.totalTime,
        });
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const chartData = [...results]
    .reverse()
    .slice(-30)
    .map((r, i) => ({
      i: i + 1,
      wpm: r.wpm,
      accuracy: r.accuracy,
    }));

  const handleClearLocal = () => {
    if (confirm("Apagar todo o histórico local?")) {
      clearResults();
      setResults([]);
      setStats(null);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sub font-mono text-sm">carregando...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-mono text-accent">
          {user ? `@${user.username}` : "perfil"}
        </h1>{user && <Link to={`/u/${encodeURIComponent(user.username)}`} className="mt-2 inline-block font-mono text-xs text-sub hover:text-accent">Ver perfil público →</Link>}</div>
      </div>

      {error && (
        <p className="text-error font-mono text-sm mb-4">{error}</p>
      )}

      {user && <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="elo" value={user.elo} accent />
          <Stat label="nível" value={user.level} />
          <Stat label="xp" value={user.xp} />
        </div>
        <div className="mt-3 h-2 rounded bg-surface overflow-hidden" aria-label="Progresso do nível">
          <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, ((user.xp - (user.level - 1) * user.level * 50) / (user.level * 100)) * 100))}%` }} />
        </div>
        <p className="mt-1 text-xs text-sub font-mono">{user.matches_played} partidas · {user.matches_won} vitórias</p>
      </section>}

      {user && <section className="bg-surface/50 rounded-lg p-6 mb-8">
        <h2 className="text-sub text-sm mb-4">Histórico de partidas</h2>
        {matches.length === 0 ? <p className="text-sub font-mono text-sm">Ainda não tens partidas multiplayer.</p> :
          <div className="space-y-2 max-h-96 overflow-y-auto">{matches.map((match) => {
            const own = match.participants.find((p) => p.username === user.username);
            return <div key={match.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-sub/10 py-2 text-sm font-mono">
              <span className="text-sub">{new Date(match.started_at).toLocaleDateString("pt-PT")}</span>
              <span>{own?.left_race ? "Desistiu" : own?.position ? `#${own.position}` : "—"}</span>
              <span>{own?.wpm ?? 0} WPM</span><span>{own?.accuracy ?? 0}%</span>
              <span className={(own?.elo_delta ?? 0) >= 0 ? "text-accent" : "text-error"}>ELO {own?.elo_delta == null ? "—" : `${own.elo_delta > 0 ? "+" : ""}${own.elo_delta}`}</span>
              <span className="text-accent">+{own?.xp_earned ?? 0} XP</span>
            </div>;
          })}</div>}
      </section>}

      {user && <section className="bg-surface/50 rounded-lg p-6 mb-8">
        <h2 className="text-sub text-sm mb-4">Conquistas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{achievements.map((badge) =>
          <div key={badge.code} title={badge.description} className={`rounded border p-3 ${badge.unlocked ? "border-accent/50" : "border-sub/10 opacity-40 grayscale"}`}>
            <div className="font-mono text-sm">{badge.label}</div><div className="text-xs text-sub mt-1">{badge.description}</div>
          </div>)}</div>
      </section>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <Stat label="testes" value={stats.count} />
          <Stat label="melhor wpm" value={stats.best_wpm} accent />
          <Stat label="wpm médio" value={stats.avg_wpm} />
          <Stat label="precisão média" value={`${stats.avg_accuracy}%`} />
          <Stat
            label="tempo total"
            value={`${Math.floor(stats.total_time_seconds / 60)}min`}
          />
        </div>
      )}

      {chartData.length > 1 && (
        <div className="bg-surface/50 rounded-lg p-6 mb-8">
          <h2 className="text-sub text-sm mb-4">
            últimos {chartData.length} testes
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgb(var(--color-sub) / 0.25)" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="rgb(var(--color-sub))" fontSize={12} />
              <YAxis stroke="rgb(var(--color-sub))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--color-surface))",
                  border: "1px solid rgb(var(--color-sub) / 0.25)",
                  borderRadius: "8px",
                  color: "rgb(var(--color-text))",
                }}
              />
              <Line
                type="monotone"
                dataKey="wpm"
                stroke="rgb(var(--color-accent))"
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
          <p className="text-sub font-mono text-sm">
            Ainda não tens testes. Faz um!
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm font-mono py-2 border-b border-sub/10"
              >
                <span className="text-sub">
                  {new Date(r.created_at).toLocaleDateString("pt-PT")}
                </span>
                <span className="text-accent">{r.wpm} wpm</span>
                <span>{r.accuracy}%</span>
                <span className="text-sub">
                  {r.mode === "time" ? `${r.duration}s` : `${r.duration}p`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!user && results.length > 0 && (
        <button
          onClick={handleClearLocal}
          className="mt-6 text-sub hover:text-error text-sm font-mono"
        >
          apagar histórico local
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
      <div
        className={`text-2xl font-mono ${
          accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
