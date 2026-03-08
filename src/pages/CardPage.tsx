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
  Plus, Wifi, Package, Truck, Crown, KeyRound,
  Timer, Ban, Check, Palette
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type View = "list" | "detail" | "settings" | "add" | "tiers";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const SESSION_TIMEOUT = 5 * 60 * 1000;

// ─── Card Designs ───
const CARD_DESIGNS = [
  {
    id: "classic-dark",
    name: "Classic Dark",
    bg: "linear-gradient(135deg, hsl(240 6% 14%), hsl(240 6% 8%))",
    accent: "radial-gradient(circle at 30% 70%, hsl(220 80% 55% / 0.3), transparent 50%)",
    border: "hsl(240 4% 22%)",
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    bg: "linear-gradient(135deg, hsl(220 50% 15%), hsl(230 60% 8%))",
    accent: "radial-gradient(circle at 70% 30%, hsl(210 90% 50% / 0.4), transparent 60%)",
    border: "hsl(220 40% 25%)",
  },
  {
    id: "emerald",
    name: "Emerald",
    bg: "linear-gradient(135deg, hsl(160 30% 12%), hsl(150 40% 6%))",
    accent: "radial-gradient(circle at 20% 80%, hsl(142 71% 45% / 0.4), transparent 50%), radial-gradient(circle at 80% 20%, hsl(160 60% 40% / 0.2), transparent 50%)",
    border: "hsl(150 30% 20%)",
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    bg: "linear-gradient(135deg, hsl(350 20% 16%), hsl(340 15% 8%))",
    accent: "radial-gradient(circle at 60% 40%, hsl(350 60% 55% / 0.3), transparent 55%)",
    border: "hsl(350 20% 25%)",
  },
  {
    id: "arctic",
    name: "Arctic",
    bg: "linear-gradient(135deg, hsl(200 20% 18%), hsl(210 25% 10%))",
    accent: "radial-gradient(circle at 40% 60%, hsl(195 80% 60% / 0.3), transparent 50%), radial-gradient(circle at 80% 20%, hsl(180 50% 50% / 0.15), transparent 50%)",
    border: "hsl(200 20% 28%)",
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "linear-gradient(135deg, hsl(25 40% 14%), hsl(15 30% 7%))",
    accent: "radial-gradient(circle at 30% 70%, hsl(30 80% 50% / 0.35), transparent 55%), radial-gradient(circle at 80% 30%, hsl(350 60% 50% / 0.2), transparent 50%)",
    border: "hsl(25 30% 22%)",
  },
  {
    id: "purple-haze",
    name: "Purple Haze",
    bg: "linear-gradient(135deg, hsl(270 30% 15%), hsl(280 25% 7%))",
    accent: "radial-gradient(circle at 50% 50%, hsl(270 70% 55% / 0.35), transparent 55%)",
    border: "hsl(270 25% 23%)",
  },
  {
    id: "stealth",
    name: "Stealth",
    bg: "linear-gradient(135deg, hsl(0 0% 10%), hsl(0 0% 4%))",
    accent: "radial-gradient(circle at 50% 50%, hsl(0 0% 30% / 0.15), transparent 60%)",
    border: "hsl(0 0% 16%)",
  },
];

function getCardDesign(designId?: string) {
  return CARD_DESIGNS.find(d => d.id === designId) || CARD_DESIGNS[0];
}

// ─── PIN helpers (per-card) ───
function getCardPinHash(cardId: string): string | null {
  return localStorage.getItem(`card_pin_${cardId}`);
}
function setCardPinHash(cardId: string, pin: string) {
  localStorage.setItem(`card_pin_${cardId}`, simpleHash(pin));
}
function simpleHash(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}
function verifyCardPin(cardId: string, pin: string): boolean {
  const stored = getCardPinHash(cardId);
  if (!stored) return false;
  return simpleHash(pin) === stored;
}

