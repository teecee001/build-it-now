import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { TransactionPinModal } from "@/components/TransactionPinModal";
import { CURRENCIES } from "@/constants/currencies";
import { ArrowRight, QrCode, Users, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SendMoney() {
  const { rates } = useExchangeRates();
  const { balance, updateBalance } = useWallet();
  const { addTransaction } = useTransactions();
  const { requiresPin, verifyPin, isPinSet, PIN_THRESHOLD } = useTransactionPin();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const usdAmount = currency === "USD" ? parseFloat(amount || "0") : parseFloat(amount || "0") / (rates[currency] || 1);

  const executeSend = async () => {
    setIsSending(true);
    try {
      await updateBalance.mutateAsync({ balance: balance - usdAmount });
      await addTransaction.mutateAsync({
        type: "send",
        amount: -usdAmount,
        description: `Sent to ${recipient}`,
        recipient,
      });
      setSent(true);
      toast.success(`$${usdAmount.toFixed(2)} sent to ${recipient}`);
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
    if (usdAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    // Check if PIN is required for high-value transactions
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
        <p className="text-muted-foreground text-center">{amount} {currency} was sent to {recipient}</p>
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
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="text-lg font-bold font-mono">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
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
                <button className="p-2 hover:bg-background/50 rounded-md transition-colors">
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 hover:bg-background/50 rounded-md transition-colors">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Amount</label>
            <div className="flex gap-2">
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 bg-secondary border-border flex-1 text-xl font-mono" />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28 h-12 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.slice(0, 20).map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {amount && parseFloat(amount) > 0 && currency !== "USD" && (
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
