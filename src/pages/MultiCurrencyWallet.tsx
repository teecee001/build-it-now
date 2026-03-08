import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@/hooks/useWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useTransactions } from "@/hooks/useTransactions";
import { CURRENCIES } from "@/constants/currencies";
import {
  Wallet, Plus, ArrowLeftRight, Globe, Loader2, TrendingUp, DollarSign
} from "lucide-react";
import { toast } from "sonner";

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "BTC", "ETH"];

export default function MultiCurrencyWallet() {
  const { balance, updateBalance } = useWallet();
  const { rates, isLive, isLoading: ratesLoading } = useExchangeRates();
  const { addTransaction } = useTransactions();

  const [showConvert, setShowConvert] = useState(false);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [convertAmount, setConvertAmount] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  // Multi-currency balances stored locally (non-USD currencies)
  const [currencyBalances, setCurrencyBalances] = useState<Record<string, number>>(() => {
    const balances: Record<string, number> = {};
    POPULAR_CURRENCIES.forEach(c => {
      if (c === "USD") return;
      balances[c] = 0;
    });
    return balances;
  });

  const getBalance = (code: string) => code === "USD" ? balance : (currencyBalances[code] ?? 0);

  const allBalances = [
    { code: "USD", balance: balance, isPrimary: true },
    ...Object.entries(currencyBalances).map(([code, bal]) => ({
      code,
      balance: bal,
      isPrimary: false,
    })),
  ];

  const totalUSD = allBalances.reduce((sum, b) => {
    const rate = rates[b.code] || 1;
    return sum + (b.balance / rate);
  }, 0);

  const convertedPreview = convertAmount && parseFloat(convertAmount) > 0
    ? (parseFloat(convertAmount) / (rates[fromCurrency] || 1)) * (rates[toCurrency] || 1)
    : 0;

  const handleConvert = async () => {
    const amt = parseFloat(convertAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const sourceBalance = getBalance(fromCurrency);
    if (amt > sourceBalance) {
      toast.error(`Insufficient ${fromCurrency} balance`);
      return;
    }

    if (fromCurrency === toCurrency) {
      toast.error("Select different currencies");
      return;
    }

    const usdEquivalent = amt / (rates[fromCurrency] || 1);
    const convertedAmount = (amt / (rates[fromCurrency] || 1)) * (rates[toCurrency] || 1);

    setIsConverting(true);
    try {
      // Deduct from source
      if (fromCurrency === "USD") {
        await updateBalance.mutateAsync({ balance: balance - amt });
      } else {
        setCurrencyBalances(prev => ({ ...prev, [fromCurrency]: prev[fromCurrency] - amt }));
      }

      // Credit to destination
      if (toCurrency === "USD") {
        await updateBalance.mutateAsync({ balance: balance + convertedAmount });
      } else {
        setCurrencyBalances(prev => ({ ...prev, [toCurrency]: (prev[toCurrency] ?? 0) + convertedAmount }));
      }

      await addTransaction.mutateAsync({
        type: "conversion",
        amount: -usdEquivalent,
        description: `Converted ${amt.toFixed(2)} ${fromCurrency} → ${convertedAmount.toFixed(4)} ${toCurrency}`,
        metadata: { from: fromCurrency, to: toCurrency, from_amount: amt, to_amount: convertedAmount },
      });
      toast.success(`Converted ${amt} ${fromCurrency} to ${convertedAmount.toFixed(4)} ${toCurrency}`);
      setConvertAmount("");
      setShowConvert(false);
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  };

  const getCurrencySymbol = (code: string) => {
    const c = CURRENCIES.find(c => c.code === code);
    return c?.symbol || code;
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Multi-Currency</h1>
            <p className="text-muted-foreground text-sm mt-1">Hold and convert between currencies</p>
          </div>
          <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
            {isLive ? "● Live" : "Demo"}
          </Badge>
        </div>
      </motion.div>

      {/* Total Value */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
          </div>
          <p className="text-3xl font-bold font-mono">${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{allBalances.filter(b => b.balance > 0).length} active currencies</p>
        </Card>
      </motion.div>

      {/* Currency Balances */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Balances</h3>
          <Button size="sm" variant="outline" onClick={() => setShowConvert(!showConvert)} className="gap-1 h-8">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Convert
          </Button>
        </div>
        <div className="space-y-2">
          {allBalances.map((b, i) => {
            const usdValue = b.balance / (rates[b.code] || 1);
            const currInfo = CURRENCIES.find(c => c.code === b.code);
            return (
              <Card key={b.code} className={`p-4 bg-card border-border ${b.isPrimary ? "ring-1 ring-accent/20" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {getCurrencySymbol(b.code)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{b.code}</p>
                        {b.isPrimary && (
                          <Badge className="bg-accent/10 text-accent border-0 text-[10px]">Primary</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{currInfo?.name || b.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono">
                      {getCurrencySymbol(b.code)}{b.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: b.code === "BTC" || b.code === "ETH" ? 6 : 2 })}
                    </p>
                    {b.code !== "USD" && b.balance > 0 && (
                      <p className="text-xs text-muted-foreground">≈ ${usdValue.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Convert Panel */}
      {showConvert && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-card border-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-accent" /> Convert Currency
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Amount"
                value={convertAmount}
                onChange={e => setConvertAmount(e.target.value)}
                className="pl-9 text-lg font-mono bg-secondary border-border"
              />
            </div>
            {convertedPreview > 0 && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 text-center">
                <p className="text-xs text-muted-foreground">You'll receive approximately</p>
                <p className="text-xl font-bold font-mono text-accent">
                  {getCurrencySymbol(toCurrency)}{convertedPreview.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {toCurrency}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Rate: 1 {fromCurrency} = {((rates[toCurrency] || 1) / (rates[fromCurrency] || 1)).toFixed(6)} {toCurrency}
                </p>
              </div>
            )}
            <Button
              onClick={handleConvert}
              disabled={isConverting || !convertAmount || parseFloat(convertAmount) <= 0}
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Convert <ArrowLeftRight className="w-4 h-4" /></>}
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Exchange Rates */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Rates (vs USD)</h3>
        <div className="grid grid-cols-2 gap-2">
          {POPULAR_CURRENCIES.filter(c => c !== "USD").map(code => {
            const rate = rates[code] || 0;
            const usdPrice = rate > 0 ? (1 / rate) : 0;
            return (
              <Card key={code} className="p-3 bg-card border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{code}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {rate > 1 ? rate.toFixed(2) : `$${usdPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
