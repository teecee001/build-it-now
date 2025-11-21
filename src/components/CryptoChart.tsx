import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Base prices for cryptocurrencies
const basePrices: { [key: string]: number } = {
  BTC: 95000, ETH: 3000, USDT: 1, BNB: 600, XRP: 0.59, ADA: 0.51, SOL: 167,
  DOGE: 0.087, MATIC: 0.81, DOT: 6.6, SHIB: 0.000008, TRX: 0.115, AVAX: 28.3,
  LINK: 13.3, UNI: 7.5, ATOM: 8.7, LTC: 75, XLM: 0.11, BCH: 243, ALGO: 0.193,
  VET: 0.021, FIL: 5.1, ICP: 11.5, SAND: 0.465, MANA: 0.41, AXS: 6.6,
  THETA: 1.57, FTM: 0.51, XTZ: 0.81, EGLD: 28.3, HBAR: 0.056, NEAR: 4.1,
  APE: 1.28, AAVE: 95, CRV: 0.335, LDO: 1.72, QNT: 87, GRT: 0.129,
  ENJ: 0.235, CHZ: 0.081, FLOW: 0.75, XMR: 145, EOS: 0.56, ZEC: 28.3,
  DASH: 25.7, NEO: 11.5, IOTA: 0.159, WAVES: 1.44, KCS: 8.7, BAT: 0.2,
  ZIL: 0.02, ONE: 0.016, KAVA: 0.465, COMP: 53.2, SNX: 2.25, YFI: 7250,
  SUSHI: 0.735, "1INCH": 0.299, REN: 0.062, UMA: 2.25, BAL: 2.25, BNT: 0.558,
  ZRX: 0.37, OMG: 0.41, ANKR: 0.031, SKL: 0.056, STORJ: 0.51, OCEAN: 0.56,
  BAND: 1.28, NMR: 16, RSR: 0.0081, RLC: 1.59, CELO: 0.62, RUNE: 4.1,
  AUDIO: 0.159, ENS: 22.5, IMX: 1.28, GALA: 0.026, AMP: 0.0081, POLY: 0.159,
  CVC: 0.111, PAXG: 1880, GLM: 0.37, LRC: 0.2, FET: 1.14, QTUM: 2.25,
  ICX: 0.159, ONT: 0.2, ZEN: 8.1, IOTX: 0.04, SC: 0.0059, LSK: 0.735,
  DGB: 0.0095, RVN: 0.021, ARDR: 0.095, STEEM: 0.2, DCR: 12.8, XEM: 0.021,
  BTG: 22.5, STX: 1.14
};

// Mock chart data
const generateChartData = (crypto: string) => {
  const data = [];
  const basePrice = basePrices[crypto] || 1;
  
  for (let i = 0; i < 30; i++) {
    const variation = Math.random() * 0.1 - 0.05;
    data.push({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      price: basePrice * (1 + variation * i * 0.1),
    });
  }
  
  return data;
};

