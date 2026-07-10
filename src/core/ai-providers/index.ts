import { GroqProvider } from "./groq";
import type { AIProvider } from "../types";

export const providers: Record<string, AIProvider> = {
  groq: new GroqProvider()
};
