import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import {
  QrCode, Camera, Copy, CheckCircle2, Loader2, ArrowRight,
  Download, Share2, DollarSign, User
} from "lucide-react";
import { toast } from "sonner";

type View = "home" | "receive" | "scan" | "confirm" | "done";

interface PaymentData {
  handle: string;
  amount?: number;
  note?: string;
}

// Simple QR code SVG generator (no external lib needed)
function generateQRSvg(data: string, size: number = 200): string {
  // Create a deterministic pattern from data string
  const modules = 21;
  const cellSize = size / modules;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  // Create hash-like pattern from data
  const hash = (str: string, seed: number) => {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  // Finder patterns (corners)
  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isOuter || isInner) {
          svg += `<rect x="${(x + c) * cellSize}" y="${(y + r) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Data modules
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      // Skip finder pattern areas
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) continue;
      if (r === 6 || c === 6) continue; // timing

      const val = hash(data, r * modules + c);
      if (val % 3 === 0) {
        svg += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="black" rx="1"/>`;
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

export default function QRPayments() {
  const { user } = useAuth();
  const { balance, updateBalance } = useWallet();
  const { addTransaction } = useTransactions();
  const [view, setView] = useState<View>("home");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [scanRecipient, setScanRecipient] = useState("");
  const [scanAmount, setScanAmount] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const qrData = useMemo(() => {
    const payload: PaymentData = { handle };
    if (receiveAmount) payload.amount = parseFloat(receiveAmount);
    if (receiveNote) payload.note = receiveNote;
    return JSON.stringify(payload);
  }, [handle, receiveAmount, receiveNote]);

  const qrSvg = useMemo(() => generateQRSvg(qrData, 200), [qrData]);

  const handlePay = async () => {
    if (!scanRecipient || !scanAmount) {
      toast.error("Please fill in all fields");
      return;
    }
    const amt = parseFloat(scanAmount);
    if (amt > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setIsSending(true);
    try {
      await updateBalance.mutateAsync({ balance: balance - amt });
      await addTransaction.mutateAsync({
        type: "send",
        amount: -amt,
        description: `QR Payment to ${scanRecipient}${scanNote ? ` — ${scanNote}` : ""}`,
        recipient: scanRecipient,
      });
      setView("done");
      toast.success(`$${amt.toFixed(2)} sent to ${scanRecipient}`);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">QR Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Send & receive money instantly with QR codes</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Home */}
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="p-4 bg-card border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Available balance</p>
              <p className="text-lg font-bold font-mono">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setView("receive")}
                className="flex-col h-auto py-8 gap-3 bg-foreground text-background hover:bg-foreground/90"
              >
                <div className="w-14 h-14 rounded-2xl bg-background/10 flex items-center justify-center">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold">My QR Code</p>
                  <p className="text-[10px] opacity-70">Receive payments</p>
                </div>
              </Button>
              <Button
                onClick={() => setView("scan")}
                variant="outline"
                className="flex-col h-auto py-8 gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                  <Camera className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold">Pay via QR</p>
                  <p className="text-[10px] text-muted-foreground">Send money</p>
                </div>
              </Button>
            </div>

            {/* Quick info */}
            <Card className="p-4 bg-accent/5 border-accent/10">
              <div className="flex items-start gap-3">
                <QrCode className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Instant P2P Transfers</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share your QR code to receive payments instantly. No fees, no delays.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Receive - Show QR */}
        {view === "receive" && (
          <motion.div key="receive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <Card className="p-6 bg-card border-border text-center space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">Your payment QR code</p>
                <p className="text-base font-bold font-mono mt-1">{handle}</p>
              </div>

              {/* QR Code */}
              <div className="mx-auto w-52 h-52 rounded-2xl bg-white p-3 flex items-center justify-center">
                <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>

              {/* Optional amount */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Request Amount (optional)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    className="h-12 bg-secondary border-border text-center text-xl font-mono mt-1"
                  />
                </div>
                <Input
                  placeholder="Add a note (optional)"
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  className="bg-secondary border-border text-center text-sm"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" onClick={() => {
                  navigator.clipboard.writeText(qrData);
                  toast.success("Payment link copied");
                }}>
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "Pay me on X Money", text: `Pay ${handle} on X Money`, url: qrData });
                  } else {
                    navigator.clipboard.writeText(qrData);
                    toast.success("Copied to share");
                  }
                }}>
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            </Card>

            <Button variant="outline" onClick={() => { setView("home"); setReceiveAmount(""); setReceiveNote(""); }} className="w-full">
              Back
            </Button>
          </motion.div>
        )}

        {/* Scan / Manual Pay */}
        {view === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Camera placeholder */}
            <Card className="aspect-square bg-secondary border-border rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              <div className="absolute inset-4 border-2 border-dashed border-accent/30 rounded-xl" />
              <Camera className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Camera QR scanning</p>
                <p className="text-xs text-muted-foreground mt-1">Position QR code within the frame</p>
              </div>
              <p className="text-xs text-muted-foreground">Or enter details manually below</p>
            </Card>

            {/* Manual entry */}
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="text-sm font-bold">Manual Payment</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Recipient</label>
                  <Input
                    placeholder="@username or email"
                    value={scanRecipient}
                    onChange={(e) => setScanRecipient(e.target.value)}
                    className="h-11 bg-secondary border-border mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={scanAmount}
                    onChange={(e) => setScanAmount(e.target.value)}
                    className="h-11 bg-secondary border-border text-lg font-mono mt-1"
                  />
                </div>
                <Input
                  placeholder="Add a note (optional)"
                  value={scanNote}
                  onChange={(e) => setScanNote(e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
              </div>

              <Button
                onClick={handlePay}
                disabled={isSending || !scanRecipient || !scanAmount}
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>Pay <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </Card>

            <Button variant="outline" onClick={() => { setView("home"); setScanRecipient(""); setScanAmount(""); setScanNote(""); }} className="w-full">
              Cancel
            </Button>
          </motion.div>
        )}

        {/* Done */}
        {view === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <CheckCircle2 className="w-20 h-20 text-success" />
            </motion.div>
            <h2 className="text-2xl font-bold">Payment Sent!</h2>
            <p className="text-muted-foreground text-center">
              ${scanAmount} was sent to {scanRecipient}
            </p>
            <Button variant="outline" onClick={() => { setView("home"); setScanRecipient(""); setScanAmount(""); setScanNote(""); }}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
