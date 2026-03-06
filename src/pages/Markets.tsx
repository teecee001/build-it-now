import { CurrencyConverter } from "@/components/CurrencyConverter";
import { CryptoChart } from "@/components/CryptoChart";
import { ConversionHistory } from "@/components/ConversionHistory";
import { ConversionResult } from "@/types";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Markets() {
  const [history, setHistory] = useState<ConversionResult[]>([]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground text-sm mt-1">Convert currencies and track crypto prices</p>
      </motion.div>

      <CurrencyConverter onConvert={(r) => setHistory((p) => [...p, r])} />
      <CryptoChart />
      <ConversionHistory history={history} />
    </div>
  );
}
