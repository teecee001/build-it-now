// Wires Privy (@privy-io/expo) into ExoSky. ExoSky's Supabase session is the login (Privy JWT-based auth),
// so there is no second sign-in. Loaded lazily and only when:
//   - EXPO_PUBLIC_MPC_WALLET=1 and both Privy IDs are set (preview/development builds), and
//   - this binary actually contains Privy's native modules (a new EAS build, not an older APK or Expo Go).
import { requireOptionalNativeModule } from 'expo';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UIManager } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

import { assertTestnet, mpcConfig, TESTNETS } from './config';
import { registerProvider } from './index';
import { type PrivyLike, privyProvider } from './privy';
import type { BackupMethod } from './types';

/** True only in builds that include Privy's native dependencies. */
export function privyNativeReady() {
  return !!requireOptionalNativeModule('ExpoCrypto') && UIManager.hasViewManagerConfig?.('RNCWebView') === true;
}
/** iCloud backup needs Privy's native extension module (iOS builds only). */
export const iCloudReady = () => !!requireOptionalNativeModule('ExpoNativeExtensions');

type PrivyModule = typeof import('@privy-io/expo');
let mod: PrivyModule | null = null;
function loadPrivy(): PrivyModule {
  if (!mod) {
    // Privy's documented polyfills, applied only when the wallet is actually used.
    require('fast-text-encoding');
    require('react-native-get-random-values');
    require('@ethersproject/shims');
    mod = require('@privy-io/expo') as PrivyModule;
  }
  return mod;
}

const toPrivyRecovery = (m: BackupMethod, password?: string) =>
  m === 'password' ? ({ recoveryMethod: 'user-passcode', password: password ?? '' } as const) : m === 'icloud' ? ({ recoveryMethod: 'icloud' } as const) : ({ recoveryMethod: 'google-drive' } as const);

export function PrivyWalletRoot({ children }: { children: ReactNode }) {
  const cfg = mpcConfig();
  const { session, loading } = useAuth();
  const getToken = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? undefined, []);
  if (!cfg.configured || !privyNativeReady()) return <>{children}</>;
  const { PrivyProvider } = loadPrivy();
  return (
    <PrivyProvider
      appId={cfg.privyAppId!}
      clientId={cfg.privyClientId!}
      supportedChains={TESTNET_CHAINS}
      config={{ customAuth: { enabled: true, isLoading: loading, getCustomAccessToken: getToken } }}>
      <Register signedIn={!!session} />
      {children}
    </PrivyProvider>
  );
}

// viem-style chain objects for Privy, built from the testnet allow-list only.
const TESTNET_CHAINS = TESTNETS.map((t) => ({
  id: t.chainId,
  name: t.name,
  nativeCurrency: { name: 'Ether', symbol: t.symbol, decimals: 18 },
  rpcUrls: { default: { http: [t.rpc] } },
  blockExplorers: { default: { name: 'Explorer', url: t.explorer } },
  testnet: true,
})) as never;

function Register({ signedIn }: { signedIn: boolean }) {
  const { usePrivy, useEmbeddedEthereumWallet, useSetEmbeddedWalletRecovery, useRecoverEmbeddedWallet, useEmbeddedWalletStateChange } = loadPrivy();
  const { isReady, user } = usePrivy();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const { setRecovery } = useSetEmbeddedWalletRecovery();
  const { recover } = useRecoverEmbeddedWallet();
  const [needsRecovery, setNeedsRecovery] = useState(false);
  useEmbeddedWalletStateChange({ onStateChange: (st) => setNeedsRecovery(st.status === 'needs-recovery') });
  const walletsRef = useRef(wallets);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  const embedded = (user?.linked_accounts ?? []).find((a) => a.type === 'wallet' && (a as { wallet_client_type?: string }).wallet_client_type === 'privy') as { recovery_method?: string } | undefined;
  const backupMethod: BackupMethod | null =
    embedded?.recovery_method === 'icloud' ? 'icloud' : embedded?.recovery_method === 'google-drive' ? 'google-drive' : embedded?.recovery_method === 'user-passcode' ? 'password' : null;

  const like = useMemo<PrivyLike>(() => {
    const provider = async () => {
      const w = walletsRef.current[0];
      if (!w) throw new Error('No wallet yet.');
      return w.getProvider();
    };
    return {
      isReady,
      authenticated: signedIn && !!user,
      address: wallets[0]?.address ?? null,
      needsRecovery,
      backupMethod,
      recoveryMethods: ['google-drive', 'password', ...(iCloudReady() ? (['icloud'] as const) : [])],
      async create() {
        await create();
        const w = walletsRef.current[0];
        return { address: w?.address ?? '' };
      },
      async setRecovery(m, password) {
        await setRecovery(toPrivyRecovery(m, password));
      },
      async recover(m, password) {
        await recover(toPrivyRecovery(m, password));
        return { address: walletsRef.current[0]?.address ?? '' };
      },
      async request(args) {
        return (await provider()).request(args as never);
      },
      async switchChain(chainId) {
        assertTestnet(chainId);
        await (await provider()).request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chainId.toString(16) }] } as never);
      },
    };
  }, [isReady, signedIn, user, wallets, needsRecovery, backupMethod, create, setRecovery, recover]);

  useEffect(() => {
    registerProvider(privyProvider(like));
    return () => registerProvider(null);
  }, [like]);
  return null;
}

