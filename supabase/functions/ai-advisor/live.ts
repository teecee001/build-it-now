// Exo live-data tools: free, keyless public sources. Every fetch has a timeout and a
// small in-memory cache (per edge-function instance). Failures degrade to { error }.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
// SEC asks automated clients to identify themselves in the User-Agent.
const SEC_UA = "ExoSky Exo advisor admin@exosky.app";

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  if (cache.size > 200) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function get(url: string, headers: Record<string, string> = {}, timeoutMs = 7000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "unavailable").slice(0, 120);
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- News (Google News RSS search) ----------
const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/<[^>]+>/g, "").trim();

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
/** Bing wraps article links in an apiclick redirect; unwrap to the publisher URL. */
const unwrap = (link: string) => {
  try {
    const u = new URL(link);
    return (u.hostname.endsWith("bing.com") && u.searchParams.get("url")) || link;
  } catch {
    return link;
  }
};

export function parseNewsRss(xml: string, limit: number, defaultSource = "") {
  const items: { title: string; source: string; date: string; link: string }[] = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const tag = (t: string) => decode(new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)</${t}>`, "i").exec(m[1])?.[1] ?? "");
    const link = unwrap(tag("link") || tag("guid"));
    const source = tag("source") || tag("News:Source") || defaultSource || host(link);
    let title = tag("title");
    if (!title || !/^https?:\/\//.test(link)) continue;
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const pub = Date.parse(tag("pubDate"));
    items.push({ title, source, date: Number.isFinite(pub) ? new Date(pub).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "", link });
    if (items.length >= limit) break;
  }
  return items;
}

type Item = ReturnType<typeof parseNewsRss>[number];
const STOP = new Set(["the", "a", "an", "on", "of", "in", "for", "and", "news", "latest", "what", "whats", "is", "about", "today"]);
const terms = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
/** Headlines that mention any query term (stems like "cut"/"cuts" match), newest first. */
export function filterByQuery(items: Item[], q: string) {
  const ts = terms(q);
  const res = ts.map((t) => new RegExp(`\\b${t.replace(/s$/, "")}`, "i"));
  const hit = (i: Item) => res.some((re) => re.test(i.title));
  return (ts.length ? items.filter(hit) : items).sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function rss(url: string, timeoutMs: number, headers: Record<string, string> = { "User-Agent": BROWSER_UA }) {
  // One quick retry on an immediate failure (not after a timeout), within the time limit.
  const t0 = Date.now();
  return await get(url, headers, timeoutMs).catch((e) => {
    const left = timeoutMs - (Date.now() - t0);
    if (left < 2500) throw e;
    return get(url, headers, left);
  }).then((r) => r.text());
}

// Free, keyless feeds, tried in order until one returns headlines.
export const NEWS_SOURCES: { name: string; load: (q: string) => Promise<Item[]> }[] = [
  {
    name: "Google News",
    load: async (q) => parseNewsRss(await rss(`https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:7d")}&hl=en-US&gl=US&ceid=US:en`, 9000), 15),
  },
  {
    name: "Bing News",
    load: async (q) => parseNewsRss(await rss(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&mkt=en-US`, 9000), 15),
  },
  {
    // Topic feeds don't search, so keep only headlines that mention the query.
    name: "CNBC, MarketWatch & Federal Reserve",
    load: async (q) => {
      const feeds: [string, string][] = [
        ["https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", "CNBC"],
        ["https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", "CNBC"],
        ["https://feeds.content.dowjones.io/public/rss/mw_topstories", "MarketWatch"],
        ["https://www.federalreserve.gov/feeds/press_all.xml", "Federal Reserve"],
      ];
      const lists = await Promise.all(feeds.map(([u, src]) => rss(u, 8000).then((x) => parseNewsRss(x, 40, src)).catch(() => [] as Item[])));
      return filterByQuery(lists.flat(), q);
    },
  },
];

export async function getNews(query: string, limit = 8) {
  const q = query.trim().slice(0, 200) || "stock market";
  const n = Math.min(15, Math.max(1, Math.round(limit)));
  const key = `news:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value as Record<string, unknown>;
  // All feeds are fetched in parallel (bounded to ~9s, under the agent's 12s tool cap);
  // the first one in priority order with results wins.
  const settled = await Promise.allSettled(NEWS_SOURCES.map((src) => src.load(q)));
  const failed: string[] = [];
  for (const [i, r] of settled.entries()) {
    const name = NEWS_SOURCES[i].name;
    if (r.status === "rejected") {
      failed.push(`${name}: ${errMsg(r.reason)}`);
      continue;
    }
    const items = r.value.slice(0, n);
    if (!items.length) {
      failed.push(`${name}: no results`);
      continue;
    }
    const value = { query: q, source: name, headlines: items };
    cache.set(key, { at: Date.now(), value }); // only successes are cached
    if (failed.length) console.warn(`get_news used ${name}: ${failed.join("; ")}`);
    return value;
  }
  console.error(`get_news failed: ${failed.join("; ")}`);
  return { query: q, error: "news feeds temporarily unavailable", tried: failed };
}

// ---------- Market sentiment ----------
export async function getMarketSentiment() {
  const [crypto, stocks] = await Promise.all([
    cached("fng:crypto", 30 * 60_000, async () => {
      const j = await (await get("https://api.alternative.me/fng/?limit=8")).json();
      const d = (j?.data ?? []) as { value: string; value_classification: string; timestamp: string }[];
      if (!d.length) throw new Error("empty");
      return {
        source: "alternative.me Crypto Fear & Greed",
        value: Number(d[0].value),
        rating: d[0].value_classification,
        date: new Date(Number(d[0].timestamp) * 1000).toISOString().slice(0, 10),
        yesterday: d[1] ? Number(d[1].value) : null,
        week_ago: d[7] ? Number(d[7].value) : null,
      };
    }).catch((e) => ({ error: `crypto fear & greed unavailable (${errMsg(e)})` })),
    cached("fng:cnn", 30 * 60_000, async () => {
      const j = await (await get("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
        Referer: "https://www.cnn.com/",
        Origin: "https://www.cnn.com",
      })).json();
      const f = j?.fear_and_greed;
      if (!f || typeof f.score !== "number") throw new Error("unexpected format");
      return {
        source: "CNN Fear & Greed (US stocks)",
        value: r2(f.score),
        rating: f.rating,
        date: String(f.timestamp ?? "").slice(0, 10),
        previous_close: r2(f.previous_close),
        week_ago: r2(f.previous_1_week),
        month_ago: r2(f.previous_1_month),
        year_ago: r2(f.previous_1_year),
      };
    }).catch((e) => ({ error: `CNN fear & greed unavailable (${errMsg(e)})` })),
  ]);
  return { crypto_fear_greed: crypto, stock_fear_greed: stocks, scale: "0 = extreme fear, 100 = extreme greed" };
}

// ---------- Macro (FRED CSV, keyless) ----------
export function parseFredCsv(csv: string) {
  const rows = csv.trim().split(/\r?\n/).slice(1).map((l) => l.split(","))
    .filter((r) => r.length >= 2 && r[1] !== "." && r[1] !== "" && Number.isFinite(Number(r[1])))
    .map((r) => ({ date: r[0], value: Number(r[1]) }));
  return rows;
}

async function fred(id: string, start: string) {
  return await cached(`fred:${id}`, 3 * 3600_000, async () =>
    {
      // FRED's CDN rejects spoofed browser UAs over HTTP/2, so use the runtime default; one retry.
      const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${start}`;
      const text = await get(url, {}, 8000).catch(() => get(url, {}, 8000)).then((r) => r.text());
      return parseFredCsv(text);
    });
}

export async function getMacro(now = new Date()) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const recent = iso(new Date(now.getTime() - 45 * 86400000));
  const cpiStart = iso(new Date(now.getTime() - 500 * 86400000));
  const series: [string, string, string][] = [
    ["fed_funds_effective", "DFF", "Effective federal funds rate, %"],
    ["treasury_2y", "DGS2", "2-year Treasury yield, %"],
    ["treasury_10y", "DGS10", "10-year Treasury yield, %"],
    ["mortgage_30y", "MORTGAGE30US", "30-year fixed mortgage average, %"],
    ["unemployment", "UNRATE", "Unemployment rate, %"],
  ];
  const out: Record<string, unknown> = { source: "FRED (St. Louis Fed)" };
  await Promise.all([
    ...series.map(async ([key, id, label]) => {
      try {
        const rows = await fred(id, id === "UNRATE" ? cpiStart : recent);
        const last = rows.at(-1);
        out[key] = last ? { label, value: last.value, date: last.date } : { error: "no data" };
      } catch (e) {
        out[key] = { error: errMsg(e) };
      }
    }),
    (async () => {
      try {
        const rows = await fred("CPIAUCSL", cpiStart);
        const last = rows.at(-1);
        const yearAgo = last && rows.find((r) => r.date.slice(0, 7) === `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4, 7)}`);
        const prev = rows.at(-2);
        out.cpi = last
          ? {
            label: "CPI (all urban consumers, index)",
            index: last.value,
            month: last.date.slice(0, 7),
            yoy_inflation_percent: yearAgo ? r2((last.value / yearAgo.value - 1) * 100) : null,
            mom_change_percent: prev ? r2((last.value / prev.value - 1) * 100) : null,
          }
          : { error: "no data" };
      } catch (e) {
        out.cpi = { error: errMsg(e) };
      }
    })(),
  ]);
  const t2 = out.treasury_2y as { value?: number }, t10 = out.treasury_10y as { value?: number };
  if (typeof t2?.value === "number" && typeof t10?.value === "number") out.spread_10y_minus_2y = r2(t10.value - t2.value);
  return out;
}

// ---------- Company fundamentals (SEC EDGAR XBRL companyfacts) ----------
type Fact = { end: string; val: number; fy?: number; fp?: string; form?: string; frame?: string; start?: string; filed?: string };

async function tickerMap(): Promise<Record<string, { cik: number; title: string }>> {
  return await cached("sec:tickers", 24 * 3600_000, async () => {
    const j = await (await get("https://www.sec.gov/files/company_tickers.json", { "User-Agent": SEC_UA }, 8000)).json();
    const map: Record<string, { cik: number; title: string }> = {};
    for (const v of Object.values(j as Record<string, { cik_str: number; ticker: string; title: string }>)) {
      map[v.ticker.toUpperCase()] = { cik: v.cik_str, title: v.title };
    }
    return map;
  });
}

const CONCEPTS: Record<string, string[]> = {
  revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"],
  net_income: ["NetIncomeLoss", "ProfitLoss"],
  eps_diluted: ["EarningsPerShareDiluted", "EarningsPerShareBasic"],
  operating_income: ["OperatingIncomeLoss"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  long_term_debt: ["LongTermDebt", "LongTermDebtNoncurrent"],
  total_assets: ["Assets"],
  total_liabilities: ["Liabilities"],
  shares_outstanding: ["dei:EntityCommonStockSharesOutstanding", "CommonStockSharesOutstanding"],
};
const DURATION = new Set(["revenue", "net_income", "eps_diluted", "operating_income"]);
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

export function summarizeFacts(facts: Record<string, Record<string, { units: Record<string, Fact[]> }>>) {
  const out: Record<string, unknown> = {};
  for (const [key, names] of Object.entries(CONCEPTS)) {
    let rows: Fact[] | undefined;
    let used = "";
    let latestEnd = "";
    for (const full of names) {
      const [ns, name] = full.includes(":") ? full.split(":") : ["us-gaap", full];
      const units = facts?.[ns]?.[name]?.units;
      const list = units && (units.USD ?? units["USD/shares"] ?? units.shares);
      if (!list?.length) continue;
      const end = list.reduce((m, f) => (f.end > m ? f.end : m), "");
      if (end > latestEnd) {
        latestEnd = end;
        rows = list;
        used = name;
      }
    }
    if (!rows) continue;
    rows = rows.filter((f) => !f.form || /^(10-K|10-Q|20-F|40-F|6-K|8-K)/.test(f.form));
    const dedupe = (fs: Fact[]) => {
      const m = new Map<string, Fact>();
      for (const f of fs) if (!m.has(f.end) || (f.filed ?? "") > (m.get(f.end)!.filed ?? "")) m.set(f.end, f);
      return [...m.values()].sort((a, b) => (a.end < b.end ? 1 : -1));
    };
    if (DURATION.has(key)) {
      const annual = dedupe(rows.filter((f) => f.start && days(f.start, f.end) > 350 && days(f.start, f.end) < 380)).slice(0, 3);
      const quarterly = dedupe(rows.filter((f) => f.start && days(f.start, f.end) > 80 && days(f.start, f.end) < 100)).slice(0, 4);
      out[key] = {
        concept: used,
        annual: annual.map((f) => ({ period_end: f.end, value: f.val, form: f.form })),
        quarterly: quarterly.map((f) => ({ period_end: f.end, value: f.val, form: f.form })),
      };
    } else {
      const latest = dedupe(rows).slice(0, 2);
      out[key] = { concept: used, values: latest.map((f) => ({ as_of: f.end, value: f.val, form: f.form })) };
    }
  }
  return out;
}

export async function getCompanyFundamentals(ticker: string) {
  const t = ticker.trim().toUpperCase().replace(/^\$/, "").replace(".", "-").slice(0, 10);
  try {
    const map = await tickerMap();
    const hit = map[t] ?? map[t.replace("-", ".")];
    if (!hit) return { ticker: t, error: "not an SEC-registered US ticker (ETFs, crypto and many foreign listings have no EDGAR filings)" };
    return await cached(`sec:facts:${hit.cik}`, 12 * 3600_000, async () => {
      const cik = String(hit.cik).padStart(10, "0");
      const j = await (await get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { "User-Agent": SEC_UA }, 10000)).json();
      return { ticker: t, company: hit.title, cik, source: "SEC EDGAR XBRL filings (10-K/10-Q)", units: "USD unless noted; EPS in USD/share; shares in shares", ...summarizeFacts(j?.facts ?? {}) };
    });
  } catch (e) {
    const msg = errMsg(e);
    return { ticker: t, error: msg.includes("404") ? "no XBRL financial statements on EDGAR for this ticker (e.g. ETFs/funds)" : `SEC data unavailable (${msg})` };
  }
}
