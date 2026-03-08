import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CURRENCIES } from "@/constants/currencies";
import { Loader2, ArrowRight } from "lucide-react";
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
const getSymbol = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol || code;
const getName = (code: string) => CURRENCIES.find(c => c.code === code)?.name || code;

const fmtAmt = (amount: number, code: string) => {
  const sym = getSymbol(code);
  return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { activeCurrency, setActiveCurrency, wallets } = useActiveCurrency();
  const { convertCurrency } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();
  const [isConverting, setIsConverting] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);

  const fromWallet = wallets.find(w => w.currency === activeCurrency);
  const fromBalance = fromWallet?.balance ?? 0;

  const fromRate = rates[activeCurrency] || 1;
  const toRate = pendingCurrency ? (rates[pendingCurrency] || 1) : 1;
  const conversionRate = toRate / fromRate;
  const convertedAmount = fromBalance * conversionRate;

  const handleCurrencySelect = (newCurrency: string) => {
    if (newCurrency === activeCurrency) return;
    if (!fromWallet || fromBalance <= 0) {
      setActiveCurrency(newCurrency);
      return;
    }
    setPendingCurrency(newCurrency);
  };

  const handleConfirm = async () => {
    if (!pendingCurrency) return;
    setIsConverting(true);
    try {
      await convertCurrency.mutateAsync({
        fromCurrency: activeCurrency,
        toCurrency: pendingCurrency,
        amount: fromBalance,
        rate: conversionRate,
      });
      setActiveCurrency(pendingCurrency);
      toast.success(`Switched to ${pendingCurrency}`, {
        description: `${fmtAmt(convertedAmount, pendingCurrency)} now in your ${pendingCurrency} wallet`,
      });
    } catch (err: any) {
      toast.error("Conversion failed", { description: err.message });
    } finally {
      setIsConverting(false);
      setPendingCurrency(null);
    }
  };

  if (wallets.length <= 1) return null;

  return (
    <>
      <Select value={activeCurrency} onValueChange={handleCurrencySelect} disabled={isConverting}>
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
                  <span className="text-[11px] text-muted-foreground leading-tight">{getName(w.currency)}</span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={!!pendingCurrency} onOpenChange={(open) => { if (!open && !isConverting) setPendingCurrency(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch to {pendingCurrency}?</DialogTitle>
            <DialogDescription>
              Your full {activeCurrency} balance will be converted. For partial conversions, use the Multi-Currency page.
            </DialogDescription>
          </DialogHeader>

          {pendingCurrency && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-secondary/60 flex-1">
                  <span className="text-2xl">{getFlag(activeCurrency)}</span>
                  <span className="text-xs font-medium text-muted-foreground">{activeCurrency}</span>
                  <span className="text-sm font-semibold font-mono">{fmtAmt(fromBalance, activeCurrency)}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-accent/10 border border-accent/20 flex-1">
                  <span className="text-2xl">{getFlag(pendingCurrency)}</span>
                  <span className="text-xs font-medium text-muted-foreground">{pendingCurrency}</span>
                  <span className="text-sm font-semibold font-mono text-accent">{fmtAmt(convertedAmount, pendingCurrency)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-secondary/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-mono font-medium">1 {activeCurrency} = {conversionRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {pendingCurrency}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-mono text-success">Free</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPendingCurrency(null)} disabled={isConverting}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isConverting}>
              {isConverting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting…
                </span>
              ) : (
                "Convert All & Switch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
