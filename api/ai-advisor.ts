export const config = { runtime: "edge" };

const SYSTEM = `You are Ξ╳oSky's AI Financial Advisor — a world-class financial analyst and crypto expert. You provide:
- Deep market analysis with data-driven insights
- Portfolio optimization strategies
- Risk assessment and management advice
- Crypto and DeFi explanations
- Macro-economic trend analysis

You speak with authority but always caveat that this is not financial advice. Use markdown formatting for clarity. Be concise but thorough. Use bullet points and headers. When discussing specific assets, mention current market conditions. You have a sharp, professional tone — think Bloomberg meets a helpful mentor.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

function getAiConfig() {
  const xai = process.env.XAI_API_KEY;
  if (xai) return { apiKey: xai, url: "https://api.x.ai/v1/chat/completions", model: "grok-4.3" };
  const openai = process.env.OPENAI_API_KEY;
  if (openai) return { apiKey: openai, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" };
  const lovable = process.env.LOVABLE_API_KEY;
  if (lovable) {
    return {
      apiKey: lovable,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
    };
  }
  return null;
}

const SUPABASE_URL = "https://vxcxwmhesgpncbkhwsej.supabase.co";
const SUPABASE_KEY = "sb_publishable_ceCUc9fqMwACxBU43yg43Q_nmKqkbmt";

function sanitizeMessages(raw: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const ok = raw.filter((m): m is { role: "user" | "assistant"; content: string } => {
    const r = m as { role?: unknown; content?: unknown } | null;
    return !!r && (r.role === "user" || r.role === "assistant") && typeof r.content === "string" && r.content.trim() !== "";
  });
  const recent = ok.slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (recent.length && recent[0].role !== "user") recent.shift();
  return recent;
}

async function consumeQuota(auth: string): Promise<Response | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_ai_quota`, {
    method: "POST",
    headers: {
      Authorization: auth,
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (res.ok) return null;
  const text = await res.text();
  if (res.status === 401 || /not authenticated/i.test(text)) {
    return new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (/rate limit/i.test(text)) {
    return new Response(JSON.stringify({ error: "AI rate limit reached. Try again in an hour." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  console.error("consume_ai_quota", res.status, text);
  return new Response(JSON.stringify({ error: "AI quota is unavailable" }), {
    status: 503,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function signedIn(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SUPABASE_KEY },
  });
  return res.ok;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!(await signedIn(req))) {
    return new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const limited = await consumeQuota(req.headers.get("authorization") || "");
  if (limited) return limited;

  const cfg = getAiConfig();
  if (!cfg) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const messages = sanitizeMessages((await req.json()).messages);
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
