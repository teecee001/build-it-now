// Privy (@privy-io/react-auth) wired to ExoSky's Supabase session via JWT-based auth: there is no
// second sign-in. Privy verifies the Supabase access token against the project's JWKS (sub claim).
import {
  PrivyProvider,
  useCreateWallet,
  usePrivy,
  useSetWalletRecovery,
  useSubscribeToJwtAuthWithFlag,
  useWallets,
} from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { baseSepolia, sepolia } from "viem/chains";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { assertTestnet } from "./config";
import { registerProvider } from "./index";
import { privyProvider, type PrivyLike } from "./privy";
import type { BackupMethod } from "./types";

export default function PrivyBridge({ appId, children }: { appId: string; children: ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Testnets only: Privy refuses to switch to anything not listed here.
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, sepolia],
        embeddedWallets: { ethereum: { createOnLogin: "off" }, showWalletUIs: true },
        appearance: { theme: "dark" },
      }}
    >
      <Sync />
      <Register />
      {children}
    </PrivyProvider>
  );
}

/** Keeps Privy's session in step with Supabase's (sign in, refresh, sign out). */
function Sync() {
  const { session, isLoading } = useAuth();
  const getExternalJwt = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? undefined, []);
  useSubscribeToJwtAuthWithFlag({ isAuthenticated: !!session, isLoading, getExternalJwt });
  return null;
}

const RECOVERY: Record<string, BackupMethod> = { "user-passcode": "password", "google-drive": "google-drive", icloud: "icloud" };

function Register() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { setWalletRecovery } = useSetWalletRecovery();
  const embedded = wallets.find((w) => w.walletClientType === "privy") ?? null;
  const embeddedRef = useRef(embedded);
  useEffect(() => {
    embeddedRef.current = embedded;
  }, [embedded]);

  const linked = user?.wallet?.walletClientType === "privy" ? user.wallet : null;
  const backupMethod = linked?.recoveryMethod ? (RECOVERY[linked.recoveryMethod] ?? null) : null;

  const like = useMemo<PrivyLike>(() => {
    const provider = async () => {
      const w = embeddedRef.current;
      if (!w) throw new Error("No wallet yet.");
      return w.getEthereumProvider();
    };
    return {
      isReady: ready,
      authenticated,
      address: embedded?.address ?? null,
      // On web, Privy prompts for the recovery password or cloud backup itself when a new browser needs it.
      needsRecovery: false,
      backupMethod,
      recoveryMethods: ["google-drive", "password"],
      async create() {
        const w = await createWallet();
        return { address: w.address };
      },
      // Privy's recovery modal lets the user pick password or Google Drive (whatever the dashboard enables).
      async setRecovery() {
        await setWalletRecovery();
      },
      async recover() {
        // Web recovery is prompted by Privy on first use in a new browser.
        const w = embeddedRef.current;
        if (!w) throw new Error("No wallet yet.");
        await w.getEthereumProvider();
        return { address: w.address };
      },
      async request(args) {
        return (await provider()).request(args as never);
      },
      async switchChain(chainId) {
        assertTestnet(chainId);
        const w = embeddedRef.current;
        if (!w) throw new Error("No wallet yet.");
        await w.switchChain(chainId);
      },
    };
  }, [ready, authenticated, embedded, backupMethod, createWallet, setWalletRecovery]);

  useEffect(() => {
    registerProvider(privyProvider(like));
    return () => registerProvider(null);
  }, [like]);
  return null;
}
