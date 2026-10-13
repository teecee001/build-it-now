// Built-in Exo advisor: deterministic answers from the user's own account data.
// Pure functions (no Deno/network APIs) so they can be unit-tested anywhere.

export const APY_RATE = 6.0; // matches the app's existing "6% APY" savings feature

export type Wallet = { currency: string; balance: number; savings_balance: number };
export type Txn = {
  amount: number;
  currency: string;
  type: string;
  status?: string;
  description?: string | null;
  recipient?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};
export type Bill = { biller_name: string; amount: number; category: string; due_date: string; is_paid: boolean };
export type Holding = { code: string; amount: number };
export type Quote = { price: number; changePct: number };

export type AccountData = {
  name?: string | null;
  wallets: Wallet[];
  transactions: Txn[];
  bills: Bill[];
  crypto: Holding[];
  stocks: Holding[];
  cryptoQuotes: Record<string, Quote>;
  stockQuotes: Record<string, Quote>;
  now?: Date;
};

export type Intent =
  | "greeting"
  | "savings"
  | "spending"
  | "budget"
  | "balance"
  | "bills"
  | "crypto"
  | "stocks"
  | "send"
  | "deposit"
  | "dca"
  | "risk"
  | "longterm"
  | "general";

const DISCLAIMER = "_Not financial advice. Projections are estimates and the APY can change._";

