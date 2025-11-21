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
  // Fiat Currencies
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "KRW", name: "South Korean Won" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "AED", name: "UAE Dirham" },
  { code: "COP", name: "Colombian Peso" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "RON", name: "Romanian Leu" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "HRK", name: "Croatian Kuna" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "IQD", name: "Iraqi Dinar" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "DZD", name: "Algerian Dinar" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "CRC", name: "Costa Rican Colon" },
  { code: "GTQ", name: "Guatemalan Quetzal" },
  { code: "HNL", name: "Honduran Lempira" },
  { code: "PAB", name: "Panamanian Balboa" },
  { code: "BOB", name: "Bolivian Boliviano" },
  { code: "PYG", name: "Paraguayan Guarani" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "TTD", name: "Trinidad Dollar" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "BZD", name: "Belize Dollar" },
  { code: "NIO", name: "Nicaraguan Cordoba" },
  { code: "SVC", name: "Salvadoran Colon" },
  { code: "AWG", name: "Aruban Florin" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "KYD", name: "Cayman Islands Dollar" },
  { code: "XCD", name: "East Caribbean Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "FJD", name: "Fijian Dollar" },
  { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "SCR", name: "Seychellois Rupee" },
  { code: "PGK", name: "Papua New Guinean Kina" },
  { code: "SBD", name: "Solomon Islands Dollar" },
  { code: "TOP", name: "Tongan Pa'anga" },
  { code: "VUV", name: "Vanuatu Vatu" },
  { code: "WST", name: "Samoan Tala" },
  { code: "XPF", name: "CFP Franc" },
  { code: "AFN", name: "Afghan Afghani" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "KGS", name: "Kyrgyzstani Som" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "TJS", name: "Tajikistani Somoni" },
  { code: "TMT", name: "Turkmenistani Manat" },
  { code: "UZS", name: "Uzbekistani Som" },
  
  // Cryptocurrencies
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

// Mock exchange rates (in a real app, fetch from API)
const exchangeRates: { [key: string]: number } = {
  // Fiat Currencies (base: EUR = 1)
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  JPY: 163.5,
  AUD: 1.68,
  CAD: 1.52,
  CHF: 0.94,
  CNY: 7.85,
  SEK: 11.45,
  NZD: 1.82,
  MXN: 18.75,
  SGD: 1.45,
  HKD: 8.52,
  NOK: 11.95,
  KRW: 1445.0,
  TRY: 37.25,
  RUB: 105.5,
  INR: 91.2,
  BRL: 5.35,
  ZAR: 19.85,
  DKK: 7.46,
  PLN: 4.32,
  THB: 37.5,
  IDR: 17250.0,
  HUF: 385.0,
  CZK: 24.5,
  ILS: 3.95,
  CLP: 1055.0,
  PHP: 61.5,
  AED: 4.0,
  COP: 4275.0,
  SAR: 4.09,
  MYR: 4.85,
  RON: 4.97,
  ARS: 1095.0,
  VND: 27650.0,
  BGN: 1.96,
  HRK: 7.53,
  PKR: 303.5,
  EGP: 53.75,
  NGN: 1755.0,
  BDT: 130.5,
  UAH: 45.0,
  KES: 140.5,
  QAR: 3.97,
  PEN: 4.05,
  MAD: 10.75,
  IQD: 1425.0,
  KWD: 0.335,
  OMR: 0.42,
  JOD: 0.77,
  LKR: 325.0,
  BHD: 0.41,
  GHS: 17.5,
  TND: 3.42,
  UYU: 42.5,
  DZD: 146.5,
  ISK: 150.0,
  CRC: 555.0,
  GTQ: 8.45,
  HNL: 27.0,
  PAB: 1.09,
  BOB: 7.53,
  PYG: 8150.0,
  DOP: 65.5,
  TTD: 7.4,
  JMD: 169.5,
  BBD: 2.18,
  BZD: 2.2,
  NIO: 40.0,
  SVC: 9.54,
  AWG: 1.96,
  BSD: 1.09,
  KYD: 0.91,
  XCD: 2.95,
  BND: 1.45,
  FJD: 2.46,
  MVR: 16.8,
  MUR: 50.5,
  NPR: 146.0,
  SCR: 14.85,
  PGK: 4.35,
  SBD: 9.15,
  TOP: 2.58,
  VUV: 129.5,
  WST: 2.98,
  XPF: 119.3,
  AFN: 76.5,
  AMD: 422.0,
  AZN: 1.85,
  BYN: 3.56,
  GEL: 3.05,
  KGS: 94.5,
  KZT: 525.0,
  MDL: 19.75,
  TJS: 11.9,
  TMT: 3.82,
  UZS: 14050.0,
  
  // Cryptocurrencies (in EUR)
  BTC: 0.000011,
  ETH: 0.00034,
  USDT: 1.09,
  BNB: 0.0018,
  XRP: 1.85,
  ADA: 2.15,
  SOL: 0.0065,
  DOGE: 12.5,
  MATIC: 1.35,
  DOT: 0.165,
  SHIB: 145000.0,
  TRX: 9.5,
  AVAX: 0.0385,
  LINK: 0.082,
  UNI: 0.145,
  ATOM: 0.125,
  LTC: 0.0145,
  XLM: 9.85,
  BCH: 0.0045,
  ALGO: 5.65,
  VET: 52.5,
  FIL: 0.215,
  ICP: 0.095,
  SAND: 2.35,
  MANA: 2.65,
  AXS: 0.165,
  THETA: 0.695,
  FTM: 2.15,
  XTZ: 1.35,
  EGLD: 0.0385,
  HBAR: 19.5,
  NEAR: 0.265,
  APE: 0.855,
  AAVE: 0.0115,
  CRV: 3.25,
  LDO: 0.635,
  QNT: 0.0125,
  GRT: 8.45,
  ENJ: 4.65,
  CHZ: 13.5,
  FLOW: 1.45,
  XMR: 0.0075,
  EOS: 1.95,
  ZEC: 0.0385,
  DASH: 0.0425,
  NEO: 0.095,
  IOTA: 6.85,
  WAVES: 0.755,
  KCS: 0.125,
  BAT: 5.45,
  ZIL: 53.5,
  ONE: 67.5,
  KAVA: 2.35,
  COMP: 0.0205,
  SNX: 0.485,
  YFI: 0.00015,
  SUSHI: 1.485,
  "1INCH": 3.65,
  REN: 17.5,
  UMA: 0.485,
  BAL: 0.485,
  BNT: 1.955,
  ZRX: 2.95,
  OMG: 2.65,
  ANKR: 35.5,
  SKL: 19.5,
  STORJ: 2.15,
  OCEAN: 1.95,
  BAND: 0.855,
  NMR: 0.0685,
  RSR: 135.0,
  RLC: 0.685,
  CELO: 1.755,
  RUNE: 0.265,
  AUDIO: 6.85,
  ENS: 0.0485,
  IMX: 0.855,
  GALA: 42.5,
  AMP: 135.0,
  POLY: 6.85,
  CVC: 9.85,
  PAXG: 0.00058,
  GLM: 2.95,
  LRC: 5.45,
  FET: 0.955,
  QTUM: 0.485,
  ICX: 6.85,
  ONT: 5.45,
  ZEN: 0.135,
  IOTX: 27.5,
  SC: 185.0,
  LSK: 1.485,
  DGB: 115.0,
  RVN: 52.5,
  ARDR: 11.5,
  STEEM: 5.45,
  DCR: 0.085,
  XEM: 52.5,
  BTG: 0.0485,
  STX: 0.955,
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
