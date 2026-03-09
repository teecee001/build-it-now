import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet, invokeWalletOp } from "@/hooks/useWallet";
import { toast } from "sonner";

const APY_RATE = 6.0;

export function useSavings() {
  const { wallet, balance, savingsBalance } = useWallet();
  const queryClient = useQueryClient();
  const [isTransferring, setIsTransferring] = useState(false);

  const monthlyRate = APY_RATE / 100 / 12;
  const dailyRate = APY_RATE / 100 / 365;
  const monthlyEarnings = savingsBalance * monthlyRate;
  const dailyEarnings = savingsBalance * dailyRate;
  const yearlyEarnings = savingsBalance * APY_RATE / 100;

  const projectBalance = (months: number, additionalMonthly = 0) => {
    const points: { month: number; balance: number; interest: number }[] = [];
    let current = savingsBalance;
    let totalInterest = 0;
    for (let m = 0; m <= months; m++) {
      points.push({ month: m, balance: current, interest: totalInterest });
      const interest = current * monthlyRate;
      totalInterest += interest;
      current += interest + additionalMonthly;
    }
    return points;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["multi-wallets"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const transferToSavings = async (amount: number) => {
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > balance) { toast.error("Insufficient wallet balance"); return; }
    setIsTransferring(true);
    try {
      await invokeWalletOp({ operation: "savings_transfer", direction: "to_savings", amount });
      invalidate();
      toast.success(`$${amount.toFixed(2)} moved to Savings`);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  const transferToWallet = async (amount: number) => {
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > savingsBalance) { toast.error("Insufficient savings balance"); return; }
    setIsTransferring(true);
    try {
      await invokeWalletOp({ operation: "savings_transfer", direction: "to_wallet", amount });
      invalidate();
      toast.success(`$${amount.toFixed(2)} moved to Wallet`);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  return {
    apyRate: APY_RATE,
    savingsBalance,
    walletBalance: balance,
    monthlyEarnings,
    dailyEarnings,
    yearlyEarnings,
    projectBalance,
    transferToSavings,
    transferToWallet,
    isTransferring,
  };
}
