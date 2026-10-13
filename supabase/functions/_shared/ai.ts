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

export type AdvisorProvider = AiConfig & { name: string };

/**
 * Every configured text-chat provider for the Exo advisor, in priority order:
 * xai, openai, lovable, groq, gemini. The caller tries each until one succeeds.
 * Kept separate from getAiConfig() so vision callers (verify-identity) are unaffected.
 */
export function getAdvisorProviders(): AdvisorProvider[] {
  const out: AdvisorProvider[] = [];
  const env = (k: string) => (Deno.env.get(k) ?? "").trim();
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
  const groq = env("GROQ_API_KEY");
  if (groq) out.push({ name: "groq", apiKey: groq, url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" });
  const gemini = env("GEMINI_API_KEY");
  if (gemini) {
    // OpenAI-compatible endpoint + Bearer auth per https://ai.google.dev/gemini-api/docs/openai
    // (gemini-2.0-flash was shut down 2026-06-01). Optional GEMINI_MODEL override first,
    // then the current documented Flash model, then the rolling alias.
    const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const models = [env("GEMINI_MODEL"), "gemini-3.8-flash", "gemini-flash-latest"].filter(Boolean);
    for (const model of [...new Set(models)]) out.push({ name: `gemini:${model}`, apiKey: gemini, url, model });
  }
  return out;
}
