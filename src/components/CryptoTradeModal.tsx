import { EASE } from "@/lib/motion";
import { SuccessCheck } from "@/components/ds/SuccessCheck";
import { haptic } from "@/lib/haptics";
import { Check } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useCryptoHoldings } from "@/hooks/useCryptoHoldings";
import { useAuth } from "@/hooks/useAuth";
import { invokeWalletOp } from "@/hooks/useWallet";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Send, Loader2, CheckCircle2, X, QrCode, Camera, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { Html5Qrcode } from "html5-qrcode";
import { getErrorMessage } from "@/lib/errors";

type TradeType = "buy" | "sell" | "swap" | "send";

// Address validation patterns per network
const NETWORK_PATTERNS: Record<string, { pattern: RegExp; label: string; placeholder: string }> = {
  BTC: { pattern: /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/, label: "Bitcoin", placeholder: "1A1zP1... or bc1q..." },
  ETH: { pattern: /^0x[a-fA-F0-9]{40}$/, label: "Ethereum (ERC-20)", placeholder: "0x..." },
  SOL: { pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, label: "Solana", placeholder: "So1..." },
  BNB: { pattern: /^(0x[a-fA-F0-9]{40}|bnb1[a-z0-9]{38})$/, label: "BNB Chain", placeholder: "0x... or bnb1..." },
  XRP: { pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, label: "XRP Ledger", placeholder: "rN7..." },
  ADA: { pattern: /^(addr1|DdzFF)[a-zA-Z0-9]{50,}$/, label: "Cardano", placeholder: "addr1..." },
  DOGE: { pattern: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/, label: "Dogecoin", placeholder: "D..." },
  AVAX: { pattern: /^(0x[a-fA-F0-9]{40}|X-avax1[a-z0-9]{38})$/, label: "Avalanche", placeholder: "0x... or X-avax1..." },
};

// ERC-20 tokens share Ethereum address format
const ERC20_TOKENS = ["LINK", "UNI", "AAVE", "MKR", "SHIB", "MATIC", "CRO", "LDO", "ARB", "OP"];

function getNetworkInfo(code: string) {
  if (NETWORK_PATTERNS[code]) return NETWORK_PATTERNS[code];
  if (ERC20_TOKENS.includes(code)) return NETWORK_PATTERNS["ETH"];
  // Default to Ethereum-style for unknown tokens
  return { pattern: /^0x[a-fA-F0-9]{40}$/, label: "ERC-20", placeholder: "0x..." };
}

function validateAddress(code: string, address: string): { valid: boolean; error?: string } {
  if (!address) return { valid: false };
  const network = getNetworkInfo(code);
  if (!network.pattern.test(address)) {
    return { valid: false, error: `Invalid ${network.label} address format` };
  }
  return { valid: true };
}

interface CryptoTradeModalProps {
  type: TradeType;
  code: string;
  price: number;
  getPrice?: (code: string) => number;
  onClose: () => void;
}

