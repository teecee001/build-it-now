import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, X, ShieldCheck } from "lucide-react";

interface TransactionPinModalProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  verifyPin: (pin: string) => boolean;
  amount: number;
}

export function TransactionPinModal({ open, onVerified, onCancel, verifyPin, amount }: TransactionPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (verifyPin(pin)) {
      setPin("");
      setError("");
      onVerified();
    } else {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-bold">Transaction PIN</h3>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-warning/10 mx-auto flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-warning" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your PIN to authorize this <span className="font-semibold text-foreground">${amount.toFixed(2)}</span> transaction
            </p>
          </div>

          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 4-6 digit PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && handleSubmit()}
            className="text-center text-2xl tracking-[0.5em] font-mono bg-secondary border-border h-14"
            autoFocus
          />

          {error && <p className="text-xs text-destructive text-center">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={pin.length < 4}
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold"
          >
            Confirm Transaction
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
