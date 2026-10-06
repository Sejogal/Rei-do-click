import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok =
      mode === "login"
        ? await login(email, password)
        : await register(email, username, password);
    if (ok) navigate("/profile");
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-mono text-accent mb-6 text-center">
          {mode === "login" ? "entrar" : "criar conta"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-surface text-text font-mono text-sm p-3 rounded border border-sub/20 focus:border-accent outline-none"
          />

          {mode === "register" && (
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              className="w-full bg-surface text-text font-mono text-sm p-3 rounded border border-sub/20 focus:border-accent outline-none"
            />
          )}

          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "register" ? 8 : undefined}
            className="w-full bg-surface text-text font-mono text-sm p-3 rounded border border-sub/20 focus:border-accent outline-none"
          />

          {error && (
            <p className="text-error font-mono text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg font-mono text-sm py-3 rounded disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "entrar" : "criar"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
          }}
          className="mt-4 w-full text-sub hover:text-text font-mono text-xs"
        >
          {mode === "login"
            ? "não tens conta? cria uma"
            : "já tens conta? entra"}
        </button>
      </div>
    </main>
  );
}