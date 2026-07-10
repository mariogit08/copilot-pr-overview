import { Storage } from "@plasmohq/storage";
import type { AnalysisResult } from "../core/types";

const storage = new Storage({
  area: "local"
});

export const getCacheKey = (owner: string, repo: string, prNumber: number, sha: string) => 
  `analysis_v3_${owner}_${repo}_${prNumber}_${sha}`;

export const getCachedAnalysis = async (key: string): Promise<AnalysisResult | null> => {
  return await storage.get<AnalysisResult>(key) || null;
};

export const setCachedAnalysis = async (key: string, result: AnalysisResult): Promise<void> => {
  await storage.set(key, result);
};
