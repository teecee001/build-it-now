import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  result: number;
  timestamp: Date;
}

interface CurrencyConverterProps {
  onConvert: (result: ConversionResult) => void;
}

const currencies = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "BTC", name: "Bitcoin" },
  { code: "ETH", name: "Ethereum" },
  { code: "USDT", name: "Tether" },
];

// Mock exchange rates (in a real app, fetch from API)
const exchangeRates: { [key: string]: number } = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  BTC: 0.000011,
  ETH: 0.00034,
  USDT: 1.09,
};

export const CurrencyConverter = ({ onConvert }: CurrencyConverterProps) => {
  const [fromCurrency, setFromCurrency] = useState("EUR");
  const [toCurrency, setToCurrency] = useState("BTC");
  const [amount, setAmount] = useState("42000");
  const [result, setResult] = useState<number | null>(null);

  const handleConvert = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return;

    // Convert to base (EUR), then to target currency
    const inEUR = amountNum / exchangeRates[fromCurrency];
    const converted = inEUR * exchangeRates[toCurrency];
    
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
              {currencies.map((curr) => (
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
              {currencies.map((curr) => (
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
