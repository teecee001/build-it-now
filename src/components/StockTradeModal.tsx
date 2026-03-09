import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { useStockHoldings } from "@/hooks/useStockHoldings";
import { useAuth } from "@/hooks/useAuth";
import { invokeWalletOp } from "@/hooks/useWallet";
import { ArrowDownLeft, ArrowUpRight, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { STOCK_LIST } from "@/constants/stockList";

type TradeType = "buy" | "sell";

interface StockTradeModalProps {
  type: TradeType;
  ticker: string;
  price: number;
  onClose: () => void;
}

export function StockTradeModal({ type, ticker, price, onClose }: StockTradeModalProps) {
  const { user } = useAuth();
  const { getWallet } = useMultiCurrencyWallet();
  const { addTransaction } = useTransactions();
  const { holdingsMap, upsertHolding } = useStockHoldings();
  const [amount, setAmount] = useState("");
  const [orderType, setOrderType] = useState<"dollars" | "shares">("dollars");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const usdWallet = getWallet("USD");
  const usdBalance = usdWallet?.balance ?? 0;
  const stockName = STOCK_LIST.find(s => s.ticker === ticker)?.name ?? ticker;
  const numAmount = parseFloat(amount) || 0;
  const currentShares = holdingsMap[ticker]?.shares ?? 0;

  const sharesToTrade = orderType === "dollars" ? numAmount / price : numAmount;
  const dollarValue = orderType === "shares" ? numAmount * price : numAmount;

  const canProceed = numAmount > 0 && (
    type === "buy" ? usdBalance >= dollarValue :
    currentShares >= sharesToTrade
  );

  const handleTrade = async () => {
    if (!user || !canProceed) return;
    setIsProcessing(true);
    try {
      if (type === "buy") {
        if (!usdWallet) throw new Error("No USD wallet");
        await invokeWalletOp({
          operation: "stock_trade", action: "buy", ticker,
          shares: sharesToTrade, dollar_value: dollarValue, price,
        });
        toast.success(`Bought ${sharesToTrade.toFixed(4)} shares of ${ticker}! 📈`);
      } else {
        if (!usdWallet) throw new Error("No USD wallet");
        if (currentShares < sharesToTrade) throw new Error(`Insufficient ${ticker} shares`);
        await invokeWalletOp({
          operation: "stock_trade", action: "sell", ticker,
          shares: sharesToTrade, dollar_value: dollarValue, price,
        });
        toast.success(`Sold ${sharesToTrade.toFixed(4)} shares of ${ticker} for $${dollarValue.toFixed(2)} 💰`);
      }
      setIsDone(true);
    } catch (err: any) {
      toast.error(err.message || "Trade failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = type === "buy" ? ArrowDownLeft : ArrowUpRight;

  if (isDone) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="p-6 bg-card border-border text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <h3 className="text-lg font-semibold">Order Filled!</h3>
          <p className="text-sm text-muted-foreground">Your portfolio has been updated.</p>
          <Button onClick={onClose} className="w-full">Done</Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <Card className="p-5 bg-card border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${type === "buy" ? "text-success" : "text-destructive"}`} />
            <h3 className="font-semibold capitalize">{type} {ticker}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Stock Info */}
        <div className="p-3 bg-secondary/50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{stockName}</p>
            <p className="text-lg font-bold font-mono">${price.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Market Order</p>
            <p className="text-xs text-success">● Market Open</p>
          </div>
        </div>

        {/* Order Type Toggle */}
        <div className="flex bg-secondary/50 rounded-lg p-0.5">
          <button
            onClick={() => { setOrderType("dollars"); setAmount(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${orderType === "dollars" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Dollars
          </button>
          <button
            onClick={() => { setOrderType("shares"); setAmount(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${orderType === "shares" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Shares
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground font-medium">
            {orderType === "dollars" ? "Amount (USD)" : "Number of Shares"}
          </label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 bg-secondary border-border font-mono text-lg"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {orderType === "dollars" ? (
              <>
                <span>≈ {sharesToTrade.toFixed(4)} shares</span>
                <span>Balance: ${usdBalance.toFixed(2)}</span>
              </>
            ) : (
              <>
                <span>≈ ${dollarValue.toFixed(2)}</span>
                {type === "sell" && <span>Holdings: {currentShares.toFixed(4)} shares</span>}
                {type === "buy" && <span>Balance: ${usdBalance.toFixed(2)}</span>}
              </>
            )}
          </div>
        </div>

        {/* Quick amounts for buy */}
        {type === "buy" && orderType === "dollars" && (
          <div className="flex gap-2">
            {[25, 50, 100, 500].map(v => (
              <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setAmount(v.toString())}>
                ${v}
              </Button>
            ))}
          </div>
        )}

        {/* P&L for sell */}
        {type === "sell" && currentShares > 0 && holdingsMap[ticker] && (
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg Cost</span>
              <span className="font-mono">${holdingsMap[ticker].avgPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">P&L per share</span>
              <span className={`font-mono font-medium ${price >= holdingsMap[ticker].avgPrice ? "text-success" : "text-destructive"}`}>
                {price >= holdingsMap[ticker].avgPrice ? "+" : ""}${(price - holdingsMap[ticker].avgPrice).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Commission</span>
          <span className="text-success font-medium">$0.00</span>
        </div>

        <Button
          onClick={handleTrade}
          disabled={!canProceed || isProcessing}
          className={`w-full gap-2 ${
            type === "buy" ? "bg-success text-success-foreground hover:bg-success/90" :
            "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
          {isProcessing ? "Executing..." : `${type === "buy" ? "Buy" : "Sell"} ${ticker}`}
        </Button>
      </Card>
    </motion.div>
  );
}
