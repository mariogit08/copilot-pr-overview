export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  description: string;
  latestCommitSha: string;
  diffStats: {
    addedEndpoints: string[];
    removedEndpoints: string[];
    dbChanges: string[];
    configChanges: string[];
  };
  compressedDiff: string;
}

export interface ReviewStep {
  id: number;
  title: string;
  description: string;
  file: string;
  startLine: number;
  endLine: number;
  importance: "high" | "medium" | "low";
  category: string;
}

export interface AnalysisResult {
  purpose: string;
  summary: string[];
  architecture: {
    diagram: string;
    description: string;
  };
  affectedAreas: string[];
  risks: string[];
  reviewOrder: {
    file: string;
    reason: string;
  }[];
  confidence: number;
  steps?: ReviewStep[];
}

export interface ProviderConfig {
  id: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  analyzePullRequest(
    context: PRContext,
    config: ProviderConfig,
    onChunk: (chunk: string) => void
  ): Promise<AnalysisResult>;
  testConnection(config: ProviderConfig): Promise<boolean>;
}
