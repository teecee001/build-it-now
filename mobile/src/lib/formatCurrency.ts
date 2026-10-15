/**
 * Display-only currency helpers. These never change stored values; they only
 * decide how a number is shown to the user (2 decimals, thousands separators).
 */

const SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  NGN: "₦",
};

/** Format a number as money with exactly 2 decimals, e.g. 24.9549 -> "$24.95". */
export function formatMoney(value: number, currency = "USD"): string {
  const code = (currency || "USD").toUpperCase();
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const body = Math.abs(safe).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = safe < 0 ? "-" : "";
  const symbol = SYMBOLS[code];
  return symbol ? `${sign}${symbol}${body}` : `${sign}${body} ${code}`;
}

// A number directly followed by a 3-letter currency code, e.g. "24.9549 USD" or "1,234.5 NGN".
// An already-present symbol in front ("$1.00 USD") is consumed so it is not shown twice.
const AMOUNT_WITH_CODE = /(?<![\w.])[$£€₦]?(-?\d[\d,]*(?:\.\d+)?)\s?(USD|GBP|EUR|NGN)\b/g;

/**
 * Re-format "<number> <CODE>" pairs inside free text for display.
 * Text without such pairs is returned unchanged.
 */
export function formatAmountsInText(text: string | null | undefined): string {
  if (!text) return text ?? "";
  return text
    .replace(AMOUNT_WITH_CODE, (match, num: string, code: string) => {
      const value = Number(num.replace(/,/g, ""));
      return Number.isFinite(value) ? formatMoney(value, code) : match;
    })
    // Safety net for rows that were stored with a doubled symbol ("$$1.00").
    .replace(/([$£€₦])\1+(?=\d)/g, "$1");
}
