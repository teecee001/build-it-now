import { useState } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { TransactionPinModal } from "@/components/TransactionPinModal";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, QrCode, Users, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SendMoney() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCurrency, activeBalance, activeSymbol, formatBalance, toUSD } = useActiveCurrency();
  const { wallets } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();
  const { addTransaction } = useTransactions();
  const { requiresPin, verifyPin, isPinSet, PIN_THRESHOLD } = useTransactionPin();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const parsedAmount = parseFloat(amount || "0");
  const usdAmount = toUSD(parsedAmount);

  const executeSend = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      const activeWallet = wallets.find(w => w.currency === activeCurrency);
      if (!activeWallet) throw new Error(`No ${activeCurrency} wallet found`);
      if (parsedAmount > activeWallet.balance) throw new Error("Insufficient balance");

      // Deduct from active currency wallet
      const { error: updateErr } = await supabase
        .from("wallets")
        .update({ balance: activeWallet.balance - parsedAmount })
        .eq("id", activeWallet.id);
      if (updateErr) throw updateErr;

      await addTransaction.mutateAsync({
        type: "send",
        amount: -usdAmount,
        description: `Sent ${activeSymbol}${parsedAmount.toFixed(2)} ${activeCurrency} to ${recipient}`,
        recipient,
        metadata: { currency: activeCurrency, original_amount: parsedAmount },
      });
      setSent(true);
      toast.success(`${formatBalance(parsedAmount)} sent to ${recipient}`);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast.error("Please fill in all fields");
      return;
    }
    if (parsedAmount > activeBalance) {
      toast.error(`Insufficient ${activeCurrency} balance`);
      return;
    }
    if (requiresPin(usdAmount)) {
      setShowPinModal(true);
      return;
    }
    await executeSend();
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>
          <CheckCircle2 className="w-20 h-20 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold">Payment Sent!</h2>
        <p className="text-muted-foreground text-center">{formatBalance(parsedAmount)} was sent to {recipient}</p>
        <Button variant="outline" onClick={() => { setSent(false); setRecipient(""); setAmount(""); }}>Send Another</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Send Money</h1>
        <p className="text-muted-foreground text-sm mt-1">Transfer funds to anyone, anywhere in the world</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-4 bg-card border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Spending from</p>
            <CurrencySwitcher compact />
          </div>
          <p className="text-lg font-bold font-mono">{formatBalance(activeBalance)}</p>
        </Card>
      </motion.div>

      {/* PIN protection notice */}
      {isPinSet && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="p-3 bg-accent/5 border-accent/10 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground">
              Transaction PIN required for transfers over <span className="font-semibold text-foreground">${PIN_THRESHOLD}</span>
            </p>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-6 bg-card border-border shadow-card space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Recipient</label>
            <div className="relative">
              <Input
                placeholder="Email, username, or wallet address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="h-12 bg-secondary border-border pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => navigate("/qr")} className="p-2 hover:bg-background/50 rounded-md transition-colors" title="Scan QR">
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-background/50 rounded-md transition-colors">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Amount ({activeCurrency})</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 bg-secondary border-border text-xl font-mono"
            />
          </div>

          {parsedAmount > 0 && activeCurrency !== "USD" && (
            <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">≈ USD equivalent</span>
              <span className="font-mono font-medium">${usdAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network fee</span>
            <span className="text-success font-medium">Free</span>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !recipient || !amount}
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold text-base gap-2"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </Card>
      </motion.div>

      <TransactionPinModal
        open={showPinModal}
        onVerified={() => { setShowPinModal(false); executeSend(); }}
        onCancel={() => setShowPinModal(false)}
        verifyPin={verifyPin}
        amount={usdAmount}
      />
    </div>
  );
}
