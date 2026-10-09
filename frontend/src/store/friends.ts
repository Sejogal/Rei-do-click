import { create } from "zustand";
import { friendsApi, type FriendItem } from "../lib/api";

interface FriendState {
  friends: FriendItem[];
  pending: Array<{ id: string; username: string }>;
  sent: Array<{ id: string; username: string }>;
  refresh: () => Promise<void>;
  request: (username: string) => Promise<void>;
  accept: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  inviteToRoom: (friendId: string, roomId: string) => Promise<void>;
}
export const useFriends = create<FriendState>((set, get) => ({
  friends: [], pending: [], sent: [],
  refresh: async () => {
    const [friends, pending, sent] = await Promise.all([friendsApi.list(), friendsApi.pending(), friendsApi.sent()]);
    set({ friends, pending, sent });
  },
  request: async (username) => { await friendsApi.request(username); await get().refresh(); },
  accept: async (id) => { await friendsApi.accept(id); await get().refresh(); },
  reject: async (id) => { await friendsApi.reject(id); await get().refresh(); },
  remove: async (id) => { await friendsApi.remove(id); await get().refresh(); },
  inviteToRoom: async (friendId, roomId) => { await friendsApi.invite(friendId, roomId); },
}));
