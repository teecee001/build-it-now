import { motion } from "framer-motion";
import { FeatureGate } from "@/components/FeatureGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBills } from "@/hooks/useBills";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { 
  Zap, Wifi, Home, Phone, Tv, Droplets, Search,
  CheckCircle2, Loader2, ArrowRight, Plus, Shield, FileText
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

const BILL_CATEGORIES = [
  { icon: Zap, label: "Electric", color: "text-warning" },
  { icon: Droplets, label: "Water", color: "text-blue-400" },
  { icon: Wifi, label: "Internet", color: "text-accent" },
  { icon: Phone, label: "Phone", color: "text-primary" },
  { icon: Tv, label: "Streaming", color: "text-destructive" },
  { icon: Home, label: "Rent", color: "text-foreground" },
];

const BILL_PROVIDERS: Record<string, { name: string; avgAmount: number }[]> = {
  Electric: [
    // US
    { name: "Duke Energy", avgAmount: 142.00 },
    { name: "Pacific Gas & Electric (PG&E)", avgAmount: 175.00 },
    { name: "Southern California Edison", avgAmount: 158.00 },
    { name: "Florida Power & Light", avgAmount: 135.00 },
    { name: "Dominion Energy", avgAmount: 128.00 },
    // UK & Europe
    { name: "British Gas", avgAmount: 120.00 },
    { name: "EDF Energy", avgAmount: 110.00 },
    { name: "Enel (Italy)", avgAmount: 95.00 },
    { name: "Iberdrola (Spain)", avgAmount: 105.00 },
    { name: "E.ON (Germany)", avgAmount: 130.00 },
    { name: "Vattenfall (Sweden)", avgAmount: 90.00 },
    // Africa
    { name: "PHCN / DisCos (Nigeria)", avgAmount: 45.00 },
    { name: "Eskom (South Africa)", avgAmount: 60.00 },
    { name: "Kenya Power (KPLC)", avgAmount: 35.00 },
    { name: "ECG Ghana", avgAmount: 30.00 },
    { name: "UMEME (Uganda)", avgAmount: 25.00 },
    { name: "TANESCO (Tanzania)", avgAmount: 28.00 },
    // Asia & Middle East
    { name: "DEWA (Dubai)", avgAmount: 150.00 },
    { name: "TEPCO (Japan)", avgAmount: 140.00 },
    { name: "Tata Power (India)", avgAmount: 40.00 },
    { name: "PLN (Indonesia)", avgAmount: 30.00 },
    { name: "Meralco (Philippines)", avgAmount: 55.00 },
    { name: "TNB (Malaysia)", avgAmount: 45.00 },
    // Americas
    { name: "Hydro-Québec (Canada)", avgAmount: 85.00 },
    { name: "CFE (Mexico)", avgAmount: 50.00 },
    { name: "Enel (Brazil)", avgAmount: 60.00 },
  ],
  Water: [
    // US
    { name: "American Water Works", avgAmount: 72.00 },
    { name: "Aqua America", avgAmount: 65.00 },
    { name: "California Water Service", avgAmount: 85.00 },
    // UK & Europe
    { name: "Thames Water (UK)", avgAmount: 55.00 },
    { name: "Severn Trent (UK)", avgAmount: 48.00 },
    { name: "Veolia (France)", avgAmount: 60.00 },
    // Africa
    { name: "Lagos Water Corp (Nigeria)", avgAmount: 15.00 },
    { name: "Rand Water (South Africa)", avgAmount: 25.00 },
    { name: "Nairobi Water (Kenya)", avgAmount: 12.00 },
    { name: "Ghana Water Company", avgAmount: 10.00 },
    // Asia & Middle East
    { name: "DEWA Water (Dubai)", avgAmount: 80.00 },
    { name: "Delhi Jal Board (India)", avgAmount: 8.00 },
    { name: "PUB (Singapore)", avgAmount: 35.00 },
    { name: "Manila Water (Philippines)", avgAmount: 18.00 },
    // Americas
    { name: "SABESP (Brazil)", avgAmount: 30.00 },
    { name: "CONAGUA (Mexico)", avgAmount: 20.00 },
  ],
  Internet: [
    // US
    { name: "Comcast Xfinity", avgAmount: 89.99 },
    { name: "AT&T Fiber", avgAmount: 79.99 },
    { name: "Verizon Fios", avgAmount: 74.99 },
    { name: "Spectrum (Charter)", avgAmount: 69.99 },
    { name: "Starlink", avgAmount: 120.00 },
    // UK & Europe
    { name: "BT Broadband (UK)", avgAmount: 45.00 },
    { name: "Virgin Media (UK)", avgAmount: 50.00 },
    { name: "Sky Broadband (UK)", avgAmount: 40.00 },
    { name: "Deutsche Telekom (Germany)", avgAmount: 45.00 },
    { name: "Orange (France)", avgAmount: 40.00 },
    // Africa
    { name: "MTN (Nigeria/Africa)", avgAmount: 25.00 },
    { name: "Airtel Africa", avgAmount: 20.00 },
    { name: "Safaricom (Kenya)", avgAmount: 22.00 },
    { name: "Glo (Nigeria)", avgAmount: 18.00 },
    { name: "Spectranet (Nigeria)", avgAmount: 30.00 },
    { name: "Telkom (South Africa)", avgAmount: 28.00 },
    // Asia & Middle East
    { name: "Jio Fiber (India)", avgAmount: 15.00 },
    { name: "du (UAE)", avgAmount: 80.00 },
    { name: "Etisalat (UAE)", avgAmount: 75.00 },
    { name: "PLDT (Philippines)", avgAmount: 35.00 },
    { name: "Telkomsel (Indonesia)", avgAmount: 20.00 },
    // Americas
    { name: "Rogers (Canada)", avgAmount: 75.00 },
    { name: "Telmex (Mexico)", avgAmount: 30.00 },
  ],
  Phone: [
    // US
    { name: "Verizon Wireless", avgAmount: 85.00 },
    { name: "AT&T Wireless", avgAmount: 80.00 },
    { name: "T-Mobile", avgAmount: 70.00 },
    { name: "Mint Mobile", avgAmount: 30.00 },
    // UK & Europe
    { name: "Vodafone (UK/Europe)", avgAmount: 35.00 },
    { name: "EE (UK)", avgAmount: 30.00 },
    { name: "Three (UK)", avgAmount: 25.00 },
    { name: "O2 (UK/Europe)", avgAmount: 28.00 },
    // Africa
    { name: "MTN Mobile (Africa)", avgAmount: 10.00 },
    { name: "Airtel Mobile (Africa)", avgAmount: 8.00 },
    { name: "Safaricom M-PESA (Kenya)", avgAmount: 12.00 },
    { name: "Glo Mobile (Nigeria)", avgAmount: 8.00 },
    { name: "9mobile (Nigeria)", avgAmount: 7.00 },
    { name: "Vodacom (South Africa)", avgAmount: 15.00 },
    // Asia & Middle East
    { name: "Jio (India)", avgAmount: 5.00 },
    { name: "Airtel India", avgAmount: 6.00 },
    { name: "Globe Telecom (Philippines)", avgAmount: 15.00 },
    { name: "AIS (Thailand)", avgAmount: 12.00 },
    { name: "STC (Saudi Arabia)", avgAmount: 40.00 },
    // Americas
    { name: "Telcel (Mexico)", avgAmount: 20.00 },
    { name: "Bell (Canada)", avgAmount: 65.00 },
  ],
  Streaming: [
    { name: "Netflix", avgAmount: 15.49 },
    { name: "Spotify Premium", avgAmount: 11.99 },
    { name: "Disney+ Bundle", avgAmount: 19.99 },
    { name: "HBO Max", avgAmount: 15.99 },
    { name: "Apple TV+", avgAmount: 9.99 },
    { name: "YouTube Premium", avgAmount: 13.99 },
    { name: "Hulu", avgAmount: 17.99 },
    { name: "Amazon Prime", avgAmount: 14.99 },
    { name: "Paramount+", avgAmount: 11.99 },
    { name: "Peacock Premium", avgAmount: 7.99 },
    { name: "DSTV / Showmax (Africa)", avgAmount: 12.00 },
    { name: "iROKOtv (Africa)", avgAmount: 5.00 },
    { name: "Hotstar (India)", avgAmount: 4.00 },
    { name: "Viu (Asia)", avgAmount: 5.00 },
    { name: "BBC iPlayer (UK)", avgAmount: 18.00 },
    { name: "Stan (Australia)", avgAmount: 10.00 },
  ],
  Rent: [
    { name: "Apartment Rent", avgAmount: 1850.00 },
    { name: "Mortgage Payment", avgAmount: 2200.00 },
    { name: "HOA Fees", avgAmount: 350.00 },
    { name: "Storage Unit", avgAmount: 125.00 },
    { name: "Parking Space", avgAmount: 200.00 },
    { name: "Office Rent", avgAmount: 3000.00 },
    { name: "Co-working Space", avgAmount: 250.00 },
  ],
};

