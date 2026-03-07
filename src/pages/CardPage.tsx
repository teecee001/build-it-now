import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  CreditCard, Lock, Globe, Percent, Eye, EyeOff, 
  Snowflake, Settings, Copy, CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CardPage() {
  const { user } = useAuth();
  const [showNumber, setShowNumber] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const cardNumber = "4242 8888 1234 5678";
  const expiry = "03/29";
  const cvv = "421";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Debit Card</h1>
        <p className="text-muted-foreground text-sm mt-1">Your X Money metal card by Visa</p>
      </motion.div>

      {/* Card Visual */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className={`relative rounded-2xl p-6 overflow-hidden aspect-[1.586/1] flex flex-col justify-between ${
          frozen ? "opacity-60" : ""
        }`} style={{
          background: "linear-gradient(135deg, hsl(240 6% 12%), hsl(240 6% 6%))",
          border: "1px solid hsl(240 4% 20%)",
        }}>
          {/* Card texture overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 80%, hsl(142 71% 45% / 0.3), transparent 50%), radial-gradient(circle at 80% 20%, hsl(0 0% 100% / 0.1), transparent 50%)",
          }} />
          
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-accent flex items-center justify-center font-bold text-[10px] text-primary-foreground">
                  X
                </div>
                <span className="text-sm font-bold tracking-wider text-foreground/80">MONEY</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {frozen && <Snowflake className="w-4 h-4 text-blue-400" />}
              <span className="text-xs font-medium text-foreground/50">METAL</span>
            </div>
          </div>

          {/* Chip */}
          <div className="relative">
            <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40 border border-yellow-700/30" />
          </div>

          <div className="relative space-y-3">
            {/* Card number */}
            <div className="flex items-center gap-2">
              <p className="text-lg font-mono tracking-[0.15em] text-foreground/90">
                {showNumber ? cardNumber : "•••• •••• •••• 5678"}
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
              <div className="flex items-center">
                {/* Visa logo */}
                <span className="text-xl font-bold italic tracking-tighter text-foreground/60">VISA</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Card Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          className="flex-col h-auto py-3 gap-1"
          onClick={() => copyToClipboard(cardNumber, "Card number")}
        >
          <Copy className="w-4 h-4" />
          <span className="text-[10px]">Copy Number</span>
        </Button>
        <Button
          variant={frozen ? "default" : "outline"}
          className={`flex-col h-auto py-3 gap-1 ${frozen ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" : ""}`}
          onClick={() => { setFrozen(!frozen); toast.success(frozen ? "Card unfrozen" : "Card frozen"); }}
        >
          <Snowflake className="w-4 h-4" />
          <span className="text-[10px]">{frozen ? "Unfreeze" : "Freeze"}</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1">
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
          <CheckCircle2 className="w-5 h-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Card Active</p>
            <p className="text-xs text-muted-foreground">Visa debit · Partnered with X Payments</p>
          </div>
          <Badge className="bg-success/10 text-success border-0 text-xs">Active</Badge>
        </Card>
      </motion.div>
    </div>
  );
}