const cryptos = [
  { code: "BTC", name: "Bitcoin" },
  { code: "ETH", name: "Ethereum" },
  { code: "USDT", name: "Tether" },
  { code: "BNB", name: "Binance Coin" },
  { code: "XRP", name: "Ripple" },
  { code: "ADA", name: "Cardano" },
  { code: "SOL", name: "Solana" },
  { code: "DOGE", name: "Dogecoin" },
  { code: "MATIC", name: "Polygon" },
  { code: "DOT", name: "Polkadot" },
  { code: "SHIB", name: "Shiba Inu" },
  { code: "TRX", name: "Tron" },
  { code: "AVAX", name: "Avalanche" },
  { code: "LINK", name: "Chainlink" },
  { code: "UNI", name: "Uniswap" },
  { code: "ATOM", name: "Cosmos" },
  { code: "LTC", name: "Litecoin" },
  { code: "XLM", name: "Stellar" },
  { code: "BCH", name: "Bitcoin Cash" },
  { code: "ALGO", name: "Algorand" },
  { code: "VET", name: "VeChain" },
  { code: "FIL", name: "Filecoin" },
  { code: "ICP", name: "Internet Computer" },
  { code: "SAND", name: "The Sandbox" },
  { code: "MANA", name: "Decentraland" },
  { code: "AXS", name: "Axie Infinity" },
  { code: "THETA", name: "Theta Network" },
  { code: "FTM", name: "Fantom" },
  { code: "XTZ", name: "Tezos" },
  { code: "EGLD", name: "MultiversX" },
  { code: "HBAR", name: "Hedera" },
  { code: "NEAR", name: "NEAR Protocol" },
  { code: "APE", name: "ApeCoin" },
  { code: "AAVE", name: "Aave" },
  { code: "CRV", name: "Curve DAO" },
  { code: "LDO", name: "Lido DAO" },
  { code: "QNT", name: "Quant" },
  { code: "GRT", name: "The Graph" },
  { code: "ENJ", name: "Enjin Coin" },
  { code: "CHZ", name: "Chiliz" },
  { code: "FLOW", name: "Flow" },
  { code: "XMR", name: "Monero" },
  { code: "EOS", name: "EOS" },
  { code: "ZEC", name: "Zcash" },
  { code: "DASH", name: "Dash" },
  { code: "NEO", name: "Neo" },
  { code: "IOTA", name: "IOTA" },
  { code: "WAVES", name: "Waves" },
  { code: "KCS", name: "KuCoin Token" },
  { code: "BAT", name: "Basic Attention Token" },
  { code: "ZIL", name: "Zilliqa" },
  { code: "ONE", name: "Harmony" },
  { code: "KAVA", name: "Kava" },
  { code: "COMP", name: "Compound" },
  { code: "SNX", name: "Synthetix" },
  { code: "YFI", name: "yearn.finance" },
  { code: "SUSHI", name: "SushiSwap" },
  { code: "1INCH", name: "1inch" },
  { code: "REN", name: "Ren" },
  { code: "UMA", name: "UMA" },
  { code: "BAL", name: "Balancer" },
  { code: "BNT", name: "Bancor" },
  { code: "ZRX", name: "0x" },
  { code: "OMG", name: "OMG Network" },
  { code: "ANKR", name: "Ankr" },
  { code: "SKL", name: "SKALE Network" },
  { code: "STORJ", name: "Storj" },
  { code: "OCEAN", name: "Ocean Protocol" },
  { code: "BAND", name: "Band Protocol" },
  { code: "NMR", name: "Numeraire" },
  { code: "RSR", name: "Reserve Rights" },
  { code: "RLC", name: "iExec RLC" },
  { code: "CELO", name: "Celo" },
  { code: "RUNE", name: "THORChain" },
  { code: "AUDIO", name: "Audius" },
  { code: "ENS", name: "Ethereum Name Service" },
  { code: "IMX", name: "Immutable X" },
  { code: "GALA", name: "Gala" },
  { code: "AMP", name: "Amp" },
  { code: "POLY", name: "Polymath" },
  { code: "CVC", name: "Civic" },
  { code: "PAXG", name: "PAX Gold" },
  { code: "GLM", name: "Golem" },
  { code: "LRC", name: "Loopring" },
  { code: "FET", name: "Fetch.ai" },
  { code: "QTUM", name: "Qtum" },
  { code: "ICX", name: "ICON" },
  { code: "ONT", name: "Ontology" },
  { code: "ZEN", name: "Horizen" },
  { code: "IOTX", name: "IoTeX" },
  { code: "SC", name: "Siacoin" },
  { code: "LSK", name: "Lisk" },
  { code: "DGB", name: "DigiByte" },
  { code: "RVN", name: "Ravencoin" },
  { code: "ARDR", name: "Ardor" },
  { code: "STEEM", name: "Steem" },
  { code: "DCR", name: "Decred" },
  { code: "XEM", name: "NEM" },
  { code: "BTG", name: "Bitcoin Gold" },
  { code: "STX", name: "Stacks" },
];

export const CryptoChart = () => {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const chartData = generateChartData(selectedCrypto);

  return (
    <Card className="p-8 bg-card border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Real-Time Crypto Chart</h2>
        <div className="w-48">
          <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cryptos.map((crypto) => (
                <SelectItem key={crypto.code} value={crypto.code}>
                  {crypto.code} - {crypto.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full h-[400px] bg-white/5 rounded-lg p-4">
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
      </div>
    </Card>
  );
};
