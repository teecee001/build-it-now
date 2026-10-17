// Port of src/components/StockTradeModal.tsx (same wallet-operation `stock_trade` body).
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, Field, k, Segmented, Sheet } from '@/components/kit';
import { SuccessCheck } from '@/components/SuccessCheck';
import { STOCK_LIST } from '@/constants/stockList';
import { useAuth } from '@/hooks/useAuth';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { useStockHoldings } from '@/hooks/useStockHoldings';
import { invokeWalletOp } from '@/hooks/useWallet';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

type TradeType = 'buy' | 'sell';

export function StockTradeModal({ type, ticker, price, onClose }: { type: TradeType; ticker: string; price: number; onClose: () => void }) {
  const { user } = useAuth();
  const { getWallet } = useMultiCurrencyWallet();
  const { holdingsMap } = useStockHoldings();
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState<'dollars' | 'shares'>('dollars');
  const [isDone, setIsDone] = useState(false);
  const { run, busy: isProcessing } = useSingleFlight();
  const usdWallet = getWallet('USD');
  const usdBalance = usdWallet?.balance ?? 0;
  const stockName = STOCK_LIST.find((s) => s.ticker === ticker)?.name ?? ticker;
  const numAmount = parseFloat(amount) || 0;
  const currentShares = holdingsMap[ticker]?.shares ?? 0;
  const sharesToTrade = orderType === 'dollars' ? numAmount / price : numAmount;
  const dollarValue = orderType === 'shares' ? numAmount * price : numAmount;
  const canProceed = numAmount > 0 && (type === 'buy' ? usdBalance >= dollarValue : currentShares >= sharesToTrade);

  const handleTrade = () =>
    run(async () => {
      haptic.light();
      if (!user || !canProceed) return;
      try {
        if (!usdWallet) throw new Error('No USD wallet');
        if (type === 'sell' && currentShares < sharesToTrade) throw new Error(`Insufficient ${ticker} shares`);
        await invokeWalletOp({ operation: 'stock_trade', action: type, ticker, shares: sharesToTrade, dollar_value: dollarValue, price });
        haptic.success();
        toast.success(type === 'buy' ? `Bought ${sharesToTrade.toFixed(4)} shares of ${ticker}! 📈` : `Sold ${sharesToTrade.toFixed(4)} shares of ${ticker} for $${dollarValue.toFixed(2)} 💰`);
        setIsDone(true);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || 'Trade failed');
      }
    });

  const h = holdingsMap[ticker];
  return (
    <Sheet open onClose={onClose} title={isDone ? undefined : `${type === 'buy' ? 'Buy' : 'Sell'} ${ticker}`}>
      {isDone ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <SuccessCheck size={72} />
          <Text style={k.h2}>Order Filled!</Text>
          <Text style={k.muted}>Your portfolio has been updated.</Text>
          <Btn label="Done" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <View style={[k.rowB, { marginBottom: 12 }]}>
            <View>
              <Text style={k.muted}>{stockName}</Text>
              <Text style={[k.h2, k.mono]}>${price.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={k.muted}>Market Order</Text>
              <Text style={{ color: C.green, fontSize: 12 }}>● Market Open</Text>
            </View>
          </View>
          <View style={{ marginBottom: 12 }}>
            <Segmented options={[{ value: 'dollars', label: 'Dollars' }, { value: 'shares', label: 'Shares' }]} value={orderType} onChange={(v) => { setOrderType(v as 'dollars' | 'shares'); setAmount(''); }} />
          </View>
          <Field label={orderType === 'dollars' ? 'Amount (USD)' : 'Number of Shares'} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <View style={[k.rowB, { marginTop: -4, marginBottom: 10 }]}>
            {orderType === 'dollars' ? (
              <>
                <Text style={k.muted}>≈ {sharesToTrade.toFixed(4)} shares</Text>
                <Text style={k.muted}>Balance: ${usdBalance.toFixed(2)}</Text>
              </>
            ) : (
              <>
                <Text style={k.muted}>≈ ${dollarValue.toFixed(2)}</Text>
                {type === 'sell' ? <Text style={k.muted}>Holdings: {currentShares.toFixed(4)} shares</Text> : <Text style={k.muted}>Balance: ${usdBalance.toFixed(2)}</Text>}
              </>
            )}
          </View>
          {type === 'buy' && orderType === 'dollars' && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {[25, 50, 100, 500].map((v) => <Btn key={v} small variant="outline" label={`$${v}`} style={{ flex: 1 }} onPress={() => setAmount(v.toString())} />)}
            </View>
          )}
          {type === 'sell' && currentShares > 0 && h && (
            <View style={{ gap: 6, marginBottom: 10 }}>
              <View style={k.rowB}><Text style={k.muted}>Avg Cost</Text><Text style={k.text}>${h.avgPrice.toFixed(2)}</Text></View>
              <View style={k.rowB}><Text style={k.muted}>P&amp;L per share</Text><Text style={{ color: price >= h.avgPrice ? C.green : C.red }}>{price >= h.avgPrice ? '+' : ''}${(price - h.avgPrice).toFixed(2)}</Text></View>
            </View>
          )}
          <View style={[k.rowB, { marginBottom: 12 }]}><Text style={k.muted}>Commission</Text><Text style={k.text}>$0.00</Text></View>
          <Btn
            label={isProcessing ? 'Executing...' : `${type === 'buy' ? 'Buy' : 'Sell'} ${ticker}`}
            icon={type === 'buy' ? 'arrow-down' : 'arrow-up'}
            variant={type === 'buy' ? 'primary' : 'danger'}
            onPress={handleTrade}
            busy={isProcessing}
            disabled={!canProceed}
          />
        </>
      )}
    </Sheet>
  );
}
