import { create } from "zustand";
import { Storage } from "@plasmohq/storage";
import type { ProviderConfig } from "../core/types";

const storage = new Storage();

interface SettingsState {
  config: ProviderConfig;
  setConfig: (config: Partial<ProviderConfig>) => void;
  load: () => Promise<void>;
}

const DEFAULT_CONFIG: ProviderConfig = {
  id: "groq",
  apiKey: process.env.PLASMO_PUBLIC_GROQ_API_KEY || "",
  model: "llama-3.3-70b-versatile",
  maxTokens: 4096,
  temperature: 0.2
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: DEFAULT_CONFIG,
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
