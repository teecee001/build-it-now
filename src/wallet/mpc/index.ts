// Web Exo Wallet (Privy, testnet). Screens talk to MpcWalletProvider only.
import { useEffect, useState } from "react";

import { mpcConfig } from "./config";
import type { MpcWalletProvider } from "./types";
import { unconfiguredProvider } from "./unconfigured";

export * from "./config";
export * from "./types";
export { testnetBalances, isAddress, toWei, type TestnetBalance } from "./balance";
export { privyProvider, type PrivyLike } from "./privy";
export { unconfiguredProvider } from "./unconfigured";

let active: MpcWalletProvider | null = null;
const listeners = new Set<() => void>();
/** PrivyBridge registers itself here once the SDK has loaded. */
export function registerProvider(p: MpcWalletProvider | null) {
  active = p;
  listeners.forEach((l) => l());
}
export function walletProvider(): MpcWalletProvider {
  const cfg = mpcConfig();
  if (!cfg.enabled) return unconfiguredProvider({ kind: "disabled" });
  if (!cfg.configured || !active) {
    const missing = [!cfg.privyAppId && "VITE_PRIVY_APP_ID", !cfg.originAllowed && "allowed origin", cfg.configured && !active && "@privy-io/react-auth"].filter(Boolean) as string[];
    return unconfiguredProvider({ kind: "not_configured", missing });
  }
  return active;
}
/** Re-renders when the provider (or its state) changes. */
export function useWalletProvider(): MpcWalletProvider {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return walletProvider();
}
