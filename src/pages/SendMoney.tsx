import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CURRENCIES } from "@/constants/currencies";
import { ArrowRight, QrCode, Users, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SendMoney() {
  const { rates, isLive } = useExchangeRates();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSending(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));
    setIsSending(false);
    setSent(true);
    toast.success(`$${amount} ${currency} sent to ${recipient}`);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <CheckCircle2 className="w-20 h-20 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold">Payment Sent!</h2>
        <p className="text-muted-foreground text-center">
          {amount} {currency} was sent to {recipient}
        </p>
        <Button variant="outline" onClick={() => { setSent(false); setRecipient(""); setAmount(""); }}>
          Send Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Send Money</h1>
        <p className="text-muted-foreground text-sm mt-1">Transfer funds to anyone, anywhere in the world</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-6 bg-card border-border shadow-card space-y-5">
          {/* Recipient */}
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

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Amount</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 bg-secondary border-border flex-1 text-xl font-mono"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28 h-12 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.slice(0, 20).map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversion preview */}
          {amount && parseFloat(amount) > 0 && currency !== "USD" && (
            <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">≈ USD equivalent</span>
              <span className="font-mono font-medium">
                ${(parseFloat(amount) / (rates[currency] || 1)).toFixed(2)}
              </span>
            </div>
          )}

          {/* Fee */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network fee</span>
            <span className="text-success font-medium">Free</span>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !recipient || !amount}
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold text-base gap-2"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Send <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </Card>
      </motion.div>

      {/* Recent Recipients */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {["Alex M.", "Sarah K.", "Mike R.", "Lisa T."].map((name) => (
            <button
              key={name}
              onClick={() => setRecipient(name.toLowerCase().replace(" ", ".") + "@email.com")}
              className="flex flex-col items-center gap-2 min-w-[64px] group"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-bold group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                {name[0]}
              </div>
              <span className="text-xs text-muted-foreground">{name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
