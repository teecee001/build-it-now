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

/**
 * Text-chat config for the Exo advisor: the paid/primary keys above first,
 * then free-tier OpenAI-compatible providers (Groq, Google Gemini).
 * Kept separate from getAiConfig() so vision callers (verify-identity) are unaffected.
 */
export function getAdvisorAiConfig(): AiConfig | null {
  const primary = getAiConfig();
  if (primary) return primary;
  const groq = Deno.env.get("GROQ_API_KEY");
  if (groq) {
    return { apiKey: groq, url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" };
  }
  const gemini = Deno.env.get("GEMINI_API_KEY");
  if (gemini) {
    return {
      apiKey: gemini,
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      // gemini-2.0-flash was shut down by Google on 2026-06-01. Use the rolling
      // Flash alias (overridable via GEMINI_MODEL) so future retirements don't break Exo.
      model: Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest",
    };
  }
  return null;
}
