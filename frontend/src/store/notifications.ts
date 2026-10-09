import { create } from "zustand";
import { notificationsApi, type SocialNotification } from "../lib/api";

export type ToastKind = "info" | "success" | "warning" | "error";
export interface ToastMessage { id: string; message: string; kind: ToastKind }
interface NotificationState {
  items: SocialNotification[];
  toasts: ToastMessage[];
  refresh: (notify?: boolean) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
}
export const useNotifications = create<NotificationState>((set, get) => ({
  items: [], toasts: [],
  refresh: async (notify = false) => {
    const next = await notificationsApi.list();
    const previous = new Set(get().items.map((item) => item.id));
    set({ items: next });
    if (notify) for (const item of next.filter((entry) => !entry.read && !previous.has(entry.id))) {
      const sender = item.payload.username ?? "";
      const text = item.type === "friend_request" ? `Novo pedido de amizade de ${sender}` : item.type === "friend_accepted" ? `${sender} aceitou o teu pedido` : item.type === "room_invite" ? `${sender} convidou-te para a sala ${item.payload.room_id ?? ""}` : item.type === "achievement" ? `Conquista desbloqueada: ${item.payload.label ?? item.payload.code ?? ""}` : "Tens uma nova notificação";
      const message = item.type === "tournament_match" ? `Partida do torneio ${item.payload.name ?? ""} na sala ${item.payload.room_id ?? ""}` : text;
      get().toast(message, item.type === "friend_request" || item.type === "room_invite" || item.type === "tournament_match" ? "info" : "success");
    }
  },
  markRead: async (id) => { await notificationsApi.read(id); set({ items: get().items.map((item) => item.id === id ? { ...item, read: true } : item) }); },
  markAllRead: async () => { await notificationsApi.readAll(); set({ items: get().items.map((item) => ({ ...item, read: true })) }); },
  remove: async (id) => { await notificationsApi.remove(id); set({ items: get().items.filter((item) => item.id !== id) }); },
  toast: (message, kind = "info") => { const id = crypto.randomUUID(); set({ toasts: [...get().toasts, { id, message, kind }] }); window.setTimeout(() => get().dismissToast(id), 5000); },
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
