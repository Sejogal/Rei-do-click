import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { leaderboardApi, type LeaderboardEntry } from "../lib/api";
import { useAuth } from "../store/auth";

export function Leaderboard() {
  const user = useAuth((state) => state.user);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { leaderboardApi.top(50).then(setEntries).catch((e) => setError((e as Error).message)); }, []);
  return <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
    <h1 className="text-3xl font-mono text-accent mb-6">ranking global</h1>
    {error && <p className="text-error mb-4">{error}</p>}
    <div className="overflow-x-auto rounded-lg bg-surface/50"><table className="w-full text-sm font-mono">
      <thead><tr className="text-sub text-left border-b border-sub/20"><th className="p-3">#</th><th className="p-3">jogador</th><th className="p-3">ELO</th><th className="p-3">nível</th><th className="p-3">partidas</th><th className="p-3">vitórias</th></tr></thead>
      <tbody>{entries.map((entry) => <tr key={entry.username} className={`border-b border-sub/10 ${entry.username === user?.username ? "text-accent bg-accent/5" : ""}`}>
        <td className="p-3">{entry.rank}</td><td className="p-3"><Link className="hover:text-accent hover:underline" to={`/u/${encodeURIComponent(entry.username)}`}>{entry.username}{entry.username === user?.username ? " (tu)" : ""}</Link></td><td className="p-3">{entry.elo}</td><td className="p-3">{entry.level}</td><td className="p-3">{entry.matches_played}</td><td className="p-3">{entry.matches_won}</td>
      </tr>)}</tbody>
    </table>{entries.length === 0 && !error && <p className="p-4 text-sub">Ainda não há jogadores no ranking.</p>}</div>
  </main>;
}
