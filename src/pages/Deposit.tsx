import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { 
  Landmark, Building2, CreditCard, ArrowDownLeft, 
  CheckCircle2, Copy, Percent, Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Deposit() {
  const { wallet, balance, updateBalance } = useWallet();
  const { addTransaction } = useTransactions();
  const [method, setMethod] = useState<"direct" | "bank" | "card" | null>(null);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const routingNumber = "021000021";
  const accountNumber = "9876543210";

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setIsProcessing(true);
    try {
      // Update wallet balance
      await updateBalance.mutateAsync({ balance: balance + depositAmount });
      // Record transaction
      await addTransaction.mutateAsync({
        type: "deposit",
        amount: depositAmount,
        description: method === "bank" ? "Bank transfer deposit" : "Debit card deposit",
      });
      setDone(true);
      toast.success(`$${amount} deposited successfully`);
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
    } finally {
      setIsProcessing(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>
          <CheckCircle2 className="w-20 h-20 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold">Deposit Complete!</h2>
        <p className="text-muted-foreground text-center">${amount} has been added to your wallet</p>
        <Button variant="outline" onClick={() => { setDone(false); setAmount(""); setMethod(null); }}>
          Make Another Deposit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Deposit Funds</h1>
        <p className="text-muted-foreground text-sm mt-1">Add money to your ExoSky wallet</p>
      </motion.div>

      {/* Current Balance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-4 bg-card border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Current wallet balance</p>
          <p className="text-lg font-bold font-mono">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </Card>
      </motion.div>

      {/* APY Promo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-4 bg-gradient-to-r from-success/10 to-success/5 border-success/20 flex items-center gap-3">
          <Percent className="w-5 h-5 text-success" />
          <div>
            <p className="text-sm font-semibold">Earn 6.00% APY</p>
            <p className="text-xs text-muted-foreground">Set up direct deposit and earn interest on your balance</p>
          </div>
        </Card>
      </motion.div>

      {/* Deposit Methods */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choose Method</h3>
        <div className="space-y-2">
          {[
            { id: "direct" as const, icon: Landmark, title: "Direct Deposit", desc: "Set up recurring deposits from your employer", badge: "6% APY" },
            { id: "bank" as const, icon: Building2, title: "Bank Transfer", desc: "Transfer from your bank account (1-3 days)" },
            { id: "card" as const, icon: CreditCard, title: "Debit Card", desc: "Instant deposit from a debit card" },
          ].map((m) => (
            <Card
              key={m.id}
              className={`p-4 bg-card border-border cursor-pointer transition-all ${
                method === m.id ? "ring-1 ring-accent border-accent/50" : "hover:bg-secondary/30"
              }`}
              onClick={() => setMethod(m.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <m.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.badge && <Badge className="bg-success/10 text-success border-0 text-[10px]">{m.badge}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Direct Deposit Info */}
      {method === "direct" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-card border-border shadow-card space-y-4">
            <h3 className="text-sm font-semibold">Direct Deposit Details</h3>
            <p className="text-xs text-muted-foreground">Share these details with your employer to set up direct deposit</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs text-muted-foreground">Routing Number</p>
                  <p className="text-sm font-mono font-semibold">{routingNumber}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(routingNumber); toast.success("Copied"); }} className="p-2 hover:bg-background/50 rounded-md">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="text-sm font-mono font-semibold">{accountNumber}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(accountNumber); toast.success("Copied"); }} className="p-2 hover:bg-background/50 rounded-md">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/10">
              <p className="text-xs text-success">✓ Deposits arrive within 1-2 business days. Earn 6.00% APY on your entire balance.</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Amount Entry for bank/card */}
      {(method === "bank" || method === "card") && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-card border-border shadow-card space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground font-medium">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 bg-secondary border-border text-2xl font-mono text-center"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {["50", "100", "250", "500"].map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className="p-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  ${a}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee</span>
              <span className="text-success font-medium">Free</span>
            </div>

            <Button
              onClick={handleDeposit}
              disabled={isProcessing || !amount}
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold text-base gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4" /> Deposit ${amount || "0.00"}
                </>
              )}
            </Button>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
