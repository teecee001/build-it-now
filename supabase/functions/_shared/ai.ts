export const ADVISOR_SYSTEM = `You are Ξ╳oSky's AI Financial Advisor — a world-class financial analyst and crypto expert. You provide:
- Deep market analysis with data-driven insights
- Portfolio optimization strategies
- Risk assessment and management advice
- Crypto and DeFi explanations
- Macro-economic trend analysis

You speak with authority but always caveat that this is not financial advice. Use markdown formatting for clarity. Be concise but thorough. Use bullet points and headers. When discussing specific assets, mention current market conditions. You have a sharp, professional tone — think Bloomberg meets a helpful mentor.`;

export type AiConfig = { apiKey: string; url: string; model: string };

export function getAiConfig(): AiConfig | null {
  const xai = Deno.env.get("XAI_API_KEY");
  if (xai) {
    return { apiKey: xai, url: "https://api.x.ai/v1/chat/completions", model: "grok-4.3" };
  }
  const openai = Deno.env.get("OPENAI_API_KEY");
  if (openai) {
    return { apiKey: openai, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" };
  }
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  if (lovable) {
    return {
      apiKey: lovable,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
    };
  }
  return null;
}

export async function chatCompletions(cfg: AiConfig, body: Record<string, unknown>) {
  return await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: cfg.model, ...body }),
  });
}

export type AdvisorProvider = AiConfig & { name: string; extraBody?: Record<string, unknown> };

/**
 * Providers ordered for speed first (fast + accurate models before heavier ones).
 * Groq Qwen and Gemini Flash are preferred for low latency.
 */
export function getAdvisorProviders(): AdvisorProvider[] {
  const out: AdvisorProvider[] = [];
  const env = (k: string) => (Deno.env.get(k) ?? "").trim();

  // Fastest accurate models first
  const groq = env("GROQ_API_KEY");
  if (groq) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const models = [env("GROQ_MODEL"), "qwen/qwen3.8-27b", "openai/gpt-oss-120b"].filter(Boolean);
    for (const model of [...new Set(models)]) {
      const extraBody = model.includes("gpt-oss")
        ? { include_reasoning: false }
        : model.includes("qwen")
        ? { reasoning_format: "hidden" }
        : undefined;
      out.push({ name: `groq:${model}`, apiKey: groq, url, model, extraBody });
    }
  }

  const gemini = env("GEMINI_API_KEY");
  if (gemini) {
    const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const models = [env("GEMINI_MODEL"), "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean);
    for (const model of [...new Set(models)]) out.push({ name: `gemini:${model}`, apiKey: gemini, url, model });
  }

  // Then stronger / slower models
  const xai = env("XAI_API_KEY");
  if (xai) out.push({ name: "xai", apiKey: xai, url: "https://api.x.ai/v1/chat/completions", model: "grok-4.3" });

  const openai = env("OPENAI_API_KEY");
  if (openai) out.push({ name: "openai", apiKey: openai, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" });

  const lovable = env("LOVABLE_API_KEY");
  if (lovable) {
    out.push({
      name: "lovable",
      apiKey: lovable,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
    });
  }

  return out;
}
