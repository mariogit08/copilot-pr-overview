import { AIProvider, AnalysisResult, PRContext, ProviderConfig } from "../types";

export class GroqProvider implements AIProvider {
  id = "groq";
  name = "Groq Cloud";

  async analyzePullRequest(
    context: PRContext,
    config: ProviderConfig,
    onChunk: (chunk: string) => void
  ): Promise<AnalysisResult> {
    if (!config.apiKey) throw new Error("Groq API Key is missing");

    const systemPrompt = `You are a Staff Software Engineer analyzing a Pull Request.
Output MUST be valid JSON matching this structure:
{
  "purpose": "paragraph",
  "summary": ["bullet 1"],
  "architecture": { "diagram": "mermaid diagram", "description": "" },
  "affectedAreas": ["Area 1"],
  "risks": ["Risk 1"],
  "reviewOrder": [{ "file": "file.ts", "reason": "reason" }],
  "confidence": 0.9
}`;

    const userPrompt = `Analyze this PR:\nTitle: ${context.title}\nDescription: ${context.description}\nDiff: ${context.compressedDiff}`;

    const response = await fetch(config.baseUrl || "https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: config.temperature ?? 0.2,
        max_tokens: config.maxTokens ?? 4096,
        response_format: { type: "json_object" },
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq Error Body:", errorText);
      throw new Error(`Groq API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    }

    try {
      return JSON.parse(fullText) as AnalysisResult;
    } catch (e) {
      throw new Error("Failed to parse JSON response from Groq");
    }
  }

  async testConnection(config: ProviderConfig): Promise<boolean> {
    if (!config.apiKey) return false;
    try {
      const response = await fetch(config.baseUrl || "https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
