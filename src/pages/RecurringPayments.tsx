import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import {
  RefreshCw, Plus, Trash2, Loader2, Calendar, ArrowRight,
  Pause, Play, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringPayments() {
  const { payments, isLoading, addPayment, updatePayment, deletePayment } = useRecurringPayments();
  const [showAdd, setShowAdd] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [description, setDescription] = useState("");
  const [nextDate, setNextDate] = useState("");

  const handleAdd = async () => {
    if (!recipient || !amount || !nextDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await addPayment.mutateAsync({
        recipient,
        amount: parseFloat(amount),
        frequency,
        description: description || undefined,
        next_payment_date: nextDate,
      });
      toast.success("Recurring payment created");
      setShowAdd(false);
      setRecipient("");
      setAmount("");
      setDescription("");
      setNextDate("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updatePayment.mutateAsync({ id, is_active: !isActive });
      toast.success(isActive ? "Payment paused" : "Payment resumed");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePayment.mutateAsync(id);
      toast.success("Recurring payment deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const activePayments = payments.filter(p => p.is_active);
  const pausedPayments = payments.filter(p => !p.is_active);
  const totalMonthly = activePayments.reduce((sum, p) => {
    const multipliers: Record<string, number> = { daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 0.33, yearly: 0.083 };
    return sum + Number(p.amount) * (multipliers[p.frequency] || 1);
  }, 0);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recurring Payments</h1>
            <p className="text-muted-foreground text-sm mt-1">Automate your regular transfers</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </motion.div>

      {/* Monthly Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Est. monthly total</span>
            </div>
            <span className="text-lg font-bold font-mono">${totalMonthly.toFixed(2)}</span>
          </div>
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <span>{activePayments.length} active</span>
            {pausedPayments.length > 0 && <span>{pausedPayments.length} paused</span>}
          </div>
        </Card>
      </motion.div>

      {/* Add Form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-card border-border space-y-4">
            <h3 className="text-sm font-semibold">New Recurring Payment</h3>
            <Input placeholder="Recipient (email, handle, or name)" value={recipient} onChange={e => setRecipient(e.target.value)} className="bg-secondary border-border" />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="pl-9 bg-secondary border-border" />
              </div>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-32 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="bg-secondary border-border" />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">First payment date</label>
              <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAdd} disabled={addPayment.isPending} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
                {addPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Active Payments */}
          {activePayments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active</h3>
              {activePayments.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="p-4 bg-card border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.recipient}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.description || p.frequency}</p>
                      </div>
                      <div className="text-right shrink-0 mr-3">
                        <p className="text-sm font-bold font-mono">${Number(p.amount).toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 capitalize">{p.frequency}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggle(p.id, p.is_active)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                          <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Next: {format(new Date(p.next_payment_date), "MMM d, yyyy")} ({formatDistanceToNow(new Date(p.next_payment_date), { addSuffix: true })})
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Paused Payments */}
          {pausedPayments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Paused</h3>
              {pausedPayments.map((p) => (
                <Card key={p.id} className="p-4 bg-card border-border opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.recipient}</p>
                      <p className="text-xs text-muted-foreground">${Number(p.amount).toFixed(2)} · {p.frequency}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggle(p.id, p.is_active)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <Play className="w-3.5 h-3.5 text-accent" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {payments.length === 0 && !showAdd && (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No recurring payments set up</p>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1">
                <Plus className="w-4 h-4" /> Create your first
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
