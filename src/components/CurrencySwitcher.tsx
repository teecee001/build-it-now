import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/constants/currencies";
import { Globe } from "lucide-react";

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { activeCurrency, setActiveCurrency, wallets, formatBalance } = useActiveCurrency();

  const getCurrencySymbol = (code: string) => {
    const c = CURRENCIES.find(c => c.code === code);
    return c?.symbol || code;
  };

  if (wallets.length <= 1) return null;

  return (
    <Select value={activeCurrency} onValueChange={setActiveCurrency}>
      <SelectTrigger className={`bg-secondary/50 border-border gap-1.5 ${compact ? "h-8 text-xs w-auto min-w-[90px]" : "h-9 text-sm w-auto min-w-[120px]"}`}>
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {wallets.map(w => (
          <SelectItem key={w.currency} value={w.currency}>
            <span className="flex items-center gap-2">
              <span className="font-medium">{w.currency}</span>
              <span className="text-muted-foreground text-xs font-mono">
                {getCurrencySymbol(w.currency)}{w.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
