import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, setToken, type UserResponse } from "../lib/api";

interface AuthStore {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;

  register: (email: string, username: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      error: null,

      register: async (email, username, password) => {
        set({ loading: true, error: null });
        try {
          const { access_token } = await authApi.register({ email, username, password });
          setToken(access_token);
          const user = await authApi.me();
          set({ user, loading: false });
          return true;
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          return false;
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { access_token } = await authApi.login({ email, password });
          setToken(access_token);
          const user = await authApi.me();
          set({ user, loading: false });
          return true;
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          return false;
        }
      },

      logout: () => {
        setToken(null);
        set({ user: null, error: null });
      },

      fetchMe: async () => {
        try {
          const user = await authApi.me();
          set({ user });
        } catch {
          setToken(null);
          set({ user: null });
        }
      },
    }),
    {
      name: "typearena-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Listener global para 401
if (typeof window !== "undefined") {
  window.addEventListener("typearena:unauthorized", () => {
    useAuth.getState().logout();
  });
}