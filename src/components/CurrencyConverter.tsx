import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CURRENCIES } from "@/constants/currencies";
import { ConversionResult } from "@/types";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface CurrencyConverterProps {
  onConvert: (result: ConversionResult) => void;
}

export const CurrencyConverter = ({ onConvert }: CurrencyConverterProps) => {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BTC");
  const [amount, setAmount] = useState("1000");
  const [result, setResult] = useState<number | null>(null);
  const { rates, isLoading, isLive } = useExchangeRates();

  const handleConvert = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return;

    const inUSD = amountNum / rates[fromCurrency];
    const converted = inUSD * rates[toCurrency];

    setResult(converted);

    onConvert({
      from: fromCurrency,
      to: toCurrency,
      amount: amountNum,
      result: converted,
      timestamp: new Date(),
    });
  };

  return (
    <Card className="p-8 bg-card border-border">
      <div className="flex items-center justify-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold">Convert Currency</h2>
        {isLoading ? (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading rates...
          </Badge>
        ) : (
          <Badge variant={isLive ? "default" : "secondary"}>
            {isLive ? "● Live Rates" : "Mock Rates"}
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">From:</label>
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">To:</label>
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <label className="text-sm text-muted-foreground">Amount:</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-secondary border-border text-lg"
          placeholder="Enter amount"
        />
      </div>

      <Button
        onClick={handleConvert}
        className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-lg py-6 font-semibold shadow-glow"
        disabled={isLoading}
      >
        {isLoading ? "Loading Rates..." : "Convert"}
      </Button>

      {result !== null && (
        <div className="mt-8 text-center">
          <p className="text-3xl font-bold text-foreground">
            {amount} {fromCurrency} = {result.toFixed(4)} {toCurrency}
          </p>
        </div>
      )}
    </Card>
  );
};
