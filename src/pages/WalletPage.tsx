import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

export default function WalletPage() {
  const { rates, isLive } = useExchangeRates();
  const [search, setSearch] = useState("");

  const filteredCryptos = CRYPTO_LIST.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
            {isLive ? "● Live Prices" : "Demo Prices"}
          </Badge>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-secondary border-border"
        />
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        {filteredCryptos.map((crypto, i) => {
          const priceUSD = rates[crypto.code] ? 1 / rates[crypto.code] : 0;
          const mockChange = ((Math.sin(i * 1.7 + 0.3) * 8) + 0.5).toFixed(2);
          const isPositive = parseFloat(mockChange) >= 0;
          // Mock holding: simulate some balance
          const mockHolding = i < 5 ? (1000 / (priceUSD || 1)) : 0;
          const holdingUSD = mockHolding * priceUSD;

          return (
            <motion.div
              key={crypto.code}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="p-4 bg-card border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {crypto.code.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{crypto.name}</p>
                      <p className="text-xs text-muted-foreground">{crypto.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">
                      ${priceUSD > 1 ? priceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 }) : priceUSD.toFixed(6)}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 text-success" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                      <p className={`text-xs font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}{mockChange}%
                      </p>
                    </div>
                  </div>
                </div>
                {holdingUSD > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex justify-between">
                    <span className="text-xs text-muted-foreground">Your balance</span>
                    <span className="text-xs font-mono font-medium">
                      {mockHolding.toFixed(4)} {crypto.code} · ${holdingUSD.toFixed(2)}
                    </span>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
