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
