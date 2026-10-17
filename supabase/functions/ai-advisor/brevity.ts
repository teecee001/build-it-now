/** Server-side brevity: Exo replies are 2-4 sentences unless the user asked for detail. */
const DETAIL = /\b(detail(ed)?|explain|in depth|deep dive|step[- ]by[- ]step|full (plan|breakdown|list|report)|everything|thorough|long(er)?|elaborate|walk me through|statement|table|compare all)\b/i;
export function wantsDetail(question: string): boolean {
  return DETAIL.test(question);
}

const CARD_LINE = /^\s*(?:[-*]|\d+[.)])\s+\**[A-Za-z][A-Za-z0-9.]{0,9}\**\s*[:–—-]\s*\**\d{1,3}(?:\.\d+)?\s?%|^\s*(?:[-*]\s+)?\**(?:Day\s+\d+|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+[A-Z][a-z]{2,8}\.?\s+\d{1,2})\**\s*[·:—–-]|]\(https?:\/\//;

function sentences(p: string): string[] {
  return p.replace(/\s+/g, " ").trim().match(/[^.!?]+(?:[.!?]+["')\]]?|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

/** Strong cleanup: strip tool names, broken tables, and internal jargon before the user sees it. */
export function cleanResponse(text: string): string {
  let t = text;
  // Remove any line that looks like a broken table or raw tool dump
  t = t.replace(/\|[^\n]*\|[^\n]*\|/g, "");
  t = t.replace(/`[^`]+`/g, "");
  t = t.replace(/\b(accounting_check|get_prices|get_news|get_macro|get_market_sentiment|audit_finances|governor_check|quant_monte_carlo|shop_search|plan_trip|plan_event)\b/gi, "");
  t = t.replace(/\b[a-z]+_[a-z_]+\b/g, "");
  // Collapse multiple spaces and empty lines
  t = t.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  return t;
}

export function enforceBrevity(text: string, question: string, maxSentences = 4, maxWords = 90): string {
  const cleaned = cleanResponse(text);
  if (wantsDetail(question)) return cleaned;
  const cards: string[] = [];
  const prose: string[] = [];
  for (const raw of cleaned.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || /^\s*#{1,6}\s/.test(line) || /^\s*(\*\*|__)[^*_]{1,60}(\*\*|__):?\s*$/.test(line) || /^\s*[-*_]{3,}\s*$/.test(line)) continue;
    if (CARD_LINE.test(line)) { if (cards.length < 6) cards.push(line); continue; }
    const item = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").replace(/^\s*\*\*[^*]{1,40}:\*\*\s*/, "").replace(/^\s*\*\*([^*]{1,40})\*\*:\s*/, "").replace(/\*\*([^*]+)\*\*/g, "$1");
    if (item.trim()) prose.push(item.trim());
  }
  const out: string[] = [];
  let words = 0;
  const lines = prose.filter((l, i) => !(/:\s*$/.test(l) && i < prose.length - 1));
  for (const s of sentences(lines.join(" "))) {
    if (/`[^`]+`|\b[a-z]+_[a-z_]+\b/.test(s)) continue;
    const w = s.split(" ").length;
    if (out.length >= maxSentences || (out.length >= 2 && words + w > maxWords)) break;
    out.push(s);
    words += w;
  }
  const paras: string[] = [];
  for (let i = 0; i < out.length; i += 2) paras.push(out.slice(i, i + 2).join(" "));
  if (cards.length) paras.push(cards.join("\n"));
  return paras.join("\n\n") || cleaned;
}
