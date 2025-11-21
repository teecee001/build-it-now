import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CURRENCIES, EXCHANGE_RATES } from "@/constants/currencies";
import { ConversionResult } from "@/types";

interface CurrencyConverterProps {
  onConvert: (result: ConversionResult) => void;
}


export const CurrencyConverter = ({ onConvert }: CurrencyConverterProps) => {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BTC");
  const [amount, setAmount] = useState("1000");
  const [result, setResult] = useState<number | null>(null);

  const handleConvert = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return;

    // Convert using USD as base currency
    const inUSD = amountNum / EXCHANGE_RATES[fromCurrency];
    const converted = inUSD * EXCHANGE_RATES[toCurrency];
    
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
      <h2 className="text-2xl font-semibold mb-6 text-center">Convert Currency</h2>
      
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
      >
        Convert
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