export default function BillPay() {
  return (
    <FeatureGate feature="features_bill_pay" featureLabel="Bill Pay">
      <BillPayContent />
    </FeatureGate>
  );
}

function BillPayContent() {
  const { bills, isLoading, payBill, addBill } = useBills();
  const { balance, updateBalance } = useWallet();
  const { addTransaction } = useTransactions();
  const [search, setSearch] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  
  const [newCategory, setNewCategory] = useState("Electric");
  const [newBiller, setNewBiller] = useState(BILL_PROVIDERS["Electric"]?.[0]?.name ?? "");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [confirmBill, setConfirmBill] = useState<any | null>(null);

  const handleCategoryChange = (cat: string) => {
    setNewCategory(cat);
    const providers = BILL_PROVIDERS[cat] || [];
    if (providers.length > 0) {
      setNewBiller(providers[0].name);
      setNewAmount(providers[0].avgAmount.toFixed(2));
    } else {
      setNewBiller("");
      setNewAmount("");
    }
  };

  const handleProviderChange = (providerName: string) => {
    setNewBiller(providerName);
    const provider = (BILL_PROVIDERS[newCategory] || []).find(p => p.name === providerName);
    if (provider) setNewAmount(provider.avgAmount.toFixed(2));
  };

  const handlePayClick = (bill: any) => {
    if (!bill.account_number) {
      toast.error("No account number on file. Edit this bill to add one before paying.");
      return;
    }
    setConfirmBill(bill);
  };

  const handleConfirmPay = async () => {
    const bill = confirmBill;
    if (!bill) return;
    setConfirmBill(null);
    if (bill.amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setPayingId(bill.id);
    try {
      await updateBalance.mutateAsync({ balance: balance - bill.amount });
      await addTransaction.mutateAsync({
        type: "bill_payment",
        amount: -bill.amount,
        description: `Bill payment — ${bill.biller_name} (Acct: ...${(bill.account_number || "").slice(-4)})`,
      });
      const cashback = bill.amount * 0.01;
      await updateBalance.mutateAsync({ balance: balance - bill.amount + cashback });
      await addTransaction.mutateAsync({
        type: "cashback",
        amount: cashback,
        description: `1% cashback — ${bill.biller_name}`,
      });
      await payBill.mutateAsync(bill.id);
      toast.success(`Paid ${bill.biller_name} — earned $${cashback.toFixed(2)} cashback`);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setPayingId(null);
    }
  };

  const handleAddBill = async () => {
    if (!newBiller || !newAmount || !newDueDate || !newAccountNumber.trim()) {
      toast.error("Fill in all fields including account number");
      return;
    }
    try {
      await addBill.mutateAsync({
        biller_name: newBiller,
        category: newCategory,
        amount: parseFloat(newAmount),
        due_date: newDueDate,
        account_number: newAccountNumber.trim(),
      });
      toast.success("Bill added");
      setShowAdd(false);
      setNewBiller("");
      setNewAmount("");
      setNewDueDate("");
      setNewAccountNumber("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add bill");
    }
  };

  const filteredBills = bills.filter(b =>
    !search || b.biller_name.toLowerCase().includes(search.toLowerCase())
  );

  const unpaidBills = filteredBills.filter(b => !b.is_paid);
  const paidBills = filteredBills.filter(b => b.is_paid);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pay Bills</h1>
            <p className="text-muted-foreground text-sm mt-1">Pay utilities, subscriptions, and more</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </motion.div>

      {/* Add Bill Form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 bg-card border-border space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Category</label>
              <select
                value={newCategory}
                onChange={e => handleCategoryChange(e.target.value)}
                className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm"
              >
                {BILL_CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Provider</label>
              <select
                value={newBiller}
                onChange={e => handleProviderChange(e.target.value)}
                className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm"
              >
                {(BILL_PROVIDERS[newCategory] || []).map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Amount ($)</label>
                <Input type="number" placeholder="Amount" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Account / Reference Number</label>
              <Input placeholder="e.g. 1234-5678-9012" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value)} className="bg-secondary border-border font-mono" />
            </div>
            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="bg-secondary border-border" />
            <Button onClick={handleAddBill} disabled={addBill.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90">
              {addBill.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Bill"}
            </Button>
          </Card>
        </motion.div>
      )}

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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Unpaid Bills */}
          {unpaidBills.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Bills</h3>
              <div className="space-y-2">
                {unpaidBills.map((bill) => (
                  <Card key={bill.id} className="p-4 bg-card border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{bill.biller_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">{bill.category}</Badge>
                          <p className="text-xs text-muted-foreground">Due {format(new Date(bill.due_date), "MMM d")}</p>
                        </div>
                        {bill.account_number && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            Acct: •••• {bill.account_number.slice(-4)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold font-mono">${Number(bill.amount).toFixed(2)}</p>
                        <Button
                          size="sm"
                          onClick={() => handlePayClick(bill)}
                          disabled={payingId === bill.id}
                          className="bg-foreground text-background hover:bg-foreground/90 h-8 gap-1"
                        >
                          {payingId === bill.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Pay <ArrowRight className="w-3 h-3" /></>}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Paid Bills */}
          {paidBills.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Paid</h3>
              <div className="space-y-2">
                {paidBills.map((bill) => (
                  <Card key={bill.id} className="p-4 bg-card border-border opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{bill.biller_name}</p>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">{bill.category}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold font-mono">${Number(bill.amount).toFixed(2)}</p>
                        <Badge className="bg-success/10 text-success border-0 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {bills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No bills yet. Add a bill to get started!</p>
          )}
        </>
      )}

      {/* Cashback Notice */}
      {/* Payment Confirmation Dialog */}
      <Dialog open={!!confirmBill} onOpenChange={(open) => !open && setConfirmBill(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Confirm Payment
            </DialogTitle>
            <DialogDescription>Please review your payment details before proceeding.</DialogDescription>
          </DialogHeader>
          {confirmBill && (
            <div className="space-y-3 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-semibold">{confirmBill.biller_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono">•••• {(confirmBill.account_number || "").slice(-4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="secondary" className="text-[10px]">{confirmBill.category}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold font-mono">${Number(confirmBill.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cashback (1%)</span>
                <span className="text-success font-mono">+${(confirmBill.amount * 0.01).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-[10px] text-muted-foreground text-center">
                  By confirming, you authorize this payment from your Ξ╳oSky wallet.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmBill(null)}>Cancel</Button>
            <Button onClick={handleConfirmPay} className="bg-foreground text-background hover:bg-foreground/90 gap-1">
              <ArrowRight className="w-4 h-4" /> Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
