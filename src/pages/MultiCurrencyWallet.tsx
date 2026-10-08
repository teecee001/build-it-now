import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CURRENCIES } from "@/constants/currencies";
import { RateAlerts } from "@/components/RateAlerts";
import {
  Plus, ArrowLeftRight, Globe, Loader2, DollarSign, Briefcase
} from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NGN", "KES", "ZAR", "INR", "BRL", "MXN", "CNY", "KRW", "SGD", "HKD", "SEK", "NOK", "DKK", "BTC", "ETH"];

export default function MultiCurrencyWallet() {
  const {
    wallets, isLoading: walletsLoading, addCurrency, convertCurrency,
    maxCurrencies, slotsUsed, slotsRemaining, tier
  } = useMultiCurrencyWallet();
  const { rates, isLive, isLoading: ratesLoading } = useExchangeRates();

  const location = useLocation();
  const [showConvert, setShowConvert] = useState(location.pathname === "/convert");
  useEffect(() => {
    if (location.pathname === "/convert") setShowConvert(true);
  }, [location.pathname]);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");
  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const getCurrencySymbol = (code: string) => {
    const c = CURRENCIES.find(c => c.code === code);
    return c?.symbol || code;
  };

  const getCurrencyName = (code: string) => {
    const c = CURRENCIES.find(c => c.code === code);
    return c?.name || code;
  };

  const totalUSD = wallets.reduce((sum, w) => {
    const rate = rates[w.currency] || 1;
    return sum + (w.balance / rate);
  }, 0);

  const availableToAdd = AVAILABLE_CURRENCIES.filter(
    c => !wallets.find(w => w.currency === c)
  );

  const convRate = fromCurrency && toCurrency
    ? (rates[toCurrency] || 1) / (rates[fromCurrency] || 1)
    : 0;
  const convertedPreview = convertAmount && parseFloat(convertAmount) > 0
    ? parseFloat(convertAmount) * convRate
    : 0;

  const handleAddCurrency = async () => {
    if (!newCurrency) return;
    try {
      await addCurrency.mutateAsync(newCurrency);
      toast.success(`${newCurrency} wallet created`);
      setNewCurrency("");
      setShowAddCurrency(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConvert = async () => {
    const amt = parseFloat(convertAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (fromCurrency === toCurrency) { toast.error("Select different currencies"); return; }
    if (!fromCurrency || !toCurrency) { toast.error("Select currencies"); return; }

    setIsConverting(true);
    try {
      const result = await convertCurrency.mutateAsync({
        fromCurrency,
        toCurrency,
        amount: amt,
        rate: convRate,
      });
      toast.success(`Converted ${amt} ${fromCurrency} → ${result.convertedAmount.toFixed(4)} ${toCurrency}`);
      setConvertAmount("");
      setShowConvert(false);
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  };

  if (walletsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {location.pathname === "/convert" ? "Convert" : "Multi-Currency"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {location.pathname === "/convert"
                ? "Move value between your currency wallets"
                : "Hold, convert and spend in any currency"}
            </p>
          </div>
          <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
            {isLive ? "● Live" : "Demo"}
          </Badge>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-accent" />
            <p className="text-xs text-muted-foreground">Total value (USD)</p>
          </div>
          <p className="text-3xl font-bold font-mono tracking-tight">
            ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {slotsUsed}/{maxCurrencies} currency slots · {tier}
          </p>
        </Card>
      </motion.div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowAddCurrency(!showAddCurrency); setShowConvert(false); }}
          disabled={slotsRemaining <= 0}
          className="gap-1 h-9 flex-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add currency
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowConvert(!showConvert); setShowAddCurrency(false); }}
          disabled={wallets.length < 2}
          className="gap-1 h-9 flex-1"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Convert
        </Button>
      </div>

      {showAddCurrency && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-card border-border space-y-3">
            <h3 className="text-sm font-semibold">Add currency wallet</h3>
            <Select value={newCurrency} onValueChange={setNewCurrency}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map(c => (
                  <SelectItem key={c} value={c}>{c} — {getCurrencyName(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddCurrency} disabled={!newCurrency || addCurrency.isPending} className="w-full">
              {addCurrency.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create wallet"}
            </Button>
          </Card>
        </motion.div>
      )}

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
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => (
                      <SelectItem key={w.currency} value={w.currency}>
                        {w.currency} ({getCurrencySymbol(w.currency)}{w.balance.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.filter(w => w.currency !== fromCurrency).map(w => (
                      <SelectItem key={w.currency} value={w.currency}>
                        {w.currency} ({getCurrencySymbol(w.currency)}{w.balance.toFixed(2)})
                      </SelectItem>
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
            {fromCurrency && (
              <div className="flex gap-2">
                {[0.25, 0.5, 1].map((frac) => {
                  const bal = wallets.find(w => w.currency === fromCurrency)?.balance ?? 0;
                  const label = frac === 1 ? "Max" : frac === 0.5 ? "50%" : "25%";
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setConvertAmount(String(Number((bal * frac).toFixed(4))))}
                      disabled={bal <= 0}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}
            {convertedPreview > 0 && fromCurrency && toCurrency && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 text-center space-y-1">
                <p className="text-xs text-muted-foreground">You convert</p>
                <p className="text-sm font-semibold font-mono text-foreground">
                  {getCurrencySymbol(fromCurrency)}{parseFloat(convertAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {fromCurrency}
                  {" → "}
                  {getCurrencySymbol(toCurrency)}{convertedPreview.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {toCurrency}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Rate: 1 {fromCurrency} = {convRate.toFixed(6)} {toCurrency}
                </p>
              </div>
            )}
            <Button
              onClick={handleConvert}
              disabled={isConverting || !convertAmount || parseFloat(convertAmount) <= 0 || !fromCurrency || !toCurrency}
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Convert <ArrowLeftRight className="w-4 h-4" /></>}
            </Button>
            {wallets.length < 2 && (
              <p className="text-xs text-muted-foreground text-center">
                Add at least two currency wallets to convert between them.
              </p>
            )}
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Wallets</h3>
        {wallets.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No currency wallets yet. Add your first currency above.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {wallets.map((w) => (
              <Card key={w.currency} className="p-4 bg-card border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {getCurrencySymbol(w.currency)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{w.currency}</p>
                    <p className="text-xs text-muted-foreground">{getCurrencyName(w.currency)}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold font-mono">
                  {getCurrencySymbol(w.currency)}{Number(w.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <RateAlerts />
    </div>
  );
}
