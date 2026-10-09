import { create } from "zustand";
import { GameSocket, type GameMode, type PlayerState, type RoomStatus } from "../lib/ws";

interface ChatEntry {
  id: string;
  player_id: string;
  username: string;
  text: string;
  timestamp: number;
}

interface MultiplayerStore {
  socket: GameSocket | null;
  roomId: string | null;
  players: PlayerState[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  countdown: number | null;
  raceText: string | null;
  raceStartAt: number | null;
  error: string | null;
  myId: string | null;
  messages: ChatEntry[];
  unlockedAchievements: string[];
  gameMode: GameMode;
  eliminated: string[];
  eliminationNotice: string | null;
  teamRanking: Array<{ team_id: string; position: number; players: string[]; average_wpm: number }>;
  

  connect: (roomId: string, username: string) => Promise<void>;
  disconnect: () => void;
  setReady: () => void;
  sendProgress: (word: number, char: number, wpm: number) => void;
  sendFinished: (wpm: number, accuracy: number) => void;
  reset: () => void;
  requestRematch: () => void;
  sendChat: (text: string) => void;
  setGameMode: (mode: GameMode) => void;
  setMaxPlayers: (maxPlayers: number) => void;
}

export const useMultiplayer = create<MultiplayerStore>((set, get) => ({
  socket: null,
  roomId: null,
  players: [],
  messages: [],
  unlockedAchievements: [],
  gameMode: "race",
  eliminated: [],
  eliminationNotice: null,
  teamRanking: [],
  status: "waiting",
  hostId: "",
  maxPlayers: 4,
  countdown: null,
  raceText: null,
  raceStartAt: null,
  error: null,
  myId: null,

  connect: async (roomId, username) => {
    // Limpa estado anterior
    get().disconnect();
    set({ error: null, roomId });

    const socket = new GameSocket();
    set({ socket });

    socket.onMessage((msg) => {
      switch (msg.type) {
        case "room_state": {
          set({
            // race_end also includes players who left, unlike room_state.
            // Keep its ranking if a delayed final room_state arrives.
            // atrasado depois do resultado.
            players: get().status === "finished" && msg.status === "finished"
              ? get().players
              : msg.players,
            status: msg.status,
            hostId: msg.host_id,
            maxPlayers: msg.max_players,
            gameMode: msg.game_mode,
            eliminated: msg.eliminated,
          });
          // Descobre o meu id (o que tem o username que usei)
          const me = msg.players.find((p) => p.username === username);
          if (me) set({ myId: me.id });
          break;
        }
        case "countdown":
          set({ countdown: msg.value });
          break;
        case "race_start":
          set({
            raceText: msg.text,
            raceStartAt: msg.start_at,
            countdown: null,
          });
          break;
        case "player_progress":
          set({
            players: get().players.map((p) =>
              p.id === msg.player_id
                ? { ...p, word: msg.word, char: msg.char, wpm: msg.wpm }
                : p
            ),
          });
          break;
        case "player_finished":
          set({
            players: get().players.map((p) =>
              p.id === msg.player_id
                ? { ...p, finished: true, wpm: msg.wpm }
                : p
            ),
          });
          break;
        case "race_end":
          set({ players: msg.ranking, teamRanking: msg.teams ?? [], status: "finished", countdown: null });
          break;
        case "chat":
          set({
            messages: [
              ...get().messages,
              {
                id: crypto.randomUUID(),
                player_id: msg.player_id,
                username: msg.username,
                text: msg.text,
                timestamp: Date.now(),
              },
            ].slice(-50),
          });
          break;
        case "achievements_unlocked":
          set({ unlockedAchievements: [...get().unlockedAchievements, ...msg.codes] });
          void import("./notifications").then(({ useNotifications }) => {
            const labels: Record<string, string> = { first_race: "Primeira corrida", first_win: "Primeira vitória", speed_60: "Velocista", speed_80: "Relâmpago", speed_100: "Imparável", accuracy_95: "Preciso", accuracy_98: "Cirúrgico", level_5: "Veterano", level_10: "Elite", matches_10: "Dedicado", matches_50: "Viciado", wins_10: "Campeão" };
            useNotifications.getState().toast(`Conquista desbloqueada: ${msg.codes.map((code) => labels[code] ?? code).join(", ")}`, "success");
          });
          window.setTimeout(() => set({ unlockedAchievements: [] }), 7000);
          break;
        case "player_eliminated":
          set({
            eliminated: [...new Set([...get().eliminated, msg.player_id])],
            players: get().players.map((p) => p.id === msg.player_id ? { ...p, finished: true } : p),
            eliminationNotice: `${msg.username} foi eliminado na palavra ${get().players.find((p) => p.id === msg.player_id)?.word ?? 0}`,
          });
          window.setTimeout(() => set({ eliminationNotice: null }), 3500);
          break;
        case "error":
          {
            const wasRejected = get().players.length === 0;
            const wasRemoved = msg.detail === "Sala reduzida, foste removido";
            set({
              error: msg.detail,
              ...(wasRejected || wasRemoved
                ? {
                    roomId: null,
                    status: "waiting" as const,
                    players: [],
                    hostId: "",
                    myId: null,
                  }
                : {}),
            });
          }
          break;
      }
    });

    try {
      await socket.connect(roomId, username);
    } catch {
      set({ error: "Não foi possível ligar ao servidor" });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
    set({
      socket: null,
      roomId: null,
      players: [],
      messages: [],
      unlockedAchievements: [],
      gameMode: "race",
      eliminated: [],
      teamRanking: [],
      eliminationNotice: null,
      status: "waiting",
      countdown: null,
      raceText: null,
      raceStartAt: null,
      error: null,
      myId: null,
      maxPlayers: 4,
    });
  },

  setReady: () => {
    get().socket?.send({ type: "ready" });
  },

  sendProgress: (word, char, wpm) => {
    const { players, myId, gameMode } = get();
    set({
      players: players.map((player) =>
        player.id === myId ? { ...player, word: gameMode === "relay" ? word + (player.relay_start ?? 0) : word, char, wpm } : player
      ),
    });
    get().socket?.send({ type: "progress", word, char, wpm });
  },

  sendFinished: (wpm, accuracy) => {
    get().socket?.send({ type: "finished", wpm, accuracy });
  },

  reset: () => {
    set({
      countdown: null,
      raceText: null,
      raceStartAt: null,
      error: null,
      teamRanking: [],
    });
  },

  requestRematch: () => {
    get().socket?.send({ type: "rematch" });
  },

  sendChat: (text) => {
    const trimmed = text.trim().slice(0, 200);
    if (trimmed) get().socket?.send({ type: "chat", text: trimmed });
  },

  setGameMode: (mode) => get().socket?.send({ type: "set_game_mode", mode }),
  setMaxPlayers: (max_players) => get().socket?.send({ type: "set_max_players", max_players }),
}));

