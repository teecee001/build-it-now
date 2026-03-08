import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMultiCurrencyWallet, CurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CURRENCIES } from "@/constants/currencies";

interface ActiveCurrencyContextType {
  activeCurrency: string;
  setActiveCurrency: (code: string) => void;
  activeWallet: CurrencyWallet | undefined;
  activeBalance: number;
  activeSymbol: string;
  activeName: string;
  /** Convert an amount from the active currency to USD */
  toUSD: (amount: number) => number;
  /** Convert an amount from USD to the active currency */
  fromUSD: (amount: number) => number;
  /** Format a balance in the active currency */
  formatBalance: (amount: number, showSymbol?: boolean) => string;
  wallets: CurrencyWallet[];
  isLoading: boolean;
}

const ActiveCurrencyContext = createContext<ActiveCurrencyContextType | null>(null);

const STORAGE_KEY = "exosky-active-currency";

export function ActiveCurrencyProvider({ children }: { children: ReactNode }) {
  const { wallets, isLoading, getWallet } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();

  const [activeCurrency, setActiveCurrencyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "USD";
  });

  // Ensure active currency is valid (user has a wallet for it)
  useEffect(() => {
    if (!isLoading && wallets.length > 0) {
      const hasWallet = wallets.some(w => w.currency === activeCurrency);
      if (!hasWallet) {
        setActiveCurrencyState("USD");
        localStorage.setItem(STORAGE_KEY, "USD");
      }
    }
  }, [wallets, isLoading, activeCurrency]);

  const setActiveCurrency = (code: string) => {
    setActiveCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const activeWallet = getWallet(activeCurrency);
  const activeBalance = activeWallet?.balance ?? 0;

  const currInfo = CURRENCIES.find(c => c.code === activeCurrency);
  const activeSymbol = currInfo?.symbol || activeCurrency;
  const activeName = currInfo?.name || activeCurrency;

  const rate = rates[activeCurrency] || 1;

  const toUSD = (amount: number) => amount / rate;
  const fromUSD = (amount: number) => amount * rate;

  const formatBalance = (amount: number, showSymbol = true) => {
    const isCrypto = activeCurrency === "BTC" || activeCurrency === "ETH";
    const formatted = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: isCrypto ? 6 : 2,
    });
    return showSymbol ? `${activeSymbol}${formatted}` : formatted;
  };

  return (
    <ActiveCurrencyContext.Provider
      value={{
        activeCurrency,
        setActiveCurrency,
        activeWallet,
        activeBalance,
        activeSymbol,
        activeName,
        toUSD,
        fromUSD,
        formatBalance,
        wallets,
        isLoading,
      }}
    >
      {children}
    </ActiveCurrencyContext.Provider>
  );
}

export function useActiveCurrency() {
  const ctx = useContext(ActiveCurrencyContext);
  if (!ctx) throw new Error("useActiveCurrency must be used within ActiveCurrencyProvider");
  return ctx;
}
