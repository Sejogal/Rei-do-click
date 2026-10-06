const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("typearena-token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("typearena-token", token);
  else localStorage.removeItem("typearena-token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // ⬇️ NOVO: 401 → limpa token e avisa o store
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("typearena:unauthorized"));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<UserResponse>("/users/me"),
};

// ─── Results ──────────────────────────────────────
export interface ResultPayload {
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  correct_chars: number;
  incorrect_chars: number;
  total_chars: number;
  time_seconds: number;
  mode: string;
  source: string;
  duration: number;
  punctuation: boolean;
  numbers: boolean;
  language: string;
}

export interface ResultResponse extends ResultPayload {
  id: string;
  created_at: string;
}

export interface ResultStats {
  count: number;
  best_wpm: number;
  avg_wpm: number;
  avg_accuracy: number;
  avg_consistency: number;
  total_time_seconds: number;
}

export const resultsApi = {
  create: (data: ResultPayload) =>
    request<ResultResponse>("/results", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (limit = 50, offset = 0) =>
    request<ResultResponse[]>(`/results?limit=${limit}&offset=${offset}`),

  stats: () => request<ResultStats>("/results/stats"),
};