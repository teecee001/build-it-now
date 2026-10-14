import { SpringCollapse } from "@/components/ds/SpringCollapse";
import { SwipeToConfirm } from "@/components/ds/SwipeToConfirm";
import { haptic } from "@/lib/haptics";
import { SuccessCheck } from "@/components/ds/SuccessCheck";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { RateWatch } from "@/components/RateWatch";

import { invokeWalletOp } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, QrCode, Users, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { formatHandle } from "@/lib/formatTransaction";

export default function SendMoney() {
  return (
    <FeatureGate feature="features_send_money" featureLabel="Send Money">
      <SendMoneyContent />
    </FeatureGate>
  );
}

function SendMoneyContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  // Blocks a second submit before React re-renders (double tap / double Enter).
  const sendInFlight = useRef(false);

  const parsedAmount = parseFloat(amount || "0");
  const usdAmount = toUSD(parsedAmount);

  const executeSend = async (): Promise<boolean> => {
    if (!user || sendInFlight.current) return false;
    let ok = false;
    sendInFlight.current = true;
    setIsSending(true);
    // One key per send attempt: the server treats a repeat of the same key as the
    // same transfer and never moves money twice.
    const idempotencyKey = crypto.randomUUID();
    try {
      const activeWallet = wallets.find(w => w.currency === activeCurrency);
      if (!activeWallet) throw new Error(`No ${activeCurrency} wallet found`);
      if (parsedAmount > activeWallet.balance) throw new Error("Insufficient balance");

      const result = await invokeWalletOp({
        operation: "send",
        wallet_id: activeWallet.id,
        amount: parsedAmount,
        usd_amount: usdAmount,
        currency: activeCurrency,
        recipient: recipient.trim(),
        idempotency_key: idempotencyKey,
        description: `Sent ${activeSymbol}${parsedAmount.toFixed(2)} ${activeCurrency} to ${formatHandle(recipient)}`,
      });
      // Only report success when the server confirms the transfer was recorded.
      if (!result || result.success !== true || !result.transaction_id) {
        throw new Error("Transfer could not be confirmed. Check your activity before trying again.");
      }
      ok = true;
      toast.success(`${formatBalance(parsedAmount)} sent to ${recipient.trim()}`);
      // Let the slider's checkmark land before the success screen replaces it.
      setTimeout(() => setSent(true), 450);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Transfer failed");
    } finally {
      // Refresh on success and on failure so balances/history always match the server.
      for (const key of ["wallet", "multi-wallets", "transactions", "notifications"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      sendInFlight.current = false;
      setIsSending(false);
    }
    return ok;
  };

  const handleSend = async (): Promise<boolean> => {
    haptic("confirm");
    if (!recipient || !amount) {
      toast.error("Please fill in all fields");
      return false;
    }
    if (parsedAmount > activeBalance) {
      toast.error(`Insufficient ${activeCurrency} balance`);
      return false;
    }
    if (requiresPin(usdAmount)) {
      setShowPinModal(true);
      return false;
    }
    return executeSend();
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <SuccessCheck />
        <h2 className="text-title">Payment Sent!</h2>
        <p className="text-muted-foreground text-center">{formatBalance(parsedAmount)} was sent to {recipient}</p>
        <Button variant="outline" onClick={() => { setSent(false); setRecipient(""); setAmount(""); }}>Send Another</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-title">Send Money</h1>
        <p className="text-muted-foreground text-sm mt-1">Transfer funds to anyone, anywhere in the world</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.025 }}>
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

      <RateWatch currency={activeCurrency} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.025 }}>

        <Card className="p-6 bg-card border-border shadow-card space-y-6">
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

          <SpringCollapse open={parsedAmount > 0 && activeCurrency !== "USD"}>
            <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">≈ USD equivalent</span>
              <span className="font-mono font-medium">${usdAmount.toFixed(2)}</span>
            </div>
          </SpringCollapse>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network fee</span>
            <span className="text-success font-medium">Free</span>
          </div>

          <SwipeToConfirm label="Send" onConfirm={handleSend} disabled={isSending || !recipient || !amount} />
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
