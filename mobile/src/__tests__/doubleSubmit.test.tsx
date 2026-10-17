/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports -- modules load after jest.mock hoisting */
// Double-submit protection on the money flows: a second tap while the first request is in
// flight must not reach the backend again (deposit, convert, crypto buy) — plus the hook itself.
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';

import { useSingleFlight } from '@/lib/singleFlight';

// First require of a screen compiles a large module graph; CI runners need more than 5s.
jest.setTimeout(30000);

const pending: { resolve: (v: unknown) => void }[] = [];
const hang = () => new Promise((resolve) => pending.push({ resolve }));
const mockInvoke = jest.fn((_body: Record<string, unknown>) => hang());
const mockConvert = jest.fn((_args: Record<string, unknown>) => hang());
const wallets = [
  { id: 'w1', currency: 'USD', balance: 1000, savings_balance: 0 },
  { id: 'w2', currency: 'EUR', balance: 50, savings_balance: 0 },
];

jest.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() }, from: jest.fn(), channel: jest.fn(), removeChannel: jest.fn() } }));
jest.mock('@/lib/haptics', () => ({ haptic: new Proxy({}, { get: () => () => undefined }) }));
jest.mock('@/lib/toast', () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() }) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => false } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: false }, jest.fn()] }));
jest.mock('@/hooks/useWallet', () => ({ invokeWalletOp: (b: Record<string, unknown>) => mockInvoke(b), useWallet: () => ({ balance: 1000, savingsBalance: 0 }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/hooks/useCryptoHoldings', () => ({ useCryptoHoldings: () => ({ holdingsMap: {} }) }));
jest.mock('@/hooks/useExchangeRates', () => ({ useExchangeRates: () => ({ rates: { USD: 1, EUR: 0.9 }, isLive: true }) }));
jest.mock('@/components/RateAlerts', () => ({ RateAlerts: () => null }));
jest.mock('@/hooks/useMultiCurrencyWallet', () => ({
  slotLimitMessage: () => '',
  useMultiCurrencyWallet: () => ({
    wallets,
    isLoading: false,
    getWallet: (c: string) => wallets.find((w) => w.currency === c),
    addCurrency: { mutateAsync: jest.fn(), isPending: false },
    convertCurrency: { mutateAsync: (b: Record<string, unknown>) => mockConvert(b), isPending: false },
    maxCurrencies: 3, slotsUsed: 2, slotsRemaining: 1, tier: 'free',
  }),
}));

// Two taps inside one act (back-to-back, before any re-render), via the host onClick that
// Pressability maps to onPress. Avoids overlapping act() scopes from un-awaited fireEvent calls.
const doubleTap = (el: { props: Record<string, any> }) =>
  act(async () => {
    const ev = () => ({ nativeEvent: { pageX: 0, pageY: 0, timestamp: Date.now() }, persist() {}, isDefaultPrevented: () => false, stopPropagation() {}, preventDefault() {} });
    el.props.onClick(ev());
    el.props.onClick(ev());
  });
const settle = () => act(async () => { pending.splice(0).forEach((p) => p.resolve({ success: true, convertedAmount: 1 })); await new Promise((r) => setTimeout(r, 0)); });
afterEach(() => jest.clearAllMocks());

test('useSingleFlight runs once while the first call is in flight', async () => {
  const { result } = await renderHook(() => useSingleFlight());
  const fn = jest.fn(hang);
  let a!: Promise<unknown>;
  let b!: Promise<unknown>;
  await act(async () => { a = result.current.run(fn); b = result.current.run(fn); });
  expect(fn).toHaveBeenCalledTimes(1);
  expect(typeof fn.mock.calls[0]).toBe('object');
  await act(async () => { pending.splice(0).forEach((p) => p.resolve('ok')); await Promise.all([a, b]); });
  expect(await b).toBeUndefined();
});

test('deposit: double tap sends one demo_deposit', async () => {
  const Deposit = require('@/app/deposit').default;
  await render(<Deposit />);
  await fireEvent.press(screen.getByText('Debit Card'));
  await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '25');
  const btn = screen.getByLabelText('Deposit $25');
  await doubleTap(btn);
  expect(mockInvoke).toHaveBeenCalledTimes(1);
  expect(mockInvoke.mock.calls[0][0]).toMatchObject({ operation: 'demo_deposit', amount: 25 });
  await settle();
});

test('convert: double tap converts once', async () => {
  const { CurrencyWallets } = require('@/components/CurrencyWallets');
  await render(<CurrencyWallets mode="convert" />);
  await fireEvent.press(screen.getByLabelText('From'));
  await fireEvent.press(screen.getByText('USD ($1000.00)'));
  await fireEvent.press(screen.getByLabelText('To'));
  await fireEvent.press(screen.getByText(/^EUR \(/));
  await fireEvent.changeText(screen.getByPlaceholderText('Amount'), '10');
  const btns = screen.getAllByLabelText('Convert');
  const btn = btns[btns.length - 1];
  await doubleTap(btn);
  expect(mockConvert).toHaveBeenCalledTimes(1);
  expect(mockConvert.mock.calls[0][0]).toMatchObject({ fromCurrency: 'USD', toCurrency: 'EUR', amount: 10 });
  await settle();
});

test('crypto buy: double tap trades once', async () => {
  const { CryptoTradeModal } = require('@/components/CryptoTradeModal');
  await render(<CryptoTradeModal type="buy" code="BTC" price={50000} onClose={jest.fn()} />);
  await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '100');
  const btn = screen.getByLabelText('Buy BTC');
  await doubleTap(btn);
  expect(mockInvoke).toHaveBeenCalledTimes(1);
  expect(mockInvoke.mock.calls[0][0]).toMatchObject({ operation: 'crypto_trade', action: 'buy', code: 'BTC', amount: 100 });
  await settle();
});
