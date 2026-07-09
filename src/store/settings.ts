import { create } from "zustand";
import { Storage } from "@plasmohq/storage";
import { ProviderConfig } from "../core/types";

const storage = new Storage();

interface SettingsState {
  config: ProviderConfig;
  setConfig: (config: Partial<ProviderConfig>) => void;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: {
    id: "groq",
    model: "llama-3.3-70b-versatile",
    maxTokens: 4096,
    temperature: 0.2
  },
  setConfig: async (newConfig) => {
    const updated = { ...get().config, ...newConfig };
    set({ config: updated });
    await storage.set("settings", updated);
  },
  load: async () => {
    const saved = await storage.get<ProviderConfig>("settings");
    if (saved) set({ config: saved });
  }
}));
