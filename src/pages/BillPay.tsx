import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Wifi, Home, Phone, Tv, Droplets, Search,
  CheckCircle2, Loader2, ArrowRight
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BILL_CATEGORIES = [
  { icon: Zap, label: "Electric", color: "text-warning" },
  { icon: Droplets, label: "Water", color: "text-blue-400" },
  { icon: Wifi, label: "Internet", color: "text-accent" },
  { icon: Phone, label: "Phone", color: "text-primary" },
  { icon: Tv, label: "Streaming", color: "text-destructive" },
  { icon: Home, label: "Rent", color: "text-foreground" },
];

const SAVED_BILLERS = [
  { name: "Pacific Gas & Electric", category: "Electric", lastPaid: "Feb 15", amount: 142.50, due: "Mar 15" },
  { name: "AT&T Wireless", category: "Phone", lastPaid: "Feb 20", amount: 85.00, due: "Mar 20" },
  { name: "Comcast Xfinity", category: "Internet", lastPaid: "Feb 10", amount: 69.99, due: "Mar 10" },
  { name: "Netflix Premium", category: "Streaming", lastPaid: "Feb 25", amount: 22.99, due: "Mar 25" },
];

export default function BillPay() {
  const [search, setSearch] = useState("");
  const [payingIndex, setPayingIndex] = useState<number | null>(null);
  const [paidIndexes, setPaidIndexes] = useState<Set<number>>(new Set());

  const handlePay = async (index: number) => {
    setPayingIndex(index);
    await new Promise(r => setTimeout(r, 1500));
    setPayingIndex(null);
    setPaidIndexes(prev => new Set(prev).add(index));
    toast.success(`Paid ${SAVED_BILLERS[index].name}`);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Pay Bills</h1>
        <p className="text-muted-foreground text-sm mt-1">Pay utilities, subscriptions, and more</p>
      </motion.div>

      {/* Categories */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {BILL_CATEGORIES.map((cat) => (
            <button key={cat.label} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-border hover:bg-secondary/50 transition-colors">
              <cat.icon className={`w-5 h-5 ${cat.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{cat.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search billers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 bg-secondary border-border"
        />
      </div>

      {/* Saved Billers */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Bills</h3>
        <div className="space-y-2">
          {SAVED_BILLERS.map((biller, i) => {
            const isPaid = paidIndexes.has(i);
            const isPaying = payingIndex === i;
            return (
              <Card key={i} className="p-4 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{biller.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{biller.category}</Badge>
                      <p className="text-xs text-muted-foreground">Due {biller.due}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold font-mono">${biller.amount.toFixed(2)}</p>
                    {isPaid ? (
                      <Badge className="bg-success/10 text-success border-0 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePay(i)}
                        disabled={isPaying}
                        className="bg-foreground text-background hover:bg-foreground/90 h-8 gap-1"
                      >
                        {isPaying ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Pay <ArrowRight className="w-3 h-3" /></>}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Cashback Notice */}
      <Card className="p-3 bg-warning/5 border-warning/10">
        <p className="text-xs text-warning text-center">💰 Earn 1% cashback on all bill payments with your X Money card</p>
      </Card>
    </div>
  );
}
