import type { AIProvider, AnalysisResult, PRContext, ProviderConfig } from "../types";

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
  "confidence": 0.9,
  "steps": [{
    "id": 1,
    "title": "Added input validation",
    "description": "Reject invalid requests before rate limiting. Explain the code deeply here.",
    "file": "NotificationService.cs",
    "startLine": 31,
    "endLine": 35,
    "importance": "high",
    "category": "validation",
    "pieces": [
      {
        "snippet": "string.IsNullOrWhiteSpace",
        "explanation": "We use IsNullOrWhiteSpace here instead of checking for null to avoid empty string bypasses."
      }
    ],
    "reviewerTips": ["Check if there are edge cases not covered by this validation.", "Consider if the regex is vulnerable to ReDoS."],
    "challengeQuestions": ["What happens if the user passes null instead of an empty string?", "Could this validation logic be reused elsewhere?"]
  }]
}
For each step, you MUST provide deep, highly detailed explanations (AT LEAST 3-4 sentences) of the code changes, explaining the 'why' and 'how'. Do NOT just summarize the line.
You MUST generate at least one step for EVERY single file changed in the PR, including test files, configuration files, and project files. Do not skip any files.
You MUST break the code down into 1-3 specific 'pieces' (an exact string match from the code, and a micro-explanation of why it is important), like a Senior dev explaining to a Junior. The 'pieces' array MUST NOT be empty.
You MUST provide 'reviewerTips' (things to watch out for) and 'challengeQuestions' (questions to ask the author to challenge the code's resilience, performance, or design). These arrays MUST NOT be empty.`;

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
    let buffer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          
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
              // Ignore parse errors for validly structured but incomplete chunks 
              // (though with proper buffering this should rarely happen unless the upstream JSON is bad)
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
