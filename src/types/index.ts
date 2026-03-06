export interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  result: number;
  timestamp: Date;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Transaction {
  id: string;
  type: "send" | "receive" | "convert";
  amount: number;
  currency: string;
  recipient?: string;
  sender?: string;
  status: "pending" | "completed" | "failed";
  timestamp: Date;
}

export interface WalletAsset {
  code: string;
  name: string;
  symbol: string;
  balance: number;
  valueUSD: number;
  change24h: number;
}
