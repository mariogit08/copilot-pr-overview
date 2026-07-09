import { GroqProvider } from "./groq";
import { AIProvider } from "../types";

export const providers: Record<string, AIProvider> = {
  groq: new GroqProvider()
};