export function CryptoTradeModal({ type, code, price, getPrice, onClose }: CryptoTradeModalProps) {
  const { user } = useAuth();
  const { getWallet } = useMultiCurrencyWallet();
  const { holdingsMap } = useCryptoHoldings();
  const [amount, setAmount] = useState("");
  const [swapTo, setSwapTo] = useState(code === "BTC" ? "ETH" : "BTC");
  const [walletAddress, setWalletAddress] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const startScanner = useCallback(async () => {
    setShowScanner(true);
    // Wait for DOM element to mount
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader-send");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decodedText) => {
            // Strip common crypto URI prefixes like "bitcoin:", "ethereum:"
            const cleaned = decodedText.replace(/^(bitcoin|ethereum|solana|dogecoin|cardano|ripple|bnb):\/?\/?/i, "").split("?")[0];
            setWalletAddress(cleaned.trim());
            stopScanner();
            toast.success("Address scanned!");
          },
          () => {} // ignore scan errors
        );
      } catch (err) {
        toast.error("Camera access denied or unavailable");
        setShowScanner(false);
      }
    }, 100);
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setShowScanner(false);
  }, []);

  const usdWallet = getWallet("USD");
  const usdBalance = usdWallet?.balance ?? 0;
  const cryptoName = CRYPTO_LIST.find(c => c.code === code)?.name ?? code;
  const numAmount = parseFloat(amount) || 0;
  const currentHolding = holdingsMap[code] ?? 0;

  const cryptoAmount = type === "buy" ? numAmount / price : numAmount;
  const usdValue = type === "sell" ? numAmount * price : numAmount;

  const network = getNetworkInfo(code);
  const addressValidation = type === "send" ? validateAddress(code, walletAddress) : { valid: true };

  const canProceed = numAmount > 0 && (
    type === "buy" ? usdBalance >= numAmount :
    type === "send" ? currentHolding >= numAmount && addressValidation.valid :
    currentHolding >= numAmount
  );

  const handleTrade = async () => {
    haptic("confirm");
    if (!user || !canProceed) return;
    setIsProcessing(true);
    try {
      if (type === "buy") {
        if (!usdWallet) throw new Error("No USD wallet");
        await invokeWalletOp({
          operation: "crypto_trade", action: "buy", code,
          amount: numAmount, crypto_amount: cryptoAmount, price, usd_value: numAmount,
        });
        haptic("success");
        toast.success(`Bought ${cryptoAmount.toFixed(6)} ${code}! 🎉`);
      } else if (type === "sell") {
        if (!usdWallet) throw new Error("No USD wallet");
        if (currentHolding < numAmount) throw new Error(`Insufficient ${code} balance`);
        await invokeWalletOp({
          operation: "crypto_trade", action: "sell", code,
          amount: numAmount, crypto_amount: numAmount, price, usd_value: usdValue,
        });
        haptic("success");
        toast.success(`Sold ${numAmount.toFixed(6)} ${code} for $${usdValue.toFixed(2)} 💰`);
      } else if (type === "send") {
        if (currentHolding < numAmount) throw new Error(`Insufficient ${code} balance`);
        await invokeWalletOp({
          operation: "crypto_send",
          code,
          amount: numAmount,
          price,
          address: walletAddress,
        });
        haptic("success");
        toast.success(`Sent ${numAmount.toFixed(6)} ${code} 🚀`);
      } else {
        if (currentHolding < numAmount) throw new Error(`Insufficient ${code} balance`);
        const swapToPrice = getPrice?.(swapTo) || 0;
        if (swapToPrice <= 0) throw new Error(`No price for ${swapTo}`);
        await invokeWalletOp({
          operation: "crypto_swap",
          code,
          swap_to: swapTo,
          amount: numAmount,
          price,
          swap_to_price: swapToPrice,
        });
        haptic("success");
        toast.success(`Swapped ${numAmount} ${code} → ${swapTo} ⚡`);
      }
      setIsDone(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Trade failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const icons = { buy: ArrowDownLeft, sell: ArrowUpRight, swap: ArrowLeftRight, send: Send };
  const colors = { buy: "text-success", sell: "text-destructive", swap: "text-accent", send: "text-warning" };
  const Icon = icons[type];

  if (isDone) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
        <Card className="p-6 bg-card border-border text-center space-y-4">
          <SuccessCheck className="w-12 h-12 mx-auto" />
          <h3 className="text-heading">{type === "send" ? "Crypto Sent!" : "Trade Complete!"}</h3>
          <p className="text-sm text-muted-foreground">Your holdings have been updated.</p>
          <Button onClick={onClose} className="w-full">Done</Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.3, ease: EASE }}>
      <Card className="p-6 bg-card border-border space-y-4 layered-in shadow-card-hover">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colors[type]}`} />
            <h3 className="font-semibold capitalize">{type} {code}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Price */}
        <div className="p-3 bg-secondary/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Current Price</p>
          <p className="text-lg font-bold font-mono">
            ${price > 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : price.toFixed(6)}
          </p>
        </div>

        {/* Wallet Address for Send */}
        {type === "send" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">
              Recipient {network.label} Address
            </label>
            <div className="relative">
              <Input
                placeholder={network.placeholder}
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value.trim())}
                className={`h-12 bg-secondary border-border font-mono text-sm pr-12 ${
                  walletAddress && !addressValidation.valid ? "border-destructive" : 
                  walletAddress && addressValidation.valid ? "border-success" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => showScanner ? stopScanner() : startScanner()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-background/50 rounded-md transition-colors"
                title={showScanner ? "Close scanner" : "Scan QR code"}
              >
                {showScanner ? <XCircle className="w-4 h-4 text-destructive" /> : <QrCode className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>

            {/* QR Scanner */}
            <AnimatePresence>
              {showScanner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg overflow-hidden border border-border bg-black relative">
                    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/80">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Point camera at QR code</span>
                    </div>
                    <div id="qr-reader-send" className="w-full" style={{ minHeight: 220 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {walletAddress && addressValidation.error && (
              <p className="text-xs text-destructive">{addressValidation.error}</p>
            )}
            {walletAddress && addressValidation.valid && (
              <p className="text-xs text-success flex items-center gap-1"><Check className="w-3 h-3" aria-hidden />Valid {network.label} address</p>
            )}
            <p className="text-caption text-muted-foreground">
              Only send {code} to a compatible {network.label} wallet
            </p>
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground font-medium">
            {type === "buy" ? "Amount (USD)" : `Amount (${code})`}
          </label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 bg-secondary border-border font-mono text-lg"
          />
          {type === "buy" && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>You get: ~{cryptoAmount.toFixed(6)} {code}</span>
              <span>Balance: ${usdBalance.toFixed(2)}</span>
            </div>
          )}
          {type === "sell" && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>You get: ~${usdValue.toFixed(2)} USD</span>
              <span>Holdings: {currentHolding.toFixed(6)} {code}</span>
            </div>
          )}
          {(type === "swap" || type === "send") && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Available: {currentHolding.toFixed(6)} {code}</span>
              {type === "send" && numAmount > 0 && <span>≈ ${(numAmount * price).toFixed(2)} USD</span>}
            </div>
          )}
        </div>

        {/* Swap Target */}
        {type === "swap" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Swap to</label>
            <select
              value={swapTo}
              onChange={(e) => setSwapTo(e.target.value)}
              className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm"
            >
              {CRYPTO_LIST.filter(c => c.code !== code).slice(0, 20).map(c => (
                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quick amounts */}
        {type === "buy" && (
          <div className="flex gap-2">
            {[10, 25, 50, 100].map(v => (
              <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setAmount(v.toString())}>
                ${v}
              </Button>
            ))}
          </div>
        )}

        {/* Network fee for send */}
        {type === "send" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network fee</span>
            <span className="text-success font-medium">Free</span>
          </div>
        )}

        <Button
          onClick={handleTrade}
          disabled={!canProceed || isProcessing}
          className={`w-full gap-2 ${
            type === "buy" ? "bg-success text-success-foreground hover:bg-success/90" :
            type === "sell" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" :
            type === "send" ? "bg-warning text-warning-foreground hover:bg-warning/90" :
            "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
          {isProcessing ? "Processing..." : `${type.charAt(0).toUpperCase() + type.slice(1)} ${code}`}
        </Button>
      </Card>
    </motion.div>
  );
}
