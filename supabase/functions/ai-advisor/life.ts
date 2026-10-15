// Exo Life tools: free, keyless. Shopping uses DuckDuckGo's HTML endpoint (best effort) plus
// deterministic store search links; never invents prices. Trip/event planning returns
// calendar-style structured skeletons with Google Maps links.
const UA = "Mozilla/5.0 (compatible; ExoSky/1.0)";
const enc = encodeURIComponent;
export const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${enc(q)}`;

export function storeLinks(q: string) {
  return [
    { store: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${enc(q)}` },
    { store: "Amazon", url: `https://www.amazon.com/s?k=${enc(q)}` },
    { store: "eBay", url: `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}` },
    { store: "DuckDuckGo", url: `https://duckduckgo.com/?q=${enc(q)}&ia=shopping` },
  ];
}

/** Parses DuckDuckGo HTML results (title + url + snippet). Pure, tested with a fixture. */
export function parseDdg(html: string, limit = 6) {
  const out: { title: string; url: string; snippet: string; price: string | null }[] = [];
  const strip = (s = "") => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  const blocks = html.split(/(?=<a[^>]+class="result__a")/).filter((b) => b.includes(`class="result__a"`));
  for (const blk of blocks) {
    if (out.length >= limit) break;
    const a = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(blk);
    if (!a) continue;
    let url = a[1];
    const uddg = /[?&]uddg=([^&]+)/.exec(url);
    if (uddg) url = decodeURIComponent(uddg[1]);
    if (!/^https?:\/\//.test(url) || /duckduckgo\.com\/y\.js/.test(url)) continue;
    const snippet = strip(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(blk)?.[1]);
    // A price is only reported when it literally appears in the listing text.
    const price = /(?:US)?\$\s?\d[\d,]*(?:\.\d{2})?/.exec(`${strip(a[2])} ${snippet}`)?.[0] ?? null;
    out.push({ title: strip(a[2]), url, snippet: snippet.slice(0, 200), price });
  }
  return out;
}

/** Parses a search RSS feed (Bing format=rss): title, link, description. */
export function parseSearchRss(xml: string, limit = 6) {
  const out: ReturnType<typeof parseDdg> = [];
  const tag = (b: string, t: string) => (new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(b)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;|&gt;/g, "").trim();
  for (const item of xml.split("<item>").slice(1)) {
    if (out.length >= limit) break;
    const url = tag(item, "link");
    if (!/^https?:\/\//.test(url)) continue;
    const title = tag(item, "title"), snippet = tag(item, "description").slice(0, 200);
    const price = /(?:US)?\$\s?\d[\d,]*(?:\.\d{2})?/.exec(`${title} ${snippet}`)?.[0] ?? null;
    out.push({ title, url, snippet, price });
  }
  return out;
}

export async function shopSearch(query: string, fetcher: typeof fetch = fetch) {
  const q = query.trim().slice(0, 120);
  if (!q) return { error: "query required" };
  let results: ReturnType<typeof parseDdg> = [];
  let source = "links-only";
  const get = async (url: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetcher(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
      return res.status === 200 ? await res.text() : "";
    } finally {
      clearTimeout(t);
    }
  };
  // Free, keyless sources in order; each failure falls through to store links.
  for (const [name, url, parse] of [
    ["bing", `https://www.bing.com/search?format=rss&q=${enc(q + " buy")}`, parseSearchRss],
    ["duckduckgo", `https://html.duckduckgo.com/html/?q=${enc(q + " buy price")}`, parseDdg],
  ] as const) {
    try {
      results = parse(await get(url));
      if (results.length) { source = name; break; }
    } catch { /* next source */ }
  }
  return {
    query: q, source, results, stores: storeLinks(q),
    note: "Prices only when shown in a listing; otherwise check the store links. Not live inventory.",
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

export function planTrip(p: { destination: string; start_date?: string; days?: number; today: string }) {
  const dest = (p.destination ?? "").trim().slice(0, 80);
  if (!dest) return { error: "destination required" };
  const start = /^\d{4}-\d{2}-\d{2}$/.test(p.start_date ?? "") && p.start_date! >= p.today ? p.start_date! : addDays(p.today, 14);
  const days = Math.min(14, Math.max(1, Math.round(Number(p.days) || 3)));
  const slots = ["Morning", "Afternoon", "Evening"];
  return {
    kind: "trip", destination: dest, start_date: start, end_date: addDays(start, days - 1), map: mapsLink(dest),
    itinerary: Array.from({ length: days }, (_, i) => ({
      date: addDays(start, i), day: i + 1,
      slots: slots.map((s) => ({ time: s, plan: i === 0 && s === "Morning" ? "Arrive & check in" : null })),
    })),
    links: { flights: `https://www.google.com/travel/flights?q=${enc("flights to " + dest)}`, hotels: `https://www.google.com/travel/hotels/${enc(dest)}`, things_to_do: mapsLink(`things to do in ${dest}`) },
    note: "Skeleton plan: fill slots with the user; no bookings are made.",
  };
}

export function planEvent(p: { title: string; date?: string; time?: string; location?: string; today: string }) {
  const title = (p.title ?? "").trim().slice(0, 80);
  if (!title) return { error: "title required" };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date ?? "") && p.date! >= p.today ? p.date! : null;
  const time = /^\d{2}:\d{2}$/.test(p.time ?? "") ? p.time! : null;
  const where = (p.location ?? "").trim().slice(0, 120) || null;
  const stamp = date ? date.replace(/-/g, "") + (time ? `T${time.replace(":", "")}00` : "") : "";
  return {
    kind: "event", title, date, time, location: where, map: where ? mapsLink(where) : null,
    calendar_link: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(title)}${stamp ? `&dates=${stamp}/${stamp}` : ""}${where ? `&location=${enc(where)}` : ""}`,
    checklist: ["Confirm date & time", "Invite people", "Budget", "Reminders"],
    missing: [!date && "date", !time && "time", !where && "location"].filter(Boolean),
  };
}
