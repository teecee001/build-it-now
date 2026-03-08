import { useState, useCallback } from "react";

const PIN_STORAGE_KEY = "x_money_tx_pin_hash";
const PIN_THRESHOLD = 500; // Require PIN for transactions over $500

function simpleHash(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}

export function useTransactionPin() {
  const [isPinSet, setIsPinSet] = useState(() => !!localStorage.getItem(PIN_STORAGE_KEY));

  const setupPin = useCallback((pin: string) => {
    if (pin.length < 4 || pin.length > 6) throw new Error("PIN must be 4-6 digits");
    if (!/^\d+$/.test(pin)) throw new Error("PIN must be digits only");
    localStorage.setItem(PIN_STORAGE_KEY, simpleHash(pin));
    setIsPinSet(true);
  }, []);

  const verifyPin = useCallback((pin: string): boolean => {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return true; // No PIN set
    return simpleHash(pin) === stored;
  }, []);

  const removePin = useCallback(() => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    setIsPinSet(false);
  }, []);

  const requiresPin = useCallback((amountUSD: number): boolean => {
    return isPinSet && amountUSD > PIN_THRESHOLD;
  }, [isPinSet]);

  return { isPinSet, setupPin, verifyPin, removePin, requiresPin, PIN_THRESHOLD };
}
