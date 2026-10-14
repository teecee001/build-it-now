// Appends a "Sources" section for answers that used get_news. Added after the fact-check,
// from the tool's own results, so the headline numbers/dates never trip it.
export type Headline = { title: string; source: string; date: string; link: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : "";
};
const clean = (s: string) => s.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();

/** Headlines from every get_news result, deduped by link and title. */
export function collectHeadlines(results: unknown[]): Headline[] {
  const seen = new Set<string>();
  const out: Headline[] = [];
  for (const r of results) {
    const list = (r as { headlines?: unknown })?.headlines;
    if (!Array.isArray(list)) continue;
    for (const h of list as Headline[]) {
      if (!h?.title || !/^https?:\/\//.test(h.link ?? "")) continue;
      const key = clean(h.title).toLowerCase();
      if (seen.has(key) || seen.has(h.link)) continue;
      seen.add(key);
      seen.add(h.link);
      out.push(h);
    }
  }
  return out;
}

export function appendSources(answer: string, headlines: Headline[], max = 5): string {
  if (!headlines.length) return answer;
  // The model already listed sources: don't double-add.
  if (/^\s*(#{1,6}\s*|\*\*)?sources\b/im.test(answer) || headlines.some((h) => answer.includes(h.link))) return answer;
  const lines = headlines.slice(0, max).map((h) => {
    const meta = [clean(h.source), shortDate(h.date)].filter(Boolean).join(", ");
    return `- [${clean(h.title)}](<${h.link.replace(/[<>\s]/g, "")}>)${meta ? ` — ${meta}` : ""}`;
  });
  return `${answer.trimEnd()}\n\n**Sources**\n${lines.join("\n")}`;
}
