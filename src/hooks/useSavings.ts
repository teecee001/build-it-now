import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";

const APY_RATE = 6.0;

export function useSavings() {
  const { wallet, balance, savingsBalance, updateBalance } = useWallet();
  const { addTransaction } = useTransactions();
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

  const transferToSavings = async (amount: number) => {
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient wallet balance");
      return;
    }
    setIsTransferring(true);
    try {
      await updateBalance.mutateAsync({
        balance: balance - amount,
        savings_balance: savingsBalance + amount,
      });
      await addTransaction.mutateAsync({
        type: "deposit",
        amount: -amount,
        description: `Transfer to Savings — ${APY_RATE}% APY`,
        metadata: { savings_transfer: true, direction: "to_savings" },
      });
      toast.success(`$${amount.toFixed(2)} moved to Savings`);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  const transferToWallet = async (amount: number) => {
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > savingsBalance) {
      toast.error("Insufficient savings balance");
      return;
    }
    setIsTransferring(true);
    try {
      await updateBalance.mutateAsync({
        balance: balance + amount,
        savings_balance: savingsBalance - amount,
      });
      await addTransaction.mutateAsync({
        type: "deposit",
        amount,
        description: "Withdrawal from Savings",
        metadata: { savings_transfer: true, direction: "to_wallet" },
      });
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
