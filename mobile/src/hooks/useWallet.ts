// Copied from the web app (src/hooks/useWallet.ts); keep the two in sync.
import { uniqueChannel } from "@/lib/realtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  savings_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

function isAuthFailure(message: string) {
  return message === "Not authenticated" || message === "No authorization header";
}

async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) return data.session.access_token;
  // No usable session in storage: try to refresh once before giving up.
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed?.session?.access_token ?? null;
}

async function endExpiredSession(): Promise<never> {
  // ProtectedRoute sends a signed-out user to /auth.
  await supabase.auth.signOut().catch(() => undefined);
  throw new Error(SESSION_EXPIRED_MESSAGE);
}

async function callWalletOp(body: Record<string, unknown>, token: string) {
  const { data, error } = await supabase.functions.invoke("wallet-operation", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  // Prefer structured error from function body (status 400 still may populate data)
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }

  if (error) {
    // FunctionsHttpError: try to read JSON body from context
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const bodyJson = await ctx.json();
        if (bodyJson?.error) throw new Error(String(bodyJson.error));
      } catch (e) {
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw new Error(error.message || "Wallet operation failed");
  }

  return data;
}

async function invokeWalletOp(body: Record<string, unknown>) {
  const token = await currentAccessToken();
  if (!token) return endExpiredSession();

  try {
    return await callWalletOp(body, token);
  } catch (err) {
    if (!(err instanceof Error) || !isAuthFailure(err.message)) throw err;
    // The server rejected the token (expired or revoked) although a session was
    // stored. Refresh once and retry; the server rejected the call before doing
    // anything, so retrying cannot repeat a money movement.
    const { data: refreshed } = await supabase.auth.refreshSession();
    const fresh = refreshed?.session?.access_token;
    if (!fresh) return endExpiredSession();
    try {
      return await callWalletOp(body, fresh);
    } catch (retryErr) {
      if (retryErr instanceof Error && isAuthFailure(retryErr.message)) return endExpiredSession();
      throw retryErr;
    }
  }
}

export { invokeWalletOp };

export function useWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .eq("currency", "USD")
        .maybeSingle();
      if (error) throw error;
      return data as Wallet | null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(uniqueChannel('wallet-realtime'))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["wallet"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const updateBalance = useMutation({
    mutationFn: async ({
      balance,
      savings_balance,
    }: {
      balance?: number;
      savings_balance?: number;
    }) => {
      if (!user || !wallet) throw new Error("No wallet");
      if (savings_balance !== undefined && balance !== undefined) {
        const diff = wallet.savings_balance - (savings_balance ?? wallet.savings_balance);
        if (diff < 0) {
          await invokeWalletOp({
            operation: "savings_transfer",
            direction: "to_savings",
            amount: Math.abs(diff),
          });
        } else if (diff > 0) {
          await invokeWalletOp({
            operation: "savings_transfer",
            direction: "to_wallet",
            amount: diff,
          });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet"] }),
  });

  return {
    wallet,
    isLoading,
    balance: wallet?.balance ?? 0,
    savingsBalance: wallet?.savings_balance ?? 0,
    totalBalance: (wallet?.balance ?? 0) + (wallet?.savings_balance ?? 0),
    updateBalance,
  };
}
