# Exo Wallet: Hybrid MPC embedded wallet (Phase 1: testnet only)

Status: built behind a flag (`EXPO_PUBLIC_MPC_WALLET=1`), **off by default**, **testnet only** (Base Sepolia 84532, Sepolia 11155111). No real money. The existing read-only WalletConnect (Reown) wallet is unchanged.

## 1. Provider research (October 2026)

| | Privy | Web3Auth / MetaMask Embedded Wallets | Coinbase CDP Embedded Wallets |
|---|---|---|---|
| Free tier | Free plan up to 499 MAU, 50K signatures and $1M volume a month ([pricing](https://www.privy.io/pricing)) | Free 1,000 monthly active wallets, but **MPC Core Kit (TSS) is Enterprise only** ([pricing](https://web3auth.io/pricing), [docs](https://docs.metamask.io/embedded-wallets/sdk/)) | 5,000 wallet operations a month free, then $0.005 each ([pricing](https://docs.cdp.coinbase.com/wallets/pricing)) |
| Key model | Shamir key **sharding**: device share, auth share (Privy), recovery share. Reconstructed only inside a TEE (default) or on the device (advanced option) ([docs](https://docs.privy.io/security/wallet-infrastructure/advanced/user-device)) | Free SDKs: SSS with key reconstruction. True **TSS/MPC** (no reconstruction) only in MPC Core Kit (Enterprise) | Keys kept in Coinbase TEEs (secure enclaves) ([GA post](https://www.coinbase.com/developer-platform/discover/launches/embedded-wallets-ga)) |
| User cloud backup | iCloud (Expo iOS, via CloudKit) and Google Drive; password option. Applies to on-device execution ([docs](https://docs.privy.io/wallets/advanced-topics/new-devices/cloud-recovery)) | Device share and MFA factors; Core Kit supports custom factors | No user-held backup share; recovery is via login |
| Expo / React Native | `@privy-io/expo`; native deps (secure store, passkeys, native extensions for iCloud) ([install](https://docs.privy.io/basics/react-native/installation)) | `@web3auth/react-native-sdk` works with Expo; Core Kit needs polyfills ([npm](https://www.npmjs.com/package/@web3auth/react-native-mpc-core-kit)) | Expo managed and bare supported ([docs](https://docs.cdp.coinbase.com/wallets/client-side-development/react-native)) |

### Choice: Privy, with on-device execution and user cloud backup

- It is the only free option whose shape matches the 2-of-3 design: a **device share**, an **auth share** released only after login, and a **recovery share** encrypted to the user's own iCloud or Google Drive.
- Honest caveat: Privy is **not strict threshold MPC**. It uses Shamir sharding, and the key is briefly reassembled in a TEE or on the device to sign. Strict TSS (Web3Auth MPC Core Kit) is Enterprise-only, which breaks the free-tier rule. Coinbase CDP is TEE custody with no user-held backup share.
- The module is provider-agnostic (`mobile/src/wallet/mpc`), so moving to a TSS provider later only needs a new adapter.

## 2. Architecture

```
ExoSky login (Supabase) ──JWT──> Privy custom auth
                                   │
        ┌─────────── 2 of 3 shares sign or recover ───────────┐
   Device share                   Auth share                 Recovery share
   Secure Enclave / Keystore      held by Privy, released     encrypted, key in the user's
   (expo-secure-store,            only to an authenticated    iCloud (iOS) or Google Drive
   biometric-gated)               ExoSky user                 (Android), or a password
```

- `config.ts`: flag, provider IDs, the testnet allow-list, and `assertTestnet()`, which every send passes through.
- `types.ts`: the `MpcWalletProvider` contract (state, create, backup, recover, sendTestnet).
- `privy.ts`: Privy adapter over a small `PrivyLike` surface; `unconfigured.ts` refuses everything with a reason.
- `balance.ts`: read-only testnet balances over public RPCs (reuses the WalletConnect RPC helper).
- `biometric.ts` + `ConfirmSheet.tsx`: one review-and-biometrics flow for every money movement. With the flag on, the existing swipe-to-send (P2P fiat) uses it too; if biometrics are not set up, the existing PIN rule applies.
- Screens: `app/wallet.tsx` (create, backup, balance, send test ETH) and `app/wallet-recover.tsx`. The entry card on the Crypto tab only shows when the flag is on.

## 3. Threat model

| Threat | Mitigation |
|---|---|
| Stolen, unlocked phone | Device share is behind biometrics; every send needs the confirm sheet. Only 1 of 3 shares. |
| ExoSky server or database breach | ExoSky stores **no** key shares. The auth share sits with Privy and needs a valid user session. |
| Privy breach | Privy holds 1 share; the recovery share is encrypted with a key in the user's cloud. TEE reconstruction is the residual trust. |
| Cloud account breach | The recovery share alone is 1 of 3. |
| Phishing or a malicious transaction | The review sheet shows amount, recipient and network; testnet allow-list; Phase 2 adds spend limits through Privy policies. |
| Supply chain (SDK) | Pin versions, review upgrades, keep the adapter small. |
| Real-money mistakes | Phase 1 refuses any non-testnet chain id in code and tests. |

## 4. Recovery flows

1. **Same phone:** biometrics unlock the device share; login gives the auth share.
2. **New phone:** log in to ExoSky (auth share), then restore from iCloud, Google Drive or a password (recovery share). The new phone stores a fresh device share.
3. **Lost cloud access:** device and auth shares can still sign, and the user can create a new backup.
4. **Lost phone and lost cloud:** the wallet can't be recovered. This is the trade-off of not holding a full key, and it's said clearly in onboarding.

## 5. Regulatory note (not legal advice)

Whether this counts as **non-custodial** depends on the jurisdiction and on the facts: who can move funds, and whether any party can do it alone. With ExoSky holding no shares and the provider unable to sign alone, the design aims for non-custodial status. Some regulators look at TEE-based reconstruction and recovery assistance closely, though. Before mainnet, get advice from counsel on money transmission (for example FinCEN MSB guidance and state MTL rules in the US), MiCA/CASP status in the EU, and the Travel Rule. Phase 1 is testnet only and moves no value.

## 6. Phases

- **Phase 1 (this PR):** flag off by default, testnet only, provider-agnostic module, screens, unified biometric confirm, tests. Privy SDK not installed until the app IDs exist.
- **Phase 1b (needs Maurice):** create the Privy app, install `@privy-io/expo` and wire `PrivyBridge` (Supabase JWT as custom auth), enable on-device execution plus iCloud/Google Drive recovery, then ship an EAS dev build. It won't run in Expo Go because of the native modules.
- **Phase 2:** spend limits and policies, address book, gas sponsorship on testnet, web support.
- **Phase 3 (only after legal review and a security audit):** mainnet, behind a separate flag.

## 7. What Maurice needs to create (free)

1. A Privy account and app at https://dashboard.privy.io. Copy the **App ID** and create a **Client ID** for the mobile app (App settings > Clients). Set them as `EXPO_PUBLIC_PRIVY_APP_ID` and `EXPO_PUBLIC_PRIVY_CLIENT_ID` in `eas.json` (preview env) or `.env`.
2. In Privy: **Wallets > Advanced**, choose on-device execution. **Authentication**: add a custom JWT provider pointing at the Supabase JWKS. **Recovery**: enable iCloud (needs an Apple CloudKit container and API token in the Apple Developer account) and Google Drive (needs a Google OAuth client in Google Cloud Console).
3. Set `EXPO_PUBLIC_MPC_WALLET=1` only on the preview profile.
