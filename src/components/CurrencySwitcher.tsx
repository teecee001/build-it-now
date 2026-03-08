import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/constants/currencies";
import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺", CAD: "🇨🇦",
  CHF: "🇨🇭", CNY: "🇨🇳", INR: "🇮🇳", MXN: "🇲🇽", BRL: "🇧🇷", ZAR: "🇿🇦",
  RUB: "🇷🇺", KRW: "🇰🇷", SGD: "🇸🇬", HKD: "🇭🇰", NOK: "🇳🇴", SEK: "🇸🇪",
  DKK: "🇩🇰", NZD: "🇳🇿", TRY: "🇹🇷", PLN: "🇵🇱", THB: "🇹🇭", IDR: "🇮🇩",
  HUF: "🇭🇺", CZK: "🇨🇿", ILS: "🇮🇱", CLP: "🇨🇱", PHP: "🇵🇭", AED: "🇦🇪",
  SAR: "🇸🇦", MYR: "🇲🇾", RON: "🇷🇴", ARS: "🇦🇷", VND: "🇻🇳", BGN: "🇧🇬",
  HRK: "🇭🇷", PEN: "🇵🇪", UAH: "🇺🇦", EGP: "🇪🇬", QAR: "🇶🇦", KWD: "🇰🇼",
  OMR: "🇴🇲", BHD: "🇧🇭", JOD: "🇯🇴", LBP: "🇱🇧", MAD: "🇲🇦", TND: "🇹🇳",
  DZD: "🇩🇿", PKR: "🇵🇰", BDT: "🇧🇩", LKR: "🇱🇰", MMK: "🇲🇲", NPR: "🇳🇵",
  KZT: "🇰🇿", UZS: "🇺🇿", GEL: "🇬🇪", AMD: "🇦🇲", AZN: "🇦🇿", BYN: "🇧🇾",
  KGS: "🇰🇬", TJS: "🇹🇯", TMT: "🇹🇲", IQD: "🇮🇶", IRR: "🇮🇷", AFN: "🇦🇫",
  ISK: "🇮🇸", RSD: "🇷🇸", MKD: "🇲🇰", ALL: "🇦🇱", BAM: "🇧🇦", MDL: "🇲🇩",
  KES: "🇰🇪", GHS: "🇬🇭", NGN: "🇳🇬", TZS: "🇹🇿", UGX: "🇺🇬", ZMW: "🇿🇲",
  BWP: "🇧🇼", MUR: "🇲🇺", NAD: "🇳🇦", SCR: "🇸🇨", ETB: "🇪🇹", AOA: "🇦🇴",
  MZN: "🇲🇿", MWK: "🇲🇼", RWF: "🇷🇼", XAF: "🌍", XOF: "🌍", COP: "🇨🇴",
  VEF: "🇻🇪", UYU: "🇺🇾", PYG: "🇵🇾", BOB: "🇧🇴", CRC: "🇨🇷", GTQ: "🇬🇹",
  HNL: "🇭🇳", NIO: "🇳🇮", PAB: "🇵🇦",
  BTC: "₿", ETH: "⟠", USDT: "₮", BNB: "◆", XRP: "✕", ADA: "♦",
  DOGE: "🐕", SOL: "◎", TRX: "◈", DOT: "●", MATIC: "⬡", LTC: "Ł",
  SHIB: "🐕", AVAX: "🔺", UNI: "🦄", LINK: "⬡", ATOM: "⚛️",
};

const getFlag = (code: string) => CURRENCY_FLAGS[code] || "💱";

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { activeCurrency, setActiveCurrency, wallets } = useActiveCurrency();
  const { convertCurrency } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();
  const [isConverting, setIsConverting] = useState(false);

  const getCurrencyName = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.name || code;
  };

  const handleCurrencySwitch = async (newCurrency: string) => {
    if (newCurrency === activeCurrency) return;

    const fromWallet = wallets.find(w => w.currency === activeCurrency);
    if (!fromWallet || fromWallet.balance <= 0) {
      // No balance to convert, just switch display
      setActiveCurrency(newCurrency);
      return;
    }

    setIsConverting(true);
    try {
      const fromRate = rates[activeCurrency] || 1;
      const toRate = rates[newCurrency] || 1;
      // rate = how many units of toCurrency per 1 unit of fromCurrency
      const conversionRate = toRate / fromRate;

      await convertCurrency.mutateAsync({
        fromCurrency: activeCurrency,
        toCurrency: newCurrency,
        amount: fromWallet.balance,
        rate: conversionRate,
      });

      setActiveCurrency(newCurrency);

      const convertedAmount = fromWallet.balance * conversionRate;
      const toSymbol = CURRENCIES.find(c => c.code === newCurrency)?.symbol || newCurrency;
      toast.success(`Converted to ${newCurrency}`, {
        description: `${toSymbol}${convertedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} now in your ${newCurrency} wallet`,
      });
    } catch (err: any) {
      toast.error("Conversion failed", { description: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  if (wallets.length <= 1) return null;

  return (
    <Select value={activeCurrency} onValueChange={handleCurrencySwitch} disabled={isConverting}>
      <SelectTrigger className={`bg-secondary/50 border-border gap-1.5 ${compact ? "h-8 text-xs w-auto min-w-[90px]" : "h-9 text-sm w-auto min-w-[120px]"}`}>
        {isConverting ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Converting…</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="text-base leading-none">{getFlag(activeCurrency)}</span>
            <span>{activeCurrency}</span>
          </span>
        )}
      </SelectTrigger>
      <SelectContent className="min-w-[200px]">
        {wallets.map(w => (
          <SelectItem key={w.currency} value={w.currency} className="py-2.5">
            <span className="flex items-center gap-2.5">
              <span className="text-lg leading-none">{getFlag(w.currency)}</span>
              <span className="flex flex-col">
                <span className="text-sm font-medium leading-tight">{w.currency}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{getCurrencyName(w.currency)}</span>
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
