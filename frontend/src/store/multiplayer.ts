import { create } from "zustand";
import { GameSocket, type PlayerState, type RoomStatus } from "../lib/ws";

interface MultiplayerStore {
  socket: GameSocket | null;
  roomId: string | null;
  players: PlayerState[];
  status: RoomStatus;
  hostId: string;
  countdown: number | null;
  raceText: string | null;
  raceStartAt: number | null;
  error: string | null;
  myId: string | null;
  

  connect: (roomId: string, username: string) => Promise<void>;
  disconnect: () => void;
  setReady: () => void;
  sendProgress: (word: number, char: number, wpm: number) => void;
  sendFinished: (wpm: number, accuracy: number) => void;
  reset: () => void;
  requestRematch: () => void;
}

export const useMultiplayer = create<MultiplayerStore>((set, get) => ({
  socket: null,
  roomId: null,
  players: [],
  status: "waiting",
  hostId: "",
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
            players: msg.players,
            status: msg.status,
            hostId: msg.host_id,
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
          set({ players: msg.ranking });
          break;
        case "error":
          set({ error: msg.detail });
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
      players: [],
      status: "waiting",
      countdown: null,
      raceText: null,
      raceStartAt: null,
      error: null,
      myId: null,
    });
  },

  setReady: () => {
    get().socket?.send({ type: "ready" });
  },

  sendProgress: (word, char, wpm) => {
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
    });
  },

  requestRematch: () => {
    get().socket?.send({ type: "rematch" });
  },
}));

