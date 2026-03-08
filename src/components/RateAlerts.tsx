import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRateAlerts } from "@/hooks/useRateAlerts";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CURRENCIES } from "@/constants/currencies";
import {
  Bell, Plus, Trash2, TrendingUp, TrendingDown, Loader2, X, Check, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const ALERT_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "BTC", "ETH", "NGN", "KES", "ZAR", "INR", "BRL", "MXN"];

export function RateAlerts() {
  const { activeAlerts, triggeredAlerts, isLoading, createAlert, deleteAlert } = useRateAlerts();
  const { rates } = useExchangeRates();

  const [showCreate, setShowCreate] = useState(false);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [targetRate, setTargetRate] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  const getCurrencySymbol = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol || code;

  const currentRate = fromCurrency && toCurrency
    ? (rates[toCurrency] || 1) / (rates[fromCurrency] || 1)
    : 0;

  const handleCreate = async () => {
    const rate = parseFloat(targetRate);
    if (!rate || rate <= 0) { toast.error("Enter a valid target rate"); return; }
    if (fromCurrency === toCurrency) { toast.error("Select different currencies"); return; }
    try {
      await createAlert.mutateAsync({ from_currency: fromCurrency, to_currency: toCurrency, target_rate: rate, direction });
      toast.success("Rate alert created");
      setTargetRate("");
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rate Alerts</h3>
          {activeAlerts.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{activeAlerts.length} active</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3.5 h-3.5" /> New Alert
        </Button>
      </div>

      {/* Create Alert Panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="p-5 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Create Rate Alert</h4>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-secondary rounded">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_CURRENCIES.map(c => (
                        <SelectItem key={c} value={c}>{getCurrencySymbol(c)} {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_CURRENCIES.filter(c => c !== fromCurrency).map(c => (
                        <SelectItem key={c} value={c}>{getCurrencySymbol(c)} {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current rate reference */}
              <div className="p-2.5 rounded-lg bg-secondary/50 text-center">
                <p className="text-[10px] text-muted-foreground">Current rate</p>
                <p className="text-sm font-mono font-semibold">1 {fromCurrency} = {currentRate.toFixed(6)} {toCurrency}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Alert when rate goes</label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as "above" | "below")}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Above</span>
                      </SelectItem>
                      <SelectItem value="below">
                        <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Below</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Target rate</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder={currentRate.toFixed(4)}
                    value={targetRate}
                    onChange={e => setTargetRate(e.target.value)}
                    className="h-9 bg-secondary border-border font-mono"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={createAlert.isPending || !targetRate}
                className="w-full h-10 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
              >
                {createAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Bell className="w-4 h-4" /> Create Alert</>}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Alerts */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
        <Card className="p-6 bg-card border-border text-center">
          <Bell className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No rate alerts yet. Create one to get notified when rates hit your target.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeAlerts.map(alert => {
            const rate = (rates[alert.to_currency] || 1) / (rates[alert.from_currency] || 1);
            const progress = alert.direction === "above"
              ? Math.min((rate / alert.target_rate) * 100, 100)
              : Math.min((alert.target_rate / rate) * 100, 100);
            return (
              <Card key={alert.id} className="p-3 bg-card border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${alert.direction === "above" ? "bg-success/10" : "bg-warning/10"}`}>
                    {alert.direction === "above"
                      ? <TrendingUp className="w-4 h-4 text-success" />
                      : <TrendingDown className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.from_currency}/{alert.to_currency}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.direction === "above" ? "Above" : "Below"} {alert.target_rate} · Now: {rate.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">{progress.toFixed(0)}%</Badge>
                    <button
                      onClick={() => deleteAlert.mutateAsync(alert.id).then(() => toast.success("Alert deleted"))}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-3">Triggered</p>
              {triggeredAlerts.slice(0, 5).map(alert => (
                <Card key={alert.id} className="p-3 bg-card border-border opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.from_currency}/{alert.to_currency}</p>
                      <p className="text-xs text-muted-foreground">
                        Target {alert.target_rate} {alert.direction === "above" ? "↑" : "↓"} · Triggered
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAlert.mutateAsync(alert.id)}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
