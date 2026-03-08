import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/constants/currencies";
import { Globe } from "lucide-react";

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { activeCurrency, setActiveCurrency, wallets } = useActiveCurrency();

  const getCurrencyInfo = (code: string) => {
    const c = CURRENCIES.find(c => c.code === code);
    return { symbol: c?.symbol || code, name: c?.name || code };
  };

  if (wallets.length <= 1) return null;

  return (
    <Select value={activeCurrency} onValueChange={setActiveCurrency}>
      <SelectTrigger className={`bg-secondary/50 border-border gap-1.5 ${compact ? "h-8 text-xs w-auto min-w-[90px]" : "h-9 text-sm w-auto min-w-[120px]"}`}>
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[180px]">
        {wallets.map(w => {
          const info = getCurrencyInfo(w.currency);
          const isActive = w.currency === activeCurrency;
          return (
            <SelectItem key={w.currency} value={w.currency} className="py-2.5">
              <span className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                  {info.symbol.slice(0, 2)}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{w.currency}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{info.name}</span>
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
