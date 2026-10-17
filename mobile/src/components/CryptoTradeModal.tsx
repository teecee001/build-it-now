// Port of src/components/CryptoTradeModal.tsx (same wallet-operation bodies). The address QR
// scanner uses expo-camera instead of html5-qrcode.
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Btn, Field, type IconName, k, Select, Sheet } from '@/components/kit';
import { SuccessCheck } from '@/components/SuccessCheck';
import { CRYPTO_LIST } from '@/constants/cryptoList';
import { useAuth } from '@/hooks/useAuth';
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { invokeWalletOp } from '@/hooks/useWallet';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

export type TradeType = 'buy' | 'sell' | 'swap' | 'send';
const NETWORK_PATTERNS: Record<string, { pattern: RegExp; label: string; placeholder: string }> = {
  BTC: { pattern: /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/, label: 'Bitcoin', placeholder: '1A1zP1... or bc1q...' },
  ETH: { pattern: /^0x[a-fA-F0-9]{40}$/, label: 'Ethereum (ERC-20)', placeholder: '0x...' },
  SOL: { pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, label: 'Solana', placeholder: 'So1...' },
  BNB: { pattern: /^(0x[a-fA-F0-9]{40}|bnb1[a-z0-9]{38})$/, label: 'BNB Chain', placeholder: '0x... or bnb1...' },
  XRP: { pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, label: 'XRP Ledger', placeholder: 'rN7...' },
  ADA: { pattern: /^(addr1|DdzFF)[a-zA-Z0-9]{50,}$/, label: 'Cardano', placeholder: 'addr1...' },
  DOGE: { pattern: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/, label: 'Dogecoin', placeholder: 'D...' },
  AVAX: { pattern: /^(0x[a-fA-F0-9]{40}|X-avax1[a-z0-9]{38})$/, label: 'Avalanche', placeholder: '0x... or X-avax1...' },
};
const ERC20_TOKENS = ['LINK', 'UNI', 'AAVE', 'MKR', 'SHIB', 'MATIC', 'CRO', 'LDO', 'ARB', 'OP'];
function getNetworkInfo(code: string) {
  if (NETWORK_PATTERNS[code]) return NETWORK_PATTERNS[code];
  if (ERC20_TOKENS.includes(code)) return NETWORK_PATTERNS.ETH;
  return { pattern: /^0x[a-fA-F0-9]{40}$/, label: 'ERC-20', placeholder: '0x...' };
}
export function validateAddress(code: string, address: string): { valid: boolean; error?: string } {
  if (!address) return { valid: false };
  const n = getNetworkInfo(code);
  return n.pattern.test(address) ? { valid: true } : { valid: false, error: `Invalid ${n.label} address format` };
}
const ICONS: Record<TradeType, IconName> = { buy: 'arrow-down', sell: 'arrow-up', swap: 'swap-horizontal', send: 'send' };

