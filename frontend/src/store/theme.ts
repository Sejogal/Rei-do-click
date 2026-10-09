import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "default" | "dracula" | "nord" | "light" | "cyberpunk";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "default",
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
    }),
    { name: "typearena-theme" }
  )
);
