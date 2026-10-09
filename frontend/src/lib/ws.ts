const WS_URL =
  (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(
    /^http/,
    "ws"
  ) + "/ws/room";

export type ServerMessage =
  | { type: "room_state"; room_id: string; players: PlayerState[]; status: RoomStatus; host_id: string; max_players: number; game_mode: GameMode; eliminated: string[] }
  | { type: "countdown"; value: number }
  | { type: "race_start"; text: string; start_at: number; blind_timeout?: number }
  | { type: "player_progress"; player_id: string; word: number; char: number; wpm: number }
  | { type: "player_finished"; player_id: string; wpm: number; accuracy: number; position: number }
  | { type: "race_end"; ranking: PlayerState[]; teams?: Array<{ team_id: string; position: number; players: string[]; average_wpm: number }> }
  | { type: "chat"; player_id: string; username: string; text: string }
  | { type: "achievements_unlocked"; codes: string[] }
  | { type: "player_eliminated"; player_id: string; username: string; position: number; wpm: number }
  | { type: "error"; detail: string };

export type RoomStatus = "waiting" | "countdown" | "racing" | "finished";
export type GameMode = "race" | "elimination" | "survival" | "blind" | "relay";

export interface PlayerState {
  id: string;
  username: string;
  ready: boolean;
  finished: boolean;
  wpm: number;
  word: number;
  char: number;
  team_id?: string | null;
  relay_start?: number | null;
  relay_end?: number | null;
}

export type ClientMessage =
  | { type: "join_room"; username: string }
  | { type: "ready" }
  | { type: "progress"; word: number; char: number; wpm: number }
  | { type: "finished"; wpm: number; accuracy: number }
  | { type: "chat"; text: string }
  | { type: "rematch" }
  | { type: "set_game_mode"; mode: GameMode }
  | { type: "set_max_players"; max_players: number }
  | { type: "leave" };

export class GameSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<(msg: ServerMessage) => void> = new Set();
  private openListeners: Set<() => void> = new Set();
  private closeListeners: Set<() => void> = new Set();

  connect(roomId: string, username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("typearena-token");
      const authQuery = token ? `?token=${encodeURIComponent(token)}` : "";
      const ws = new WebSocket(`${WS_URL}/${roomId}${authQuery}`);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join_room", username }));
        this.openListeners.forEach((fn) => fn());
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.listeners.forEach((fn) => fn(msg));
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WS error:", e);
        reject(e);
      };

      ws.onclose = () => {
        this.closeListeners.forEach((fn) => fn());
        this.ws = null;
      };
    });
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WS não está aberto");
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  disconnect(): void {
    if (this.ws) {
      this.send({ type: "leave" });
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(fn: (msg: ServerMessage) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onOpen(fn: () => void): () => void {
    this.openListeners.add(fn);
    return () => this.openListeners.delete(fn);
  }

  onClose(fn: () => void): () => void {
    this.closeListeners.add(fn);
    return () => this.closeListeners.delete(fn);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
