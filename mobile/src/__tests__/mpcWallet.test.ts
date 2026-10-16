/// <reference types="jest" />
import * as LocalAuthentication from 'expo-local-authentication';

import { confirmWithBiometrics } from '@/wallet/mpc/biometric';
import { assertTestnet, isTestnet, mpcConfig } from '@/wallet/mpc/config';
import { isAddress, testnetBalances, toWei } from '@/wallet/mpc/balance';
import { backupOptions } from '@/wallet/mpc/labels';
import { type PrivyLike, privyProvider } from '@/wallet/mpc/privy';
import { unconfiguredProvider } from '@/wallet/mpc/unconfigured';

// jest.mock calls are hoisted above the imports by babel-jest.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));

const ADDR = '0x' + 'ab'.repeat(20);

describe('Exo Wallet config', () => {
  it('is off by default and needs both Privy IDs to be configured', () => {
    expect(mpcConfig({}).enabled).toBe(false);
    expect(mpcConfig({ EXPO_PUBLIC_MPC_WALLET: '1' }).configured).toBe(false);
    expect(mpcConfig({ EXPO_PUBLIC_MPC_WALLET: '1', EXPO_PUBLIC_PRIVY_APP_ID: 'a', EXPO_PUBLIC_PRIVY_CLIENT_ID: 'c' }).configured).toBe(true);
  });
  it('allows only Base Sepolia and Sepolia', () => {
    expect(isTestnet(84532)).toBe(true);
    expect(isTestnet(11155111)).toBe(true);
    for (const mainnet of [1, 8453, 137, 10, 42161]) expect(() => assertTestnet(mainnet)).toThrow(/testnet only/);
  });
});

describe('amounts and addresses', () => {
  it('parses ETH to wei exactly', () => {
    expect(toWei('0.01')).toBe(10n ** 16n);
    expect(toWei('1')).toBe(10n ** 18n);
    expect(toWei('0.000000000000000001')).toBe(1n);
    expect(() => toWei('1e3')).toThrow();
  });
  it('validates addresses', () => {
    expect(isAddress(ADDR)).toBe(true);
    expect(isAddress('0x123')).toBe(false);
  });
  it('reads testnet balances and survives RPC errors', async () => {
    const out = await testnetBalances(ADDR, async (rpc) => { if (rpc.includes('publicnode')) throw new Error('down'); return 0.5; });
    expect(out.map((b) => b.amount)).toEqual([0.5, null]);
  });
});

describe('backup options', () => {
  it('offers iCloud on iOS and Google Drive on Android', () => {
    expect(backupOptions('ios')).toEqual(['icloud', 'password']);
    expect(backupOptions('android')).toEqual(['google-drive', 'password']);
  });
});

describe('providers', () => {
  const fake = (over: Partial<PrivyLike> = {}): PrivyLike => ({
    isReady: true, authenticated: true, address: ADDR, needsRecovery: false, backupMethod: null, recoveryMethods: ['icloud'],
    create: jest.fn(async () => ({ address: ADDR })), setRecovery: jest.fn(async () => undefined), recover: jest.fn(async () => ({ address: ADDR })),
    request: jest.fn(async (a: { method: string }) => (a.method === 'eth_chainId' ? '0x14a34' : '0xhash')) as PrivyLike['request'], switchChain: jest.fn(async () => undefined), ...over,
  });
  it('maps Privy state', async () => {
    expect((await privyProvider(fake({ authenticated: false })).state()).kind).toBe('signed_out');
    expect((await privyProvider(fake({ address: null })).state()).kind).toBe('no_wallet');
    expect((await privyProvider(fake({ needsRecovery: true })).state()).kind).toBe('needs_recovery');
    expect(await privyProvider(fake()).state()).toEqual({ kind: 'ready', address: ADDR, backup: null });
  });
  it('sends only on testnet', async () => {
    const p = fake();
    expect(await privyProvider(p).sendTestnet({ chainId: 84532, to: ADDR, valueWei: 10n ** 16n })).toBe('0xhash');
    expect(p.request).toHaveBeenCalledWith({ method: 'eth_sendTransaction', params: [{ to: ADDR, value: '0x2386f26fc10000' }] });
    await expect(privyProvider(fake()).sendTestnet({ chainId: 8453, to: ADDR, valueWei: 1n })).rejects.toThrow(/testnet only/);
  });
  it('refuses to sign if the wallet is not on the testnet', async () => {
    const p = fake({ request: jest.fn(async (a: { method: string }) => (a.method === 'eth_chainId' ? '0x2105' : '0xhash')) as PrivyLike['request'] });
    await expect(privyProvider(p).sendTestnet({ chainId: 84532, to: ADDR, valueWei: 1n })).rejects.toThrow(/testnet only/);
    expect(p.request).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'eth_sendTransaction' }));
  });
  it('requires a strong password for password backup', async () => {
    const p = fake();
    await expect(privyProvider(p).backup('password', 'short')).rejects.toThrow(/8 characters/);
    await privyProvider(p).backup('password', 'long-enough-pw');
    expect(p.setRecovery).toHaveBeenCalledWith('password', 'long-enough-pw');
    await expect(privyProvider(p).recover('password')).rejects.toThrow(/recovery password/);
  });
  it('refuses everything when unconfigured', async () => {
    const p = unconfiguredProvider({ kind: 'disabled' });
    await expect(p.createWallet()).rejects.toThrow();
    await expect(p.sendTestnet({ chainId: 84532, to: ADDR, valueWei: 1n })).rejects.toThrow();
  });
});

describe('biometric confirm', () => {
  it('confirms, cancels and reports missing biometrics', async () => {
    expect(await confirmWithBiometrics('Send')).toEqual({ ok: true });
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    expect(await confirmWithBiometrics('Send')).toEqual({ ok: false, reason: 'cancelled' });
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await confirmWithBiometrics('Send')).toEqual({ ok: false, reason: 'unavailable' });
  });
});
