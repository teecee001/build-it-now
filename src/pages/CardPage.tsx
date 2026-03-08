import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCard } from "@/hooks/useCard";
import { 
  CreditCard, Lock, Globe, Percent, Eye, EyeOff, 
  Snowflake, Settings, Copy, CheckCircle2, Loader2,
  ArrowLeft, ShieldCheck, Smartphone, MapPin, ShoppingBag,
  Fuel, Utensils, Plane, DollarSign, AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CardPage() {
  const { user } = useAuth();
  const { card, isLoading, toggleFreeze } = useCard();
  const [showNumber, setShowNumber] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  // Card settings state (local — production would persist to DB)
  const [dailyLimit, setDailyLimit] = useState("2500");
  const [atmLimit, setAtmLimit] = useState("500");
  const [onlinePurchases, setOnlinePurchases] = useState(true);
  const [internationalTx, setInternationalTx] = useState(true);
  const [contactless, setContactless] = useState(true);
  const [atmWithdrawals, setAtmWithdrawals] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);
  const [declineAlerts, setDeclineAlerts] = useState(true);
  const [merchantCategories, setMerchantCategories] = useState({
    dining: true,
    travel: true,
    gas: true,
    shopping: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <CreditCard className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">No Card Yet</h2>
        <p className="text-muted-foreground text-center">Your X Money metal card is being prepared.</p>
      </div>
    );
  }

  const expiry = `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`;
  const maskedNumber = `•••• •••• •••• ${card.card_number_last4}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    toast.success(`${label} copied`);
  };

  const handleSaveSettings = () => {
    toast.success("Card settings saved");
    setShowSettings(false);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {showSettings ? (
          /* Card Settings Panel */
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Card Settings</h1>
                <p className="text-muted-foreground text-sm">
                  •••• {card.card_number_last4} · {card.card_type}
                </p>
              </div>
            </div>

            {/* Spending Limits */}
            <Card className="p-5 bg-card border-border space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold">Spending Limits</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Daily Transaction Limit</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                    <Input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="pl-7 bg-secondary border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ATM Withdrawal Limit (per day)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">$</span>
                    <Input
                      type="number"
                      value={atmLimit}
                      onChange={(e) => setAtmLimit(e.target.value)}
                      className="pl-7 bg-secondary border-border font-mono"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Transaction Controls */}
            <Card className="p-5 bg-card border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold">Transaction Controls</h3>
              </div>

              {[
                { icon: Globe, label: "Online Purchases", desc: "Allow card-not-present transactions", state: onlinePurchases, toggle: setOnlinePurchases },
                { icon: MapPin, label: "International Transactions", desc: "Allow purchases outside your country", state: internationalTx, toggle: setInternationalTx },
                { icon: Smartphone, label: "Contactless Payments", desc: "Apple Pay, Google Pay, tap-to-pay", state: contactless, toggle: setContactless },
                { icon: DollarSign, label: "ATM Withdrawals", desc: "Allow cash withdrawals at ATMs", state: atmWithdrawals, toggle: setAtmWithdrawals },
              ].map((control) => (
                <div key={control.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <control.icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{control.label}</p>
                      <p className="text-xs text-muted-foreground">{control.desc}</p>
                    </div>
                  </div>
                  <Switch checked={control.state} onCheckedChange={control.toggle} />
                </div>
              ))}
            </Card>

            {/* Merchant Categories */}
            <Card className="p-5 bg-card border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Allowed Categories</h3>
              </div>
              <p className="text-xs text-muted-foreground">Block transactions from specific merchant types</p>

              {[
                { key: "dining" as const, icon: Utensils, label: "Dining & Restaurants" },
                { key: "travel" as const, icon: Plane, label: "Travel & Airlines" },
                { key: "gas" as const, icon: Fuel, label: "Gas & Fuel" },
                { key: "shopping" as const, icon: ShoppingBag, label: "Retail & Shopping" },
              ].map((cat) => (
                <div key={cat.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <cat.icon className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{cat.label}</p>
                  </div>
                  <Switch
                    checked={merchantCategories[cat.key]}
                    onCheckedChange={(v) => setMerchantCategories((prev) => ({ ...prev, [cat.key]: v }))}
                  />
                </div>
              ))}
            </Card>

            {/* Notification Preferences */}
            <Card className="p-5 bg-card border-border space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold">Card Alerts</h3>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium">Transaction Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified for every purchase</p>
                </div>
                <Switch checked={txAlerts} onCheckedChange={setTxAlerts} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium">Decline Alerts</p>
                  <p className="text-xs text-muted-foreground">Alert when a transaction is declined</p>
                </div>
                <Switch checked={declineAlerts} onCheckedChange={setDeclineAlerts} />
              </div>
            </Card>

            {/* Save / Freeze */}
            <div className="space-y-2">
              <Button
                onClick={handleSaveSettings}
                className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  toggleFreeze.mutate();
                  toast.success(card.is_frozen ? "Card unfrozen" : "Card frozen");
                }}
                className={`w-full gap-2 ${card.is_frozen ? "border-blue-500/30 text-blue-400" : "border-destructive/20 text-destructive"}`}
              >
                <Snowflake className="w-4 h-4" />
                {card.is_frozen ? "Unfreeze Card" : "Freeze Card"}
              </Button>
            </div>
          </motion.div>
        ) : (
          /* Main Card View */
          <motion.div
            key="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight">Debit Card</h1>
              <p className="text-muted-foreground text-sm mt-1">Your X Money metal card by Visa</p>
            </motion.div>

            {/* Card Visual */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className={`relative rounded-2xl p-6 overflow-hidden aspect-[1.586/1] flex flex-col justify-between ${
                card.is_frozen ? "opacity-60" : ""
              }`} style={{
                background: "linear-gradient(135deg, hsl(240 6% 12%), hsl(240 6% 6%))",
                border: "1px solid hsl(240 4% 20%)",
              }}>
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: "radial-gradient(circle at 20% 80%, hsl(142 71% 45% / 0.3), transparent 50%), radial-gradient(circle at 80% 20%, hsl(0 0% 100% / 0.1), transparent 50%)",
                }} />
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-accent flex items-center justify-center font-bold text-[10px] text-primary-foreground">
                      X
                    </div>
                    <span className="text-sm font-bold tracking-wider text-foreground/80">MONEY</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {card.is_frozen && <Snowflake className="w-4 h-4 text-blue-400" />}
                    <span className="text-xs font-medium text-foreground/50">METAL</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40 border border-yellow-700/30" />
                </div>

                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-mono tracking-[0.15em] text-foreground/90">
                      {showNumber ? `•••• •••• •••• ${card.card_number_last4}` : maskedNumber}
                    </p>
                    <button onClick={() => setShowNumber(!showNumber)} className="p-1">
                      {showNumber ? <EyeOff className="w-3.5 h-3.5 text-foreground/40" /> : <Eye className="w-3.5 h-3.5 text-foreground/40" />}
                    </button>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-foreground/40 uppercase">Handle</p>
                      <p className="text-sm font-semibold text-foreground/80">{handle}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/40 uppercase">Expires</p>
                      <p className="text-sm font-mono text-foreground/80">{expiry}</p>
                    </div>
                    <span className="text-xl font-bold italic tracking-tighter text-foreground/60">VISA</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card Actions */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex-col h-auto py-3 gap-1"
                onClick={() => copyToClipboard(card.card_number_last4, "Last 4 digits")}
              >
                <Copy className="w-4 h-4" />
                <span className="text-[10px]">Copy Number</span>
              </Button>
              <Button
                variant={card.is_frozen ? "default" : "outline"}
                className={`flex-col h-auto py-3 gap-1 ${card.is_frozen ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" : ""}`}
                onClick={() => {
                  toggleFreeze.mutate();
                  toast.success(card.is_frozen ? "Card unfrozen" : "Card frozen");
                }}
              >
                <Snowflake className="w-4 h-4" />
                <span className="text-[10px]">{card.is_frozen ? "Unfreeze" : "Freeze"}</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 gap-1"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
                <span className="text-[10px]">Settings</span>
              </Button>
            </motion.div>

            {/* Card Benefits */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Card Benefits</h3>
              <div className="space-y-2">
                {[
                  { icon: Percent, title: "Up to 3% Cashback", desc: "On dining, shopping & travel", color: "text-warning" },
                  { icon: Globe, title: "Zero Foreign Transaction Fees", desc: "Use worldwide with no extra charges", color: "text-accent" },
                  { icon: Lock, title: "Advanced Security", desc: "Real-time fraud protection & instant freeze", color: "text-primary" },
                  { icon: CreditCard, title: "Metal Card", desc: "Premium metal card with your X handle", color: "text-foreground" },
                ].map((benefit, i) => (
                  <Card key={i} className="p-4 bg-card border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        <benefit.icon className={`w-4 h-4 ${benefit.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{benefit.title}</p>
                        <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Card Status */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-4 bg-card border-border flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 ${card.is_active ? "text-success" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{card.is_active ? "Card Active" : "Card Inactive"}</p>
                  <p className="text-xs text-muted-foreground">Visa debit · Partnered with X Payments</p>
                </div>
                <Badge className={`${card.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"} border-0 text-xs`}>
                  {card.is_active ? "Active" : "Inactive"}
                </Badge>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
