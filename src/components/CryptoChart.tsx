import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCryptoChartData } from "@/hooks/useExchangeRates";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

// Fallback mock data generator
const generateMockData = (crypto: string) => {
  const basePrices: Record<string, number> = {
    BTC: 95000, ETH: 3000, USDT: 1, BNB: 600, XRP: 0.59, ADA: 0.51, SOL: 167,
    DOGE: 0.087, MATIC: 0.81, DOT: 6.6, SHIB: 0.000008, TRX: 0.115, AVAX: 28.3,
    LINK: 13.3, UNI: 7.5, ATOM: 8.7, LTC: 75, XLM: 0.11, BCH: 243, ALGO: 0.193,
  };
  const basePrice = basePrices[crypto] || 1;
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString(),
    price: basePrice * (1 + (Math.random() * 0.1 - 0.05) * i * 0.1),
  }));
};

export const CryptoChart = () => {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const { data: liveData, isLoading, isError } = useCryptoChartData(selectedCrypto);

  const chartData = liveData || generateMockData(selectedCrypto);
  const isLive = !!liveData && !isError;

  return (
    <Card className="p-8 bg-card border-border">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">Crypto Chart (30d)</h2>
          {isLoading ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </Badge>
          ) : (
            <Badge variant={isLive ? "default" : "secondary"}>
              {isLive ? "● Live Data" : "Mock Data"}
            </Badge>
          )}
        </div>
        <div className="w-48">
          <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRYPTO_LIST.map((crypto) => (
                <SelectItem key={crypto.code} value={crypto.code}>
                  {crypto.code} - {crypto.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full h-[400px] bg-white/5 rounded-lg p-4">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
