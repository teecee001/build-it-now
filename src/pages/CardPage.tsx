import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCard, CardData } from "@/hooks/useCard";
import { useAccountTier, TIER_CONFIG, AccountTierType } from "@/hooks/useAccountTier";
import {
  CreditCard, Lock, Globe, Percent, Eye, EyeOff,
  Snowflake, Settings, Copy, CheckCircle2, Loader2,
  ArrowLeft, ShieldCheck, Smartphone, MapPin, ShoppingBag,
  Fuel, Utensils, Plane, DollarSign, AlertTriangle,
  Plus, Wifi, Package, Truck, Crown, Fingerprint, ScanFace, KeyRound,
  Brain, ShieldAlert, RefreshCw, LockKeyhole
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSecureVerification } from "@/hooks/useSecureVerification";
import { FaceScanner } from "@/components/FaceScanner";

type View = "list" | "detail" | "settings" | "add" | "tiers";

export default function CardPage() {
  const { user } = useAuth();
  const { cards, isLoading, toggleFreeze, addCard, updateCardName } = useCard();
  const { tier, config, limits } = useAccountTier();
  const [view, setView] = useState<View>("list");
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [newCardFormat, setNewCardFormat] = useState<"virtual" | "physical">("virtual");
  const [newCardName, setNewCardName] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [verifyMode, setVerifyMode] = useState<"face" | "password">("face");
  const [faceVerified, setFaceVerified] = useState(false);
  const handle = "@" + (user?.email?.split("@")[0] || "user");
  const verification = useSecureVerification();

  // Settings state
  const [onlinePurchases, setOnlinePurchases] = useState(true);
  const [internationalTx, setInternationalTx] = useState(true);
  const [contactless, setContactless] = useState(true);
  const [atmWithdrawals, setAtmWithdrawals] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openDetail = async (c: CardData) => {
    setSelectedCard(c);
    setShowNumber(false);
    setPasswordInput("");
    setVerifyMode("face");
    setFaceVerified(false);
    verification.reset();
    setView("detail");
  };
  const openSettings = (c: CardData) => { setSelectedCard(c); setView("settings"); };

  const tierColors: Record<AccountTierType, string> = {
    personal: "text-muted-foreground",
    pro: "text-warning",
    business: "text-accent",
    bank: "text-primary",
  };

  /* ─── Card Visual ─── */
  const CardVisual = ({ c, compact = false }: { c: CardData; compact?: boolean }) => {
    const expiry = `${String(c.expiry_month).padStart(2, "0")}/${String(c.expiry_year).slice(-2)}`;
    const isVirtual = c.card_format === "virtual";
    return (
      <div
        className={`relative rounded-2xl p-${compact ? "4" : "6"} overflow-hidden ${compact ? "aspect-[2/1]" : "aspect-[1.586/1]"} flex flex-col justify-between ${c.is_frozen ? "opacity-60" : ""}`}
        style={{
          background: isVirtual
            ? "linear-gradient(135deg, hsl(240 6% 14%), hsl(240 6% 8%))"
            : "linear-gradient(135deg, hsl(240 6% 12%), hsl(240 6% 6%))",
          border: `1px solid hsl(240 4% ${isVirtual ? "22" : "20"}%)`,
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: isVirtual
            ? "radial-gradient(circle at 30% 70%, hsl(220 80% 55% / 0.3), transparent 50%)"
            : "radial-gradient(circle at 20% 80%, hsl(142 71% 45% / 0.3), transparent 50%), radial-gradient(circle at 80% 20%, hsl(0 0% 100% / 0.1), transparent 50%)",
        }} />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-accent flex items-center justify-center font-bold text-[8px] text-primary-foreground">X</div>
            <span className="text-xs font-bold tracking-wider text-foreground/80">MONEY</span>
          </div>
          <div className="flex items-center gap-1">
            {c.is_frozen && <Snowflake className="w-3 h-3 text-blue-400" />}
            {isVirtual ? (
              <Badge className="bg-blue-500/10 text-blue-400 border-0 text-[9px] px-1.5 py-0">VIRTUAL</Badge>
            ) : (
              <span className="text-[9px] font-medium text-foreground/50">METAL</span>
            )}
          </div>
        </div>

        {!compact && (
          <div className="relative">
            {isVirtual ? (
              <Wifi className="w-7 h-7 text-foreground/20 rotate-90" />
            ) : (
              <div className="w-9 h-6 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40 border border-yellow-700/30" />
            )}
          </div>
        )}

        <div className="relative space-y-2">
          <p className={`${compact ? "text-sm" : "text-lg"} font-mono tracking-[0.15em] text-foreground/90`}>
            •••• {c.card_number_last4}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] text-foreground/40">{c.card_name || (isVirtual ? "Virtual" : "Physical")}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-foreground/80">{expiry}</p>
            </div>
            <span className="text-sm font-bold italic tracking-tighter text-foreground/60">VISA</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {/* ─── CARD LIST VIEW ─── */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Cards</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage your virtual & physical cards</p>
              </div>
              <button onClick={() => setView("tiers")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                <Crown className={`w-3.5 h-3.5 ${tierColors[tier]}`} />
                <span className={`text-xs font-semibold ${tierColors[tier]}`}>{config.label}</span>
              </button>
            </div>

            {/* Tier Limits Summary */}
            <Card className="p-4 bg-card border-border">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Per Transaction</p>
                  <p className="text-sm font-bold font-mono">${limits.single.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily Limit</p>
                  <p className="text-sm font-bold font-mono">${limits.daily.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly</p>
                  <p className="text-sm font-bold font-mono">${limits.monthly.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            {/* Cards */}
            <div className="space-y-3">
              {cards.map((c) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="cursor-pointer" onClick={() => openDetail(c)}>
                    <CardVisual c={c} compact />
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{c.card_name || "Card"}</p>
                      {c.is_frozen && <Badge className="bg-blue-500/10 text-blue-400 border-0 text-[10px]">Frozen</Badge>}
                      {c.card_format === "physical" && c.shipping_status && (
                        <Badge className="bg-warning/10 text-warning border-0 text-[10px] gap-1">
                          <Truck className="w-3 h-3" /> {c.shipping_status}
                        </Badge>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); openSettings(c); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add Card */}
            {cards.length < limits.maxCards && (
              <Button
                variant="outline"
                onClick={() => setView("add")}
                className="w-full border-dashed gap-2"
              >
                <Plus className="w-4 h-4" /> Add New Card
              </Button>
            )}
            {cards.length >= limits.maxCards && (
              <p className="text-xs text-muted-foreground text-center">
                Max {limits.maxCards} cards on {config.label} tier.{" "}
                <button onClick={() => setView("tiers")} className="text-accent underline">Upgrade</button>
              </p>
            )}
          </motion.div>
        )}

        {/* ─── CARD DETAIL VIEW ─── */}
        {view === "detail" && selectedCard && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { setView("list"); setShowNumber(false); setFaceVerified(false); verification.reset(); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{selectedCard.card_name || "Card"}</h1>
                <p className="text-muted-foreground text-sm">•••• {selectedCard.card_number_last4}</p>
              </div>
            </div>

            <CardVisual c={selectedCard} />

            {/* Face ID / Password Verification Gate */}
            {!faceVerified && !verification.isVerified ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <Card className="p-6 bg-card border-border text-center space-y-4">
                  {/* Face ID Mode */}
                  {verifyMode === "face" && (
                    <FaceScanner
                      onVerified={() => {
                        setFaceVerified(true);
                        toast.success("Face verified successfully");
                      }}
                      onFailed={(err) => toast.error(err)}
                      onCancel={() => setVerifyMode("password")}
                    />
                  )}

                  {/* Password Mode */}
                  {verifyMode === "password" && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
                        <LockKeyhole className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Enter Your Password</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Re-enter your account password to access card details.
                        </p>
                      </div>
                      <Input
                        type="password"
                        placeholder="Your account password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && passwordInput) {
                            const ok = await verification.verifyPassword(passwordInput);
                            if (ok) toast.success("Identity verified");
                            else toast.error("Incorrect password");
                            setPasswordInput("");
                          }
                        }}
                        className="bg-secondary border-border"
                      />
                      <Button
                        onClick={async () => {
                          if (!passwordInput) return;
                          const ok = await verification.verifyPassword(passwordInput);
                          if (ok) toast.success("Identity verified");
                          else toast.error("Incorrect password");
                          setPasswordInput("");
                        }}
                        disabled={!passwordInput}
                        className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
                      >
                        <LockKeyhole className="w-4 h-4" /> Verify
                      </Button>
                      <button
                        onClick={() => setVerifyMode("face")}
                        className="text-xs text-accent hover:underline"
                      >
                        ← Use Face ID instead
                      </button>
                    </>
                  )}
                </Card>

                <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                  <ScanFace className="w-3 h-3" /> Secured by Face ID verification
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Verified badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium text-accent">Identity Verified · {verification.methodLabel}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => {
                    navigator.clipboard.writeText(selectedCard.card_number_last4);
                    toast.success("Last 4 copied");
                  }}>
                    <Copy className="w-4 h-4" />
                    <span className="text-[10px]">Copy</span>
                  </Button>
                  <Button
                    variant={selectedCard.is_frozen ? "default" : "outline"}
                    className={`flex-col h-auto py-3 gap-1 ${selectedCard.is_frozen ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" : ""}`}
                    onClick={() => {
                      toggleFreeze.mutate(selectedCard.id);
                      toast.success(selectedCard.is_frozen ? "Card unfrozen" : "Card frozen");
                    }}
                  >
                    <Snowflake className="w-4 h-4" />
                    <span className="text-[10px]">{selectedCard.is_frozen ? "Unfreeze" : "Freeze"}</span>
                  </Button>
                  <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => openSettings(selectedCard)}>
                    <Settings className="w-4 h-4" />
                    <span className="text-[10px]">Settings</span>
                  </Button>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  {[
                    { icon: Percent, title: "Up to 3% Cashback", desc: "On dining, shopping & travel", color: "text-warning" },
                    { icon: Globe, title: "Zero Foreign Fees", desc: "Use worldwide", color: "text-accent" },
                    { icon: Lock, title: "Advanced Security", desc: "Real-time fraud protection", color: "text-primary" },
                  ].map((b, i) => (
                    <Card key={i} className="p-3 bg-card border-border flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <b.icon className={`w-3.5 h-3.5 ${b.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{b.title}</p>
                        <p className="text-xs text-muted-foreground">{b.desc}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── SETTINGS VIEW ─── */}
        {view === "settings" && selectedCard && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("detail")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Card Settings</h1>
                <p className="text-muted-foreground text-sm">•••• {selectedCard.card_number_last4} · {selectedCard.card_format}</p>
              </div>
            </div>

            {/* Controls */}
            <Card className="p-5 bg-card border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold">Transaction Controls</h3>
              </div>
              {[
                { icon: Globe, label: "Online Purchases", state: onlinePurchases, toggle: setOnlinePurchases },
                { icon: MapPin, label: "International", state: internationalTx, toggle: setInternationalTx },
                { icon: Smartphone, label: "Contactless", state: contactless, toggle: setContactless },
                { icon: DollarSign, label: "ATM Withdrawals", state: atmWithdrawals, toggle: setAtmWithdrawals },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <c.icon className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{c.label}</p>
                  </div>
                  <Switch checked={c.state} onCheckedChange={c.toggle} />
                </div>
              ))}
            </Card>

            <Card className="p-5 bg-card border-border space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold">Alerts</h3>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium">Transaction Alerts</p>
                <Switch checked={txAlerts} onCheckedChange={setTxAlerts} />
              </div>
            </Card>

            <div className="space-y-2">
              <Button onClick={() => { toast.success("Settings saved"); setView("detail"); }} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
                <CheckCircle2 className="w-4 h-4" /> Save Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => { toggleFreeze.mutate(selectedCard.id); toast.success(selectedCard.is_frozen ? "Unfrozen" : "Frozen"); }}
                className={`w-full gap-2 ${selectedCard.is_frozen ? "border-blue-500/30 text-blue-400" : "border-destructive/20 text-destructive"}`}
              >
                <Snowflake className="w-4 h-4" /> {selectedCard.is_frozen ? "Unfreeze" : "Freeze"} Card
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── ADD CARD VIEW ─── */}
        {view === "add" && (
          <motion.div key="add" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("list")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold tracking-tight">Add Card</h1>
            </div>

            {/* Card Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewCardFormat("virtual")}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  newCardFormat === "virtual" ? "border-accent bg-accent/5" : "border-border bg-card"
                }`}
              >
                <Wifi className="w-8 h-8 text-blue-400 mb-3" />
                <p className="text-sm font-bold">Virtual Card</p>
                <p className="text-xs text-muted-foreground mt-1">Instant. Use online & mobile wallets.</p>
              </button>
              <button
                onClick={() => setNewCardFormat("physical")}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  newCardFormat === "physical" ? "border-accent bg-accent/5" : "border-border bg-card"
                }`}
              >
                <CreditCard className="w-8 h-8 text-foreground/70 mb-3" />
                <p className="text-sm font-bold">Physical Card</p>
                <p className="text-xs text-muted-foreground mt-1">Premium metal. Ships in 5-7 days.</p>
              </button>
            </div>

            <Card className="p-5 bg-card border-border space-y-3">
              <label className="text-xs text-muted-foreground">Card Name</label>
              <Input
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder={newCardFormat === "virtual" ? "e.g. Online Shopping" : "e.g. Main Card"}
                className="bg-secondary border-border"
              />
            </Card>

            {newCardFormat === "physical" && (
              <Card className="p-4 bg-warning/5 border-warning/10 flex items-start gap-2">
                <Package className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  Physical cards are shipped via express mail. You'll receive tracking information once shipped.
                </p>
              </Card>
            )}

            <Button
              onClick={async () => {
                await addCard.mutateAsync({ format: newCardFormat, name: newCardName || undefined });
                setNewCardName("");
                setView("list");
              }}
              disabled={addCard.isPending}
              className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
            >
              {addCard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>{newCardFormat === "virtual" ? <Wifi className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />} Create {newCardFormat === "virtual" ? "Virtual" : "Physical"} Card</>
              )}
            </Button>
          </motion.div>
        )}

        {/* ─── TIERS VIEW ─── */}
        {view === "tiers" && (
          <motion.div key="tiers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("list")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Account Tiers</h1>
                <p className="text-muted-foreground text-sm">Higher tiers unlock greater limits</p>
              </div>
            </div>

            <div className="space-y-3">
              {(Object.entries(TIER_CONFIG) as [AccountTierType, typeof TIER_CONFIG[AccountTierType]][]).map(([key, t]) => {
                const isCurrent = key === tier;
                return (
                  <Card key={key} className={`p-5 bg-card border-border relative overflow-hidden ${isCurrent ? "border-accent/30" : ""}`}>
                    {isCurrent && <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />}
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className={`w-5 h-5 ${t.color}`} />
                          <h3 className="text-base font-bold">{t.label}</h3>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-accent/10 text-accent border-0 text-xs">Current</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground">Per Transaction</p>
                          <p className="font-mono font-semibold">${t.single.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground">Daily</p>
                          <p className="font-mono font-semibold">${t.daily.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground">Monthly</p>
                          <p className="font-mono font-semibold">${t.monthly.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground">Max Cards</p>
                          <p className="font-mono font-semibold">{t.maxCards}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {t.features.map((f) => (
                          <div key={f} className="flex items-center gap-2">
                            <CheckCircle2 className={`w-3 h-3 ${isCurrent ? "text-accent" : "text-muted-foreground"}`} />
                            <span className="text-xs">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
