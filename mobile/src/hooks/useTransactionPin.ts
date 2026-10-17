// Server-side transaction PIN. Matches src/hooks/useTransactionPin.ts.
// A PIN saved only on this device no longer counts — set it again in Settings.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PIN_THRESHOLD = 500;

function validPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export function useTransactionPin() {
  const [isPinSet, setIsPinSet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("has_tx_pin").then(({ data, error }) => {
      if (!cancelled && !error) setIsPinSet(data === true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    if (!validPin(pin)) throw new Error("PIN must be 4-6 digits");
    const { error } = await supabase.rpc("set_tx_pin", { p_pin: pin });
    if (error) throw new Error(error.message || "Could not save PIN");
    setIsPinSet(true);
  }, []);

  const verifyPin = useCallback((pin: string): boolean => validPin(pin), []);

  const removePin = useCallback(async () => {
    const { error } = await supabase.rpc("clear_tx_pin");
    if (error) throw new Error(error.message || "Could not remove PIN");
    setIsPinSet(false);
  }, []);

  const requiresPin = useCallback((amountUSD: number): boolean => {
    return isPinSet && amountUSD > PIN_THRESHOLD;
  }, [isPinSet]);

  return { isPinSet, setupPin, verifyPin, removePin, requiresPin, PIN_THRESHOLD };
}