export function CryptoTradeModal({ type, code, price, getPrice, onClose }: { type: TradeType; code: string; price: number; getPrice?: (c: string) => number; onClose: () => void }) {
  const { user } = useAuth();
  const { getWallet } = useMultiCurrencyWallet();
  const { holdingsMap } = useCryptoHoldings();
  const [amount, setAmount] = useState('');
  const [txPin, setTxPin] = useState('');
  const [swapTo, setSwapTo] = useState(code === 'BTC' ? 'ETH' : 'BTC');
  const [walletAddress, setWalletAddress] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isDone, setIsDone] = useState(false);
  const { run, busy: isProcessing } = useSingleFlight();

  const usdWallet = getWallet('USD');
  const usdBalance = usdWallet?.balance ?? 0;
  const numAmount = parseFloat(amount) || 0;
  const currentHolding = holdingsMap[code] ?? 0;
  const cryptoAmount = type === 'buy' ? numAmount / price : numAmount;
  const usdValue = type === 'sell' ? numAmount * price : numAmount;
  const network = getNetworkInfo(code);
  const addressValidation = type === 'send' ? validateAddress(code, walletAddress) : { valid: true as boolean, error: undefined as string | undefined };
  const canProceed = numAmount > 0 && (type === 'buy' ? usdBalance >= numAmount : type === 'send' ? currentHolding >= numAmount && addressValidation.valid : currentHolding >= numAmount);

  const startScanner = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) { toast.error('Camera access denied or unavailable'); return; }
    }
    setShowScanner(true);
  };

  const handleTrade = () =>
    run(async () => {
      haptic.light();
      if (!user || !canProceed) return;
      try {
        if (type === 'buy') {
          if (!usdWallet) throw new Error('No USD wallet');
          await invokeWalletOp({ operation: 'crypto_trade', action: 'buy', code, amount: numAmount, crypto_amount: cryptoAmount, price, usd_value: numAmount, pin: txPin });
          haptic.success();
          toast.success(`Bought ${cryptoAmount.toFixed(6)} ${code}! 🎉`);
        } else if (type === 'sell') {
          if (!usdWallet) throw new Error('No USD wallet');
          if (currentHolding < numAmount) throw new Error(`Insufficient ${code} balance`);
          await invokeWalletOp({ operation: 'crypto_trade', action: 'sell', code, amount: numAmount, crypto_amount: numAmount, price, usd_value: usdValue, pin: txPin });
          haptic.success();
          toast.success(`Sold ${numAmount.toFixed(6)} ${code} for $${usdValue.toFixed(2)} 💰`);
        } else if (type === 'send') {
          throw new Error('On-chain withdrawals are not available. No coins were moved.');
        } else {
          if (currentHolding < numAmount) throw new Error(`Insufficient ${code} balance`);
          const swapToPrice = getPrice?.(swapTo) || 0;
          if (swapToPrice <= 0) throw new Error(`No price for ${swapTo}`);
          await invokeWalletOp({ operation: 'crypto_swap', code, swap_to: swapTo, amount: numAmount, price, swap_to_price: swapToPrice, pin: txPin });
          haptic.success();
          toast.success(`Swapped ${numAmount} ${code} → ${swapTo} ⚡`);
        }
        setIsDone(true);
      } catch (err: unknown) {
        haptic.error();
        toast.error(getErrorMessage(err) || 'Trade failed');
      }
    });

  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <Sheet open onClose={onClose} title={isDone ? undefined : `${label} ${code}`}>
      {isDone ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <SuccessCheck size={72} />
          <Text style={k.h2}>{type === 'send' ? 'Crypto Sent!' : 'Trade Complete!'}</Text>
          <Text style={k.muted}>Your holdings have been updated.</Text>
          <Btn label="Done" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <View style={{ backgroundColor: '#1C1C1F', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={k.muted}>Current Price</Text>
            <Text style={[k.h2, k.mono]}>${price > 1 ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : price.toFixed(6)}</Text>
          </View>
          {type === 'send' && (
            <View style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Field label={`Recipient ${network.label} Address`} placeholder={network.placeholder} value={walletAddress} onChangeText={(v) => setWalletAddress(v.trim())} autoCapitalize="none" autoCorrect={false} />
                </View>
                <Pressable accessibilityLabel={showScanner ? 'Close scanner' : 'Scan QR code'} onPress={() => (showScanner ? setShowScanner(false) : startScanner())} style={{ padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: '#1C1C1F' }}>
                  <Ionicons name={showScanner ? 'close-circle-outline' : 'qr-code-outline'} size={20} color={C.text} />
                </Pressable>
              </View>
              {showScanner && (
                <View style={{ borderRadius: 12, overflow: 'hidden', height: 220, marginBottom: 8 }}>
                  <Text style={[k.muted, { fontSize: 12, padding: 6 }]}>Point camera at QR code</Text>
                  <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => {
                      const cleaned = data.replace(/^(bitcoin|ethereum|solana|dogecoin|cardano|ripple|bnb):\/?\/?/i, '').split('?')[0];
                      setWalletAddress(cleaned.trim());
                      setShowScanner(false);
                      haptic.success();
                      toast.success('Address scanned!');
                    }}
                  />
                </View>
              )}
              {walletAddress && addressValidation.error ? <Text style={{ color: C.red, fontSize: 12 }}>{addressValidation.error}</Text> : null}
              {walletAddress && addressValidation.valid ? <Text style={{ color: C.green, fontSize: 12 }}>✓ Valid {network.label} address</Text> : null}
              <Text style={[k.muted, { fontSize: 11, marginTop: 2 }]}>Only send {code} to a compatible {network.label} wallet</Text>
            </View>
          )}
          <Field label={type === 'buy' ? 'Amount (USD)' : `Amount (${code})`} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <View style={[k.rowB, { marginTop: -4, marginBottom: 10 }]}>
            {type === 'buy' && (<><Text style={k.muted}>You get: ~{cryptoAmount.toFixed(6)} {code}</Text><Text style={k.muted}>Balance: ${usdBalance.toFixed(2)}</Text></>)}
            {type === 'sell' && (<><Text style={k.muted}>You get: ~${usdValue.toFixed(2)} USD</Text><Text style={k.muted}>Holdings: {currentHolding.toFixed(6)} {code}</Text></>)}
            {(type === 'swap' || type === 'send') && (<><Text style={k.muted}>Available: {currentHolding.toFixed(6)} {code}</Text>{type === 'send' && numAmount > 0 ? <Text style={k.muted}>≈ ${(numAmount * price).toFixed(2)} USD</Text> : null}</>)}
          </View>
          {type === 'swap' && <Select label="Swap to" value={swapTo} onChange={setSwapTo} placeholder="Swap to" options={CRYPTO_LIST.filter((c) => c.code !== code).slice(0, 20).map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))} />}
          {type === 'buy' && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {[10, 25, 50, 100].map((v) => <Btn key={v} small variant="outline" label={`$${v}`} style={{ flex: 1 }} onPress={() => setAmount(v.toString())} />)}
            </View>
          )}
          {type === 'send' && <Text style={[k.muted, { marginBottom: 10 }]}>On-chain withdrawals are not available. No coins will be moved.</Text>}
          {(type === 'buy' ? numAmount : type === 'sell' ? usdValue : numAmount * price) > 500 && (
            <Field placeholder="Transaction PIN (if you set one)" secureTextEntry keyboardType="number-pad" maxLength={6} value={txPin} onChangeText={(v) => setTxPin(v.replace(/\D/g, ''))} />
          )}
          <Btn label={isProcessing ? 'Processing...' : `${label} ${code}`} icon={ICONS[type]} variant={type === 'sell' ? 'danger' : 'primary'} onPress={handleTrade} busy={isProcessing} disabled={!canProceed || type === 'send'} />
        </>
      )}
    </Sheet>
  );
}