function getLockedUntil(): number | null {
  const raw = localStorage.getItem("card_lockout");
  if (!raw) return null;
  const until = parseInt(raw, 10);
  if (Date.now() >= until) {
    localStorage.removeItem("card_lockout");
    localStorage.removeItem("card_fail_count");
    return null;
  }
  return until;
}
function getFailCount(): number {
  return parseInt(localStorage.getItem("card_fail_count") || "0", 10);
}
function recordFailure(): { locked: boolean; remaining: number } {
  const count = getFailCount() + 1;
  localStorage.setItem("card_fail_count", String(count));
  if (count >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem("card_lockout", String(until));
    return { locked: true, remaining: 0 };
  }
  return { locked: false, remaining: MAX_ATTEMPTS - count };
}
function clearFailures() {
  localStorage.removeItem("card_fail_count");
  localStorage.removeItem("card_lockout");
}

export default function CardPage() {
  const { user } = useAuth();
  const { cards, isLoading, toggleFreeze, addCard, updateCardName } = useCard();
  const { tier, config, limits } = useAccountTier();
  const [view, setView] = useState<View>("list");
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [newCardFormat, setNewCardFormat] = useState<"virtual" | "physical">("virtual");
  const [newCardName, setNewCardName] = useState("");
  const [newCardDesign, setNewCardDesign] = useState(CARD_DESIGNS[0].id);
  const [newCardPin, setNewCardPin] = useState("");
  const [newCardPinConfirm, setNewCardPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  // PIN verification state
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinVerifyError, setPinVerifyError] = useState("");

  // Attempt limiting
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);

  // Session timeout
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);

  // Settings state
  const [onlinePurchases, setOnlinePurchases] = useState(true);
  const [internationalTx, setInternationalTx] = useState(true);
  const [contactless, setContactless] = useState(true);
  const [atmWithdrawals, setAtmWithdrawals] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);

  // Add card creation step
  const [addStep, setAddStep] = useState<"format" | "design" | "pin">("format");

  useEffect(() => {
    const check = () => {
      const until = getLockedUntil();
      if (until) {
        setIsLocked(true);
        setLockTimeLeft(Math.ceil((until - Date.now()) / 1000));
      } else {
        setIsLocked(false);
        setLockTimeLeft(0);
      }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    setVerifiedAt(Date.now());
    sessionTimerRef.current = setTimeout(() => {
      setPinVerified(false);
      setShowNumber(false);
      setVerifiedAt(null);
      toast.info("Session expired — please verify again", { icon: <Timer className="w-4 h-4" /> });
    }, SESSION_TIMEOUT);
  }, []);

  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, []);

  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  useEffect(() => {
    if (!verifiedAt) { setSessionTimeLeft(0); return; }
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((verifiedAt + SESSION_TIMEOUT - Date.now()) / 1000));
      setSessionTimeLeft(left);
      if (left === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [verifiedAt]);

  const handlePinVerify = () => {
    if (!selectedCard) return;
    if (verifyCardPin(selectedCard.id, pinInput)) {
      clearFailures();
      setPinVerified(true);
      setPinInput("");
      setPinVerifyError("");
      startSessionTimer();
      toast.success("PIN verified successfully");
    } else {
      const result = recordFailure();
      if (result.locked) {
        setIsLocked(true);
        toast.error("Too many failed attempts. Card locked for 15 minutes.", { icon: <Ban className="w-4 h-4" /> });
      } else {
        setPinVerifyError(`Incorrect PIN. ${result.remaining} attempt${result.remaining !== 1 ? "s" : ""} remaining.`);
      }
      setPinInput("");
    }
  };

  const handleFreezeToggle = async (card: CardData) => {
    const wasFrozen = card.is_frozen;
    toggleFreeze.mutate(card.id);
    if (user) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "security",
        title: wasFrozen ? "Card Unfrozen" : "Card Frozen",
        message: `Your card ending in ${card.card_number_last4} has been ${wasFrozen ? "unfrozen" : "frozen"}.`,
        metadata: { card_id: card.id, action: wasFrozen ? "unfreeze" : "freeze" } as any,
      });
    }
    toast.success(wasFrozen ? "Card unfrozen" : "Card frozen");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openDetail = (c: CardData) => {
    setSelectedCard(c);
    setShowNumber(false);
    setPinInput("");
    setPinVerified(false);
    setPinVerifyError("");
    setView("detail");
  };
  const openSettings = (c: CardData) => { setSelectedCard(c); setView("settings"); };

  const tierColors: Record<AccountTierType, string> = {
    personal: "text-muted-foreground",
    pro: "text-warning",
    business: "text-accent",
    bank: "text-primary",
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getDesignForCard = (c: CardData) => {
    // Try to get design from metadata or fallback
    const designId = (c as any).card_design || "classic-dark";
    return getCardDesign(designId);
  };

  /* ─── Card Visual ─── */
  const CardVisual = ({ c, compact = false }: { c: CardData; compact?: boolean }) => {
    const expiry = `${String(c.expiry_month).padStart(2, "0")}/${String(c.expiry_year).slice(-2)}`;
    const isVirtual = c.card_format === "virtual";
    const design = getDesignForCard(c);
    return (
      <div
        className={`relative rounded-2xl p-${compact ? "4" : "6"} overflow-hidden ${compact ? "aspect-[2/1]" : "aspect-[1.586/1]"} flex flex-col justify-between ${c.is_frozen ? "opacity-60" : ""}`}
        style={{
          background: design.bg,
          border: `1px solid ${design.border}`,
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: design.accent }} />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src="/favicon.png" alt="" className={`${compact ? "w-12 h-12" : "w-20 h-20"} opacity-[0.08] select-none`} draggable={false} />
        </div>

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="ExoSky" className="w-5 h-5 rounded" />
            <span className="text-xs font-bold tracking-wider text-foreground/80">EXOSKY</span>
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

  /* ─── Card Design Preview (for selection) ─── */
  const CardDesignPreview = ({ design, selected, onClick }: { design: typeof CARD_DESIGNS[0]; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden aspect-[1.6/1] transition-all ${
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background scale-[1.02]" : "ring-1 ring-border hover:ring-accent/50"
      }`}
    >
      <div className="absolute inset-0" style={{ background: design.bg }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: design.accent }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <img src="/favicon.png" alt="" className="w-8 h-8 opacity-[0.12]" />
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-3 h-3 text-accent-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-[10px] font-medium text-white/90">{design.name}</p>
      </div>
    </button>
  );

  const handleCreateCard = async () => {
    if (newCardPin.length < 4 || newCardPin.length > 6) {
      setPinError("PIN must be 4-6 digits");
      return;
    }
    if (!/^\d+$/.test(newCardPin)) {
      setPinError("PIN must be digits only");
      return;
    }
    if (newCardPin !== newCardPinConfirm) {
      setPinError("PINs do not match");
      return;
    }

    const result = await addCard.mutateAsync({
      format: newCardFormat,
      name: newCardName || undefined,
    });

    // Store the PIN for the newly created card
    // We need to get the card ID — refetch and find the newest card
    // For now, store with a temp key and associate on next load
    const { data: latestCards } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestCards && latestCards[0]) {
      setCardPinHash(latestCards[0].id, newCardPin);
    }

    setNewCardName("");
    setNewCardPin("");
    setNewCardPinConfirm("");
    setPinError("");
    setNewCardDesign(CARD_DESIGNS[0].id);
    setAddStep("format");
    setView("list");
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

            {cards.length < limits.maxCards && (
              <Button variant="outline" onClick={() => { setAddStep("format"); setView("add"); }} className="w-full border-dashed gap-2">
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
              <button onClick={() => { setView("list"); setShowNumber(false); setPinVerified(false); if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current); setVerifiedAt(null); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{selectedCard.card_name || "Card"}</h1>
                <p className="text-muted-foreground text-sm">•••• {selectedCard.card_number_last4}</p>
              </div>
            </div>

            <CardVisual c={selectedCard} />

            {/* Lockout State */}
            {isLocked ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="p-6 bg-destructive/5 border-destructive/20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
                    <Ban className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-destructive">Card Access Locked</h3>
                    <p className="text-sm text-muted-foreground mt-1">Too many failed verification attempts.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <p className="text-xs text-muted-foreground">Try again in</p>
                    <p className="text-2xl font-mono font-bold text-destructive">{formatTime(lockTimeLeft)}</p>
                  </div>
                </Card>
              </motion.div>
            ) : !pinVerified ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <Card className="p-6 bg-card border-border text-center space-y-4">
                  {getFailCount() > 0 && (
                    <div className="p-2 rounded-lg bg-warning/10 flex items-center justify-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      <span className="text-xs text-warning font-medium">
                        {MAX_ATTEMPTS - getFailCount()} attempt{MAX_ATTEMPTS - getFailCount() !== 1 ? "s" : ""} remaining
                      </span>
                    </div>
                  )}

                  <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
                    <KeyRound className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Enter Card PIN</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter your 4-6 digit PIN to view card details.
                    </p>
                  </div>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter PIN"
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinVerifyError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && pinInput.length >= 4 && handlePinVerify()}
                    className="text-center text-2xl tracking-[0.5em] font-mono bg-secondary border-border h-14"
                    autoFocus
                  />
                  {pinVerifyError && <p className="text-xs text-destructive">{pinVerifyError}</p>}
                  <Button
                    onClick={handlePinVerify}
                    disabled={pinInput.length < 4}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
                  >
                    <KeyRound className="w-4 h-4" /> Verify PIN
                  </Button>
                </Card>
                <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Secured by PIN verification
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Verified badge with session timer */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span className="text-xs font-medium text-accent">PIN Verified</span>
                  </div>
                  {sessionTimeLeft > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="w-3 h-3" />
                      <span className="font-mono">{formatTime(sessionTimeLeft)}</span>
                    </div>
                  )}
                </div>

                {/* Full Card Details */}
                <Card className="p-5 bg-card border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Card Details</h3>
                    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => setShowNumber(!showNumber)}>
                      {showNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{showNumber ? "Hide" : "Show"}</span>
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Number</p>
                        <p className="text-sm font-mono font-medium mt-0.5">
                          {showNumber ? `4532 8721 0${selectedCard.card_number_last4.slice(0, 2)}9 ${selectedCard.card_number_last4}` : `•••• •••• •••• ${selectedCard.card_number_last4}`}
                        </p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(`4532872100${selectedCard.card_number_last4.slice(0,2)}9${selectedCard.card_number_last4}`); toast.success("Card number copied"); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expiry</p>
                        <p className="text-sm font-mono font-medium mt-0.5">{String(selectedCard.expiry_month).padStart(2, "0")}/{String(selectedCard.expiry_year).slice(-2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CVV</p>
                        <p className="text-sm font-mono font-medium mt-0.5">{showNumber ? selectedCard.card_number_last4.slice(-3) : "•••"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Network</p>
                        <p className="text-sm font-medium mt-0.5">VISA</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cardholder</p>
                        <p className="text-sm font-medium mt-0.5 truncate">{selectedCard.card_name || handle}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</p>
                        <p className="text-sm font-medium mt-0.5 capitalize">{selectedCard.card_format}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-2 h-2 rounded-full ${selectedCard.is_frozen ? "bg-blue-400" : selectedCard.is_active ? "bg-accent" : "bg-destructive"}`} />
                          <p className="text-sm font-medium">{selectedCard.is_frozen ? "Frozen" : selectedCard.is_active ? "Active" : "Inactive"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Type</p>
                        <p className="text-sm font-medium mt-0.5 capitalize">{selectedCard.card_type}</p>
                      </div>
                    </div>
                    {selectedCard.card_format === "physical" && selectedCard.shipping_status && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shipping</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Truck className="w-3.5 h-3.5 text-warning" />
                          <p className="text-sm font-medium capitalize">{selectedCard.shipping_status}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => { navigator.clipboard.writeText(`4532872100${selectedCard.card_number_last4.slice(0,2)}9${selectedCard.card_number_last4}`); toast.success("Full number copied"); }}>
                    <Copy className="w-4 h-4" />
                    <span className="text-[10px]">Copy</span>
                  </Button>
                  <Button
                    variant={selectedCard.is_frozen ? "default" : "outline"}
                    className={`flex-col h-auto py-3 gap-1 ${selectedCard.is_frozen ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" : ""}`}
                    onClick={() => handleFreezeToggle(selectedCard)}
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
                onClick={() => handleFreezeToggle(selectedCard)}
                className={`w-full gap-2 ${selectedCard.is_frozen ? "border-blue-500/30 text-blue-400" : "border-destructive/20 text-destructive"}`}
              >
                <Snowflake className="w-4 h-4" /> {selectedCard.is_frozen ? "Unfreeze" : "Freeze"} Card
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── ADD CARD VIEW (Multi-Step) ─── */}
        {view === "add" && (
          <motion.div key="add" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => {
                if (addStep === "pin") setAddStep("design");
                else if (addStep === "design") setAddStep("format");
                else setView("list");
              }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {addStep === "format" ? "Add Card" : addStep === "design" ? "Choose Design" : "Set PIN"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Step {addStep === "format" ? "1" : addStep === "design" ? "2" : "3"} of 3
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {["format", "design", "pin"].map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                    (addStep === "format" && i === 0) || (addStep === "design" && i <= 1) || (addStep === "pin")
                      ? "bg-accent" : "bg-secondary"
                  }`} />
                </div>
              ))}
            </div>

            {/* Step 1: Format */}
            {addStep === "format" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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
                    maxLength={50}
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

                <Button onClick={() => setAddStep("design")} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
                  Next: Choose Design <Palette className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Design Selection */}
            {addStep === "design" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Pick a design for your card</p>
                <div className="grid grid-cols-2 gap-3">
                  {CARD_DESIGNS.map((design) => (
                    <CardDesignPreview
                      key={design.id}
                      design={design}
                      selected={newCardDesign === design.id}
                      onClick={() => setNewCardDesign(design.id)}
                    />
                  ))}
                </div>

                <Button onClick={() => setAddStep("pin")} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
                  Next: Set PIN <KeyRound className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: PIN Setup */}
            {addStep === "pin" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Card className="p-5 bg-card border-border space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-full bg-accent/10 mx-auto flex items-center justify-center">
                      <KeyRound className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="text-base font-bold">Set Your Card PIN</h3>
                    <p className="text-sm text-muted-foreground">
                      This PIN will be required to view your card details.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Enter PIN (4-6 digits)</label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter PIN"
                        value={newCardPin}
                        onChange={(e) => { setNewCardPin(e.target.value.replace(/\D/g, "")); setPinError(""); }}
                        className="text-center text-2xl tracking-[0.5em] font-mono bg-secondary border-border h-14"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Confirm PIN</label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Confirm PIN"
                        value={newCardPinConfirm}
                        onChange={(e) => { setNewCardPinConfirm(e.target.value.replace(/\D/g, "")); setPinError(""); }}
                        className="text-center text-2xl tracking-[0.5em] font-mono bg-secondary border-border h-14"
                      />
                    </div>
                  </div>

                  {pinError && <p className="text-xs text-destructive text-center">{pinError}</p>}
                </Card>

                <Button
                  onClick={handleCreateCard}
                  disabled={newCardPin.length < 4 || newCardPinConfirm.length < 4 || addCard.isPending}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
                >
                  {addCard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>{newCardFormat === "virtual" ? <Wifi className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />} Create Card</>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── TIERS VIEW ─── */}
        {view === "tiers" && (
          <motion.div key="tiers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("list")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold tracking-tight">Account Tiers</h1>
            </div>

            {(["personal", "pro", "business", "bank"] as AccountTierType[]).map((t) => {
              const tc = TIER_CONFIG[t];
              const isCurrent = t === tier;
              return (
                <Card key={t} className={`p-5 border-border space-y-2 ${isCurrent ? "border-accent bg-accent/5" : "bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className={`w-4 h-4 ${tierColors[t]}`} />
                      <h3 className={`text-sm font-bold ${tierColors[t]}`}>{tc.label}</h3>
                    </div>
                    {isCurrent && <Badge className="bg-accent/20 text-accent border-0 text-[10px]">Current</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Per Tx</p>
                      <p className="text-xs font-bold font-mono">${tc.single.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Daily</p>
                      <p className="text-xs font-bold font-mono">${tc.daily.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Cards</p>
                      <p className="text-xs font-bold font-mono">{tc.maxCards}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