export function money(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function price(n: number): string {
  const digits = n >= 1 ? 2 : n >= 0.01 ? 4 : 8;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function pct(n: number): string {
  const s = (Math.round(n * 100) / 100).toFixed(2);
  return (n >= 0 ? "+" : "") + s + "%";
}

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => new RegExp(`\\b${x}`).test(t));
  if (has("how (do|can|to) .*send", "send money", "transfer", "pay (a|my) friend", "p2p") || (has("send") && has("how"))) return "send";
  if (has("deposit", "add money", "add funds", "top up", "fund my", "load")) return "deposit";
  if (has("dollar.cost", "dca\\b", "averaging")) return "dca";
  if (has("risk", "diversif", "volatil")) return "risk";
  if (has("long.term", "retire", "invest(ing)? for")) return "longterm";
  if (has("saving", "apy", "interest", "grow", "compound", "vault")) return "savings";
  if (has("budget", "save more", "cut back", "50/30/20")) return "budget";
  if (has("bill", "due", "subscription", "rent")) return "bills";
  if (has("spend", "spent", "expense", "where.*money", "categor")) return "spending";
  if (has("crypto", "bitcoin", "btc", "eth", "ethereum", "solana", "sol\\b", "coin", "defi")) return "crypto";
  if (has("stock", "share", "nasdaq", "s&p", "aapl", "tsla", "nvda", "market", "portfolio", "invest")) return "stocks";
  if (has("balance", "how much (do|have)", "net worth", "wallet", "account")) return "balance";
  if (/^\s*(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(t)) return "greeting";
  return "general";
}

const OUTFLOW = new Set(["send", "withdrawal", "purchase", "bill_payment", "conversion"]);
const CATEGORY_LABEL: Record<string, string> = {
  send: "Transfers sent",
  withdrawal: "Withdrawals",
  purchase: "Card purchases",
  bill_payment: "Bills",
  conversion: "Conversions",
};

function usd(w: Wallet[]): Wallet | undefined {
  return w.find((x) => x.currency === "USD") ?? w[0];
}

export function spendingByCategory(txns: Txn[], days = 30, now = new Date()) {
  const since = now.getTime() - days * 86400000;
  const cats: Record<string, number> = {};
  let total = 0;
  let income = 0;
  for (const t of txns) {
    if (t.status && t.status !== "completed") continue;
    if (new Date(t.created_at).getTime() < since) continue;
    if (t.type === "welcome_bonus") continue;
    const amt = Math.abs(Number(t.amount) || 0);
    if (OUTFLOW.has(t.type)) {
      const meta = (t.metadata ?? {}) as Record<string, unknown>;
      const key = (typeof meta.category === "string" && meta.category) || CATEGORY_LABEL[t.type] || t.type;
      cats[key] = (cats[key] ?? 0) + amt;
      total += amt;
    } else if (["deposit", "receive", "interest", "cashback"].includes(t.type)) {
      income += amt;
    }
  }
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  return { total, income, categories: sorted };
}

export function projectSavings(principal: number, monthly = 0, years = 1, apy = APY_RATE): number {
  const r = Math.pow(1 + apy / 100, 1 / 12) - 1;
  let b = principal;
  for (let m = 0; m < years * 12; m++) b = b * (1 + r) + monthly;
  return b;
}

function savingsAnswer(d: AccountData): string {
  const w = usd(d.wallets);
  const s = w?.savings_balance ?? 0;
  const cash = w?.balance ?? 0;
  const lines = [`### Growing your savings at ${APY_RATE}% APY`, ""];
  lines.push(`- **Savings vault:** ${money(s)}`);
  lines.push(`- **Available cash:** ${money(cash)}`);
  lines.push("");
  if (s > 0) {
    lines.push("**If you leave it in place:**");
    lines.push(`- In 1 year: about **${money(projectSavings(s, 0, 1))}** (+${money(projectSavings(s, 0, 1) - s)})`);
    lines.push(`- In 5 years: about **${money(projectSavings(s, 0, 5))}**`);
  }
  const monthly = Math.max(25, Math.round((cash * 0.1) / 5) * 5);
  const y1 = projectSavings(s, monthly, 1);
  lines.push("", `**If you add ${money(monthly)} a month:** about **${money(y1)}** after 1 year and **${money(projectSavings(s, monthly, 5))}** after 5.`);
  lines.push("", "**Tips**", "- Move a fixed amount right after each deposit so saving happens first.", "- Keep 1 to 3 months of expenses in available cash and let the rest earn APY.", "", DISCLAIMER);
  return lines.join("\n");
}

function spendingAnswer(d: AccountData): string {
  const { total, income, categories } = spendingByCategory(d.transactions, 30, d.now);
  if (!categories.length) {
    return `### Your spending (last 30 days)\n\nNo completed spending in the last 30 days.${income ? ` Money in: **${money(income)}**.` : ""}\n\nOnce you pay with your card or send money, Exo will break it down by category here.`;
  }
  const lines = ["### Your spending (last 30 days)", "", `**Total out:** ${money(total)}${income ? ` · **Money in:** ${money(income)}` : ""}`, ""];
  for (const [k, v] of categories.slice(0, 6)) lines.push(`- **${k}:** ${money(v)} (${Math.round((v / total) * 100)}%)`);
  const [top, topAmt] = categories[0];
  lines.push("", `Your biggest category is **${top}** at ${money(topAmt)}. Trimming it by 10% would free up about **${money(topAmt * 0.1)}** a month.`);
  if (income > 0) lines.push(`You kept **${money(income - total)}** of what came in.`);
  return lines.join("\n");
}

function budgetAnswer(d: AccountData): string {
  const { total, income } = spendingByCategory(d.transactions, 30, d.now);
  const base = income > 0 ? income : total;
  const lines = ["### A simple budget (50/30/20)", ""];
  if (base > 0) {
    lines.push(`Based on **${money(base)}** ${income > 0 ? "coming in" : "spent"} over the last 30 days:`);
    lines.push(`- **Needs (50%):** ${money(base * 0.5)}`, `- **Wants (30%):** ${money(base * 0.3)}`, `- **Savings (20%):** ${money(base * 0.2)}`);
    lines.push("", `Putting ${money(base * 0.2)} a month into savings at ${APY_RATE}% APY grows to about **${money(projectSavings(usd(d.wallets)?.savings_balance ?? 0, base * 0.2, 1))}** in a year.`);
    if (income > 0 && total > income) lines.push("", `⚠️ You spent ${money(total - income)} more than came in this month.`);
  } else {
    lines.push("Split your monthly income into **50% needs**, **30% wants** and **20% savings**. Add a deposit and Exo will fill in the numbers.");
  }
  lines.push("", DISCLAIMER);
  return lines.join("\n");
}

function balanceAnswer(d: AccountData): string {
  const lines = [`### Your balances${d.name ? `, ${d.name.split(" ")[0]}` : ""}`, ""];
  if (!d.wallets.length) lines.push("You don't have a wallet yet. Make a deposit to get started.");
  for (const w of d.wallets) {
    lines.push(`- **${w.currency}:** ${money(w.balance, w.currency)} available${w.savings_balance ? ` · ${money(w.savings_balance, w.currency)} in savings` : ""}`);
  }
  let cryptoVal = 0;
  for (const h of d.crypto) cryptoVal += h.amount * (d.cryptoQuotes[h.code]?.price ?? 0);
  let stockVal = 0;
  for (const h of d.stocks) stockVal += h.amount * (d.stockQuotes[h.code]?.price ?? 0);
  if (cryptoVal) lines.push(`- **Crypto:** ${money(cryptoVal)} at live prices`);
  if (stockVal) lines.push(`- **Stocks:** ${money(stockVal)} at live prices`);
  const u = usd(d.wallets);
  if (u) {
    const total = (u.balance ?? 0) + (u.savings_balance ?? 0) + cryptoVal + stockVal;
    lines.push("", `**Total (USD):** ${money(total)}`);
  }
  return lines.join("\n");
}

function billsAnswer(d: AccountData): string {
  const now = d.now ?? new Date();
  const open = d.bills.filter((b) => !b.is_paid).sort((a, b) => a.due_date.localeCompare(b.due_date));
  if (!open.length) return "### Bills\n\nYou have no unpaid bills. 🎉 Add one under **Bills** to get reminders before it's due.";
  const total = open.reduce((s, b) => s + Number(b.amount), 0);
  const lines = ["### Upcoming bills", "", `**${open.length} unpaid** · ${money(total)} total`, ""];
  for (const b of open.slice(0, 6)) {
    const days = Math.ceil((new Date(b.due_date).getTime() - now.getTime()) / 86400000);
    const when = days < 0 ? `**overdue by ${-days}d**` : days === 0 ? "due **today**" : `due in ${days}d`;
    lines.push(`- **${b.biller_name}** (${b.category}): ${money(Number(b.amount))}, ${when}`);
  }
  const cash = usd(d.wallets)?.balance ?? 0;
  lines.push("", cash >= total ? `Your available cash (${money(cash)}) covers all of them.` : `You're ${money(total - cash)} short of covering all of them. Consider a deposit first.`);
  return lines.join("\n");
}

function quotesAnswer(title: string, quotes: Record<string, Quote>, prefer: string[], holdings: Holding[], text: string): string {
  const codes = Object.keys(quotes);
  if (!codes.length) return `### ${title}\n\nLive prices are unavailable right now. Please try again in a minute.`;
  const NAMES: Record<string, string> = { BITCOIN: "BTC", ETHEREUM: "ETH", ETHER: "ETH", SOLANA: "SOL", RIPPLE: "XRP", DOGECOIN: "DOGE", CARDANO: "ADA", APPLE: "AAPL", NVIDIA: "NVDA", MICROSOFT: "MSFT", TESLA: "TSLA", AMAZON: "AMZN", GOOGLE: "GOOGL", META: "META", NETFLIX: "NFLX" };
  let t = text.toUpperCase();
  for (const [n, c] of Object.entries(NAMES)) t = t.replace(new RegExp(`\\b${n}\\b`, "g"), c);
  const asked = codes.filter((c) => new RegExp(`\\b${c.replace(".", "\\.")}\\b`).test(t));
  const show = (asked.length ? asked : prefer.filter((c) => quotes[c])).slice(0, 6);
  const lines = [`### ${title}`, ""];
  for (const c of show) lines.push(`- **${c}:** ${price(quotes[c].price)} (${pct(quotes[c].changePct)} 24h)`);
  const ranked = codes.filter((c) => Number.isFinite(quotes[c].changePct)).sort((a, b) => quotes[b].changePct - quotes[a].changePct);
  if (ranked.length > 2 && !asked.length) {
    const up = ranked[0], dn = ranked[ranked.length - 1];
    lines.push("", `📈 Top mover: **${up}** ${pct(quotes[up].changePct)} · 📉 Biggest drop: **${dn}** ${pct(quotes[dn].changePct)}`);
  }
  const held = holdings.filter((h) => quotes[h.code] && h.amount > 0);
  if (held.length) {
    lines.push("", "**Your holdings**");
    for (const h of held) lines.push(`- ${h.amount} ${h.code} ≈ ${money(h.amount * quotes[h.code].price)}`);
  }
  lines.push("", "_Prices are live from public market data. Not financial advice._");
  return lines.join("\n");
}

const SEND_HOWTO = `### How to send money

1. Tap **Send** on Home.
2. Enter the recipient's **@handle**, email or scan their **QR code**.
3. Type the amount and add a note if you like.
4. Review and confirm. The money arrives instantly, and both of you get a notification.

You'll find every transfer under **Activity**.`;

const DEPOSIT_HOWTO = `### How to add money

1. Tap **Deposit** on Home.
2. Choose the currency and amount.
3. Confirm. Your balance updates right away.

Tip: move part of each deposit into **Savings** to start earning ${APY_RATE}% APY.`;

function dcaAnswer(d: AccountData): string {
  const btc = d.cryptoQuotes.BTC?.price;
  return `### Dollar-cost averaging, simply

You invest the **same amount on a schedule** (say $25 every week) instead of trying to time the market.

- When prices are **high**, your $25 buys a little less.
- When prices are **low**, it buys a little more.
- Over time this smooths out your average entry price and removes the stress of picking the "right" day.
${btc ? `\nExample: at today's BTC price of ${price(btc)}, $25 buys about **${(25 / btc).toFixed(6)} BTC**.\n` : ""}
It doesn't guarantee a profit or protect against losses, but it builds a steady habit.

${DISCLAIMER}`;
}

function riskAnswer(d: AccountData): string {
  const w = usd(d.wallets);
  const cash = (w?.balance ?? 0) + (w?.savings_balance ?? 0);
  let crypto = 0;
  for (const h of d.crypto) crypto += h.amount * (d.cryptoQuotes[h.code]?.price ?? 0);
  let stocks = 0;
  for (const h of d.stocks) stocks += h.amount * (d.stockQuotes[h.code]?.price ?? 0);
  const total = cash + crypto + stocks;
  const lines = ["### Thinking about portfolio risk", ""];
  if (total > 0) {
    const p = (x: number) => Math.round((x / total) * 100);
    lines.push("**Your current mix (USD):**", `- Cash & savings: ${money(cash)} (${p(cash)}%)`, `- Crypto: ${money(crypto)} (${p(crypto)}%)`, `- Stocks: ${money(stocks)} (${p(stocks)}%)`, "");
  }
  lines.push(
    "**Key ideas**",
    "- **Emergency fund first:** keep a few months of expenses in cash or savings.",
    "- **Diversify:** don't let one asset decide your outcome.",
    "- **Match your time horizon:** money you need soon shouldn't sit in volatile assets.",
    "- **Size positions** so a big drop wouldn't force you to sell.",
    "",
    DISCLAIMER,
  );
  return lines.join("\n");
}

function longTermAnswer(d: AccountData): string {
  const s = usd(d.wallets)?.savings_balance ?? 0;
  return `### Key factors for long-term investing

- **Time in the market:** compounding does the heavy lifting over years.
- **Costs:** low fees leave more of your money working.
- **Diversification:** spread risk across assets and sectors.
- **Consistency:** regular contributions (like dollar-cost averaging) beat perfect timing.
- **Emotions:** have a plan so short-term swings don't push you into rash moves.

For reference, ${money(s || 100)} at the app's ${APY_RATE}% APY would be about **${money(projectSavings(s || 100, 0, 10))}** after 10 years if the rate stayed the same.

${DISCLAIMER}`;
}

export function ruleAnswer(question: string, d: AccountData): string {
  const intent = detectIntent(question);
  switch (intent) {
    case "savings": return savingsAnswer(d);
    case "spending": return spendingAnswer(d);
    case "budget": return budgetAnswer(d);
    case "balance": return balanceAnswer(d);
    case "bills": return billsAnswer(d);
    case "crypto": return quotesAnswer("Crypto prices", d.cryptoQuotes, ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"], d.crypto, question);
    case "stocks": return quotesAnswer("Stock prices", d.stockQuotes, ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL"], d.stocks, question);
    case "send": return SEND_HOWTO;
    case "deposit": return DEPOSIT_HOWTO;
    case "dca": return dcaAnswer(d);
    case "risk": return riskAnswer(d);
    case "longterm": return longTermAnswer(d);
    default: {
      const w = usd(d.wallets);
      const hi = intent === "greeting" ? `Hi${d.name ? ` ${d.name.split(" ")[0]}` : ""}! ` : "";
      return `${hi}I'm **Exo**, your money assistant.${w ? ` You have **${money(w.balance)}** available and **${money(w.savings_balance)}** in savings.` : ""}

Try asking me:
- "How can I grow my savings?"
- "Where did my money go this month?"
- "Help me make a budget"
- "What's Bitcoin at today?"
- "Do I have bills due?"
- "How do I send money?"`;
    }
  }
}

/** Compact plain-text summary passed to LLM providers as context. */
export function accountSummary(d: AccountData): string {
  const { total, income, categories } = spendingByCategory(d.transactions, 30, d.now);
  const parts = [
    `User: ${d.name ?? "unknown"}`,
    `Wallets: ${d.wallets.map((w) => `${w.currency} available ${w.balance}, savings ${w.savings_balance}`).join("; ") || "none"}`,
    `Savings APY: ${APY_RATE}%`,
    `Last 30 days: spent ${total.toFixed(2)}, received ${income.toFixed(2)}; by category: ${categories.map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", ") || "none"}`,
    `Unpaid bills: ${d.bills.filter((b) => !b.is_paid).map((b) => `${b.biller_name} ${b.amount} due ${b.due_date}`).join("; ") || "none"}`,
    `Crypto holdings: ${d.crypto.map((h) => `${h.amount} ${h.code}`).join(", ") || "none"}`,
    `Stock holdings: ${d.stocks.map((h) => `${h.amount} ${h.code}`).join(", ") || "none"}`,
    `Live prices: ${["BTC", "ETH", "SOL"].filter((c) => d.cryptoQuotes[c]).map((c) => `${c} ${d.cryptoQuotes[c].price} (${pct(d.cryptoQuotes[c].changePct)})`).join(", ")}`,
  ];
  return parts.join("\n");
}
