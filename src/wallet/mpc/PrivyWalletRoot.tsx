// Mounts Privy only when VITE_MPC_WALLET=1, the App ID is set and the origin is allowed in Privy.
// The SDK is code-split, so the default build ships none of it.
import { lazy, Suspense, type ReactNode } from "react";

import { mpcConfig } from "./config";

const PrivyBridge = lazy(() => import("./PrivyBridge"));

export function PrivyWalletRoot({ children }: { children: ReactNode }) {
  const cfg = mpcConfig();
  if (!cfg.configured) return <>{children}</>;
  return (
    <Suspense fallback={children}>
      <PrivyBridge appId={cfg.privyAppId!}>{children}</PrivyBridge>
    </Suspense>
  );
}
