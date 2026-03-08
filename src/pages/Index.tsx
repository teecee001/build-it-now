import { useState } from "react";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { CryptoChart } from "@/components/CryptoChart";
import { ConversionHistory } from "@/components/ConversionHistory";
import { ConversionResult } from "@/types";

const Index = () => {
  const [conversionHistory, setConversionHistory] = useState<ConversionResult[]>([]);

  const handleConversion = (result: ConversionResult) => {
    setConversionHistory((prev) => [...prev, result]);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Ξ╳oSky Currency Converter
          </h1>
          <p className="text-muted-foreground text-lg">
            Fiat & crypto currencies with real-time charts
          </p>
        </div>

        {/* Currency Converter */}
        <CurrencyConverter onConvert={handleConversion} />

        {/* Crypto Chart */}
        <CryptoChart />

        {/* Conversion History */}
        <ConversionHistory history={conversionHistory} />
      </div>
    </div>
  );
};

export default Index;
