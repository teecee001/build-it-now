// Web and tests: Privy's Expo SDK is native-only, so the wallet root is a pass-through here.
import type { ReactNode } from 'react';

export const privyNativeReady = () => false;
export const iCloudReady = () => false;
export function PrivyWalletRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
