import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import {
  QrCode, Camera, Copy, CheckCircle2, Loader2, ArrowRight,
  Share2, DollarSign, ArrowLeft, AlertTriangle, X
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

type View = "home" | "receive" | "scan" | "confirm" | "done";

interface ExoPayload {
  app: "exosky";
  handle: string;
  amount?: number;
  note?: string;
}

function buildPayloadUrl(payload: ExoPayload): string {
  // Use a deep-link style URL so external QR scanners open meaningfully
  const base = window.location.origin + "/qr/pay";
  const params = new URLSearchParams();
  params.set("to", payload.handle);
  if (payload.amount) params.set("amount", String(payload.amount));
  if (payload.note) params.set("note", payload.note);
  return `${base}?${params.toString()}`;
}

function parseScannedData(raw: string): { handle: string; amount?: number; note?: string } | null {
  try {
    // Try ExoSky URL format first
    if (raw.includes("/qr/pay")) {
      const url = new URL(raw);
      const to = url.searchParams.get("to");
      if (!to) return null;
      return {
        handle: to,
        amount: url.searchParams.get("amount") ? parseFloat(url.searchParams.get("amount")!) : undefined,
        note: url.searchParams.get("note") || undefined,
      };
    }
    // Try JSON format (legacy)
    const json = JSON.parse(raw);
    if (json.handle) return { handle: json.handle, amount: json.amount, note: json.note };
    // Try generic payment QR (e.g. UPI-style)
    return null;
  } catch {
    // Try plain text as handle/address
    if (raw.startsWith("@") || raw.includes("@")) {
      return { handle: raw };
    }
    // Generic: treat as recipient address
    if (raw.length > 3 && raw.length < 200) {
      return { handle: raw };
    }
    return null;
  }
}

export default function QRPayments() {
  const [searchParams] = useSearchParams();
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

  // QR code image
  const [qrImageUrl, setQrImageUrl] = useState<string>("");

  // Scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const html5QrScannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const handle = "@" + (user?.email?.split("@")[0] || "user");

  // Auto-fill from URL params (when opened via scanned QR)
  useEffect(() => {
    const to = searchParams.get("to");
    if (to) {
      setScanRecipient(to);
      const amt = searchParams.get("amount");
      if (amt) setScanAmount(amt);
      const note = searchParams.get("note");
      if (note) setScanNote(note);
      setView("confirm");
    }
  }, [searchParams]);

  // Generate real QR code
  const payload = useMemo<ExoPayload>(() => {
    const p: ExoPayload = { app: "exosky", handle };
    if (receiveAmount) p.amount = parseFloat(receiveAmount);
    if (receiveNote) p.note = receiveNote;
    return p;
  }, [handle, receiveAmount, receiveNote]);

  const payUrl = useMemo(() => buildPayloadUrl(payload), [payload]);

  useEffect(() => {
    QRCode.toDataURL(payUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setQrImageUrl).catch(() => {});
  }, [payUrl]);

  // Start camera scanner
  const startScanner = useCallback(async () => {
    setScanError(null);
    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");
      
      // Small delay to ensure the container is mounted
      await new Promise(r => setTimeout(r, 100));
      
      if (!scannerContainerRef.current) return;
      
      const scannerId = "qr-scanner-region";
      // Ensure element exists
      let el = document.getElementById(scannerId);
      if (!el) {
        el = document.createElement("div");
        el.id = scannerId;
        scannerContainerRef.current.appendChild(el);
      }

      const scanner = new Html5Qrcode(scannerId);
      html5QrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          // Successfully scanned
          const parsed = parseScannedData(decodedText);
          if (parsed) {
            setScanRecipient(parsed.handle);
            if (parsed.amount) setScanAmount(String(parsed.amount));
            if (parsed.note) setScanNote(parsed.note);
            stopScanner();
            setView("confirm");
            toast.success("QR code scanned successfully!");
          } else {
            toast.error("Unrecognized QR code format");
          }
        },
        () => {} // ignore scan failures (normal while aiming)
      );
      setScannerActive(true);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setScanError(err?.message || "Could not access camera. Please allow camera permissions.");
      setScannerActive(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (html5QrScannerRef.current) {
      try {
        await html5QrScannerRef.current.stop();
        html5QrScannerRef.current.clear();
      } catch {}
      html5QrScannerRef.current = null;
    }
    setScannerActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handlePay = async () => {
    if (!scanRecipient || !scanAmount) {
      toast.error("Please fill in all fields");
      return;
    }
    const amt = parseFloat(scanAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
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

  const resetScan = () => {
    stopScanner();
    setScanRecipient("");
    setScanAmount("");
    setScanNote("");
    setScanError(null);
    setView("home");
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
                onClick={() => { setView("scan"); setTimeout(startScanner, 200); }}
                variant="outline"
                className="flex-col h-auto py-8 gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                  <Camera className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold">Scan & Pay</p>
                  <p className="text-[10px] text-muted-foreground">Send money</p>
                </div>
              </Button>
            </div>

            <Card className="p-4 bg-accent/5 border-accent/10">
              <div className="flex items-start gap-3">
                <QrCode className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Instant P2P Transfers</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share your QR code to receive payments. Scan any ExoSky QR or external payment QR to send money instantly.
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

              {/* Real QR Code */}
              <div className="mx-auto w-64 h-64 rounded-2xl bg-white p-3 flex items-center justify-center shadow-lg">
                {qrImageUrl ? (
                  <img src={qrImageUrl} alt="Payment QR Code" className="w-full h-full" />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                )}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Scannable by any QR reader — opens ExoSky payment
              </p>

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
                  maxLength={100}
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" onClick={() => {
                  navigator.clipboard.writeText(payUrl);
                  toast.success("Payment link copied");
                }}>
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "Pay me on ExoSky", text: `Pay ${handle} on ExoSky`, url: payUrl });
                  } else {
                    navigator.clipboard.writeText(payUrl);
                    toast.success("Copied to share");
                  }
                }}>
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            </Card>

            <Button variant="outline" onClick={() => { setView("home"); setReceiveAmount(""); setReceiveNote(""); }} className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </motion.div>
        )}

        {/* Scan */}
        {view === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Live Camera Scanner */}
            <Card className="bg-secondary border-border rounded-2xl overflow-hidden relative">
              <div
                ref={scannerContainerRef}
                className="w-full aspect-square"
                style={{ minHeight: 300 }}
              />
              {!scannerActive && !scanError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Starting camera…</p>
                </div>
              )}
              {scanError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                  <AlertTriangle className="w-10 h-10 text-warning" />
                  <p className="text-sm text-center text-muted-foreground">{scanError}</p>
                  <Button size="sm" variant="outline" onClick={() => startScanner()}>
                    Try Again
                  </Button>
                </div>
              )}
            </Card>

            {/* Manual entry fallback */}
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="text-sm font-bold">Or enter manually</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Recipient</label>
                  <Input
                    placeholder="@username or address"
                    value={scanRecipient}
                    onChange={(e) => setScanRecipient(e.target.value)}
                    className="h-11 bg-secondary border-border mt-1"
                    maxLength={100}
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
                  maxLength={100}
                />
              </div>

              <Button
                onClick={() => {
                  if (!scanRecipient || !scanAmount) {
                    toast.error("Enter recipient and amount");
                    return;
                  }
                  stopScanner();
                  setView("confirm");
                }}
                disabled={!scanRecipient || !scanAmount}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
              >
                Review Payment <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>

            <Button variant="outline" onClick={resetScan} className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Button>
          </motion.div>
        )}

        {/* Confirm Payment */}
        {view === "confirm" && (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <Card className="p-6 bg-card border-border space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-accent/10 mx-auto flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-bold">Confirm Payment</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-muted-foreground">To</span>
                  <span className="text-sm font-semibold font-mono">{scanRecipient}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold font-mono">${parseFloat(scanAmount || "0").toFixed(2)}</span>
                </div>
                {scanNote && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <span className="text-sm text-muted-foreground">Note</span>
                    <span className="text-sm">{scanNote}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-muted-foreground">Balance after</span>
                  <span className="text-sm font-mono">${(balance - parseFloat(scanAmount || "0")).toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setView("scan")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={isSending}
                  className="bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Send <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </Card>
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
              <CheckCircle2 className="w-20 h-20 text-accent" />
            </motion.div>
            <h2 className="text-2xl font-bold">Payment Sent!</h2>
            <p className="text-muted-foreground text-center">
              ${parseFloat(scanAmount || "0").toFixed(2)} was sent to {scanRecipient}
            </p>
            <Button variant="outline" onClick={resetScan}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
