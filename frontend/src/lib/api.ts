const API_URL = (import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000").replace(/\/+$/, "");

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
  elo: number;
  xp: number;
  level: number;
  matches_played: number;
  matches_won: number;
  plan: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  plan_cancel_at_period_end: boolean;
  is_admin: boolean;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  plan: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  plan_cancel_at_period_end: boolean;
  created_at: string;
}

export interface PublicProfileData {
  profile: {
    id: string; username: string; elo: number; xp: number; level: number;
    matches_played: number; matches_won: number; plan: string; created_at: string;
    best_wpm: number; avg_wpm: number; total_races: number; win_rate: number;
  };
  achievements: Array<{ code: string; label: string; description: string; unlocked_at: string }>;
  matches: MatchResponse[];
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

export const usersApi = {
  byUsername: (username: string) => request<PublicProfileData["profile"]>(`/users/by-username/${encodeURIComponent(username)}`),
  publicProfile: (username: string) => request<PublicProfileData>(`/users/by-username/${encodeURIComponent(username)}/profile`),
  updateMe: (data: { email?: string; username?: string; current_password?: string; new_password?: string }) =>
    request<UserResponse>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  deleteMe: (password: string) =>
    request<void>("/users/me", { method: "DELETE", body: JSON.stringify({ password }) }),
};

export interface FriendItem { id: string; username: string; is_online?: boolean; friendship_id?: string }
export interface SocialNotification { id: string; type: string; payload: Record<string, string>; read: boolean; created_at: string }
export const friendsApi = {
  list: () => request<FriendItem[]>("/friends"),
  pending: () => request<Array<{ id: string; username: string }>>("/friends/pending"),
  sent: () => request<Array<{ id: string; username: string }>>("/friends/sent"),
  request: (username: string) => request<{ id: string; status: string }>("/friends/request", { method: "POST", body: JSON.stringify({ username }) }),
  accept: (id: string) => request<{ status: string }>(`/friends/accept/${encodeURIComponent(id)}`, { method: "POST" }),
  reject: (id: string) => request<void>(`/friends/reject/${encodeURIComponent(id)}`, { method: "POST" }),
  remove: (id: string) => request<void>(`/friends/${encodeURIComponent(id)}`, { method: "DELETE" }),
  invite: (friendId: string, roomId: string) => request<{ sent: boolean }>(`/friends/${encodeURIComponent(friendId)}/invite`, { method: "POST", body: JSON.stringify({ room_id: roomId }) }),
};
export const notificationsApi = {
  list: () => request<SocialNotification[]>("/notifications"),
  read: (id: string) => request<SocialNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  readAll: () => request<void>("/notifications/read-all", { method: "POST" }),
  remove: (id: string) => request<void>(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
export interface TournamentSummary { id: string; name: string; host_id: string; max_players: number; status: string; participants_count: number; created_at: string }
export interface TournamentMatchInfo { id: string; round: number; match_index: number; player1_id: string | null; player1: string | null; player2_id: string | null; player2: string | null; winner_id: string | null; winner: string | null; room_id: string | null; status: string }
export interface TournamentDetail extends Omit<TournamentSummary, "participants_count"> { participants: Array<{ id: string; user_id: string; username: string; seed: number; eliminated_round: number | null }>; matches: TournamentMatchInfo[]; started_at: string | null; finished_at: string | null }
export const tournamentsApi = {
  list: () => request<TournamentSummary[]>("/tournaments"),
  get: (id: string) => request<TournamentDetail>(`/tournaments/${encodeURIComponent(id)}`),
  create: (name: string, max_players: 8 | 16) => request<{ id: string }>("/tournaments", { method: "POST", body: JSON.stringify({ name, max_players }) }),
  join: (id: string) => request<{ joined: boolean }>(`/tournaments/${encodeURIComponent(id)}/join`, { method: "POST" }),
  start: (id: string) => request<{ status: string }>(`/tournaments/${encodeURIComponent(id)}/start`, { method: "POST" }),
  removeParticipant: (id: string, userId: string) => request<void>(`/tournaments/${encodeURIComponent(id)}/participants/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  cancel: (id: string) => request<void>(`/tournaments/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const adminApi = {
  listUsers: () => request<AdminUserResponse[]>("/admin/users"),
  createUser: (data: { email: string; username: string; password: string; is_admin: boolean }) =>
    request<AdminUserResponse>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: { email?: string; username?: string; new_password?: string; is_active?: boolean; is_admin?: boolean }) =>
    request<AdminUserResponse>(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  manageSubscription: (id: string, data: { action: "activate" | "renew" | "cancel" | "resume" | "revoke"; plan?: "pro" | "team" }) =>
    request<AdminUserResponse>(`/admin/users/${encodeURIComponent(id)}/subscription`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    request<void>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
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

export interface MatchParticipant {
  id: string; username: string; position: number | null; wpm: number; accuracy: number;
  finished: boolean; left_race: boolean; elo_delta: number | null; xp_earned: number | null;
}
export interface MatchResponse {
  id: string; room_id: string; started_at: string; finished_at: string | null;
  winner_username: string | null; player_count: number; participants: MatchParticipant[];
}
export interface LeaderboardEntry {
  rank: number; username: string; elo: number; level: number; matches_played: number; matches_won: number;
}
export interface AchievementInfo {
  code: string; label: string; description: string; unlocked: boolean; unlocked_at: string | null;
}
export const matchesApi = {
  list: (limit = 20, offset = 0, username?: string) => request<MatchResponse[]>(`/matches?limit=${limit}&offset=${offset}${username ? `&username=${encodeURIComponent(username)}` : ""}`),
  get: (id: string) => request<MatchResponse>(`/matches/${encodeURIComponent(id)}`),
};
export const leaderboardApi = {
  top: (limit = 50) => request<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`),
};
export const achievementsApi = {
  list: () => request<AchievementInfo[]>("/achievements"),
  byUser: (username: string) => request<Array<Omit<AchievementInfo, "unlocked">>>(`/achievements/user/${encodeURIComponent(username)}`),
};

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}
