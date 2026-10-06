import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CONFIG, type TestConfig } from "../types";

interface ConfigStore {
  config: TestConfig;
  update: (patch: Partial<TestConfig>) => void;
  reset: () => void;
}

export const useConfig = create<ConfigStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      update: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),
      reset: () => set({ config: DEFAULT_CONFIG }),
    }),
    { name: "typearena-config" }
  )
);