// Exo Wallet (web): Privy embedded wallet, testnet only, behind VITE_MPC_WALLET=1.
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_TESTNET,
  isAddress,
  TESTNETS,
  testnetBalances,
  toWei,
  useWalletProvider,
  type TestnetBalance,
  type WalletState,
} from "@/wallet/mpc";

const BACKUP_LABEL = { icloud: "iCloud", "google-drive": "Google Drive", password: "Recovery password" } as const;

export default function ExoWallet() {
  const provider = useWalletProvider();
  const [state, setState] = useState<WalletState | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => provider.state().then(setState), [provider]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-title">Exo Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Testnet only. No real money.</p>
      </div>
      {!state ? null : state.kind === "disabled" || state.kind === "not_configured" ? (
        <Card className="p-5 text-sm text-muted-foreground">The wallet is not available here yet.</Card>
      ) : state.kind === "signed_out" ? (
        <Card className="p-5 text-sm text-muted-foreground">Connecting your wallet…</Card>
      ) : state.kind === "no_wallet" || state.kind === "needs_recovery" ? (
        <Card className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">Create a wallet that only you control. Your key is split, so no single party ever holds it.</p>
          <Button disabled={busy} onClick={() => act(() => provider.createWallet())}>Create wallet</Button>
        </Card>
      ) : (
        <Ready state={state} busy={busy} onBackup={() => act(() => provider.backup("google-drive"))} />
      )}
    </div>
  );
}

function Ready({ state, busy, onBackup }: { state: Extract<WalletState, { kind: "ready" }>; busy: boolean; onBackup: () => void }) {
  const provider = useWalletProvider();
  const [balances, setBalances] = useState<TestnetBalance[] | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [chainId, setChainId] = useState(DEFAULT_TESTNET.chainId);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    void testnetBalances(state.address).then(setBalances);
  }, [state.address]);

  const send = async () => {
    setSending(true);
    try {
      const hash = await provider.sendTestnet({ chainId, to: to.trim(), valueWei: toWei(amount) });
      const net = TESTNETS.find((n) => n.chainId === chainId)!;
      toast.success("Sent on testnet", { action: { label: "View", onClick: () => window.open(`${net.explorer}/tx/${hash}`, "_blank", "noopener") } });
      setTo("");
      setAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card className="p-5 space-y-2">
        <p className="text-xs text-muted-foreground">Your address</p>
        <button type="button" className="flex items-center gap-2 font-mono text-sm break-all text-left" onClick={() => navigator.clipboard.writeText(state.address).then(() => toast.success("Copied"))}>
          {state.address} <Copy className="w-4 h-4 shrink-0" />
        </button>
        <div className="pt-2 space-y-1">
          {(balances ?? TESTNETS.map((net) => ({ net, amount: null }))).map((b) => (
            <div key={b.net.chainId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{b.net.name}</span>
              <span>{b.amount == null ? "—" : `${b.amount.toFixed(4)} ${b.net.symbol}`}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="w-4 h-4" /> Backup</div>
        <p className="text-sm text-muted-foreground">
          {state.backup ? `Backed up with ${BACKUP_LABEL[state.backup]}.` : "Back up with Google Drive or a recovery password so you can restore on a new device."}
        </p>
        {!state.backup && <Button variant="outline" disabled={busy} onClick={onBackup}>Set up backup</Button>}
      </Card>
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium"><ArrowUpRight className="w-4 h-4" /> Send testnet ETH</div>
        <div className="flex gap-1 p-1 rounded-card bg-secondary/40 w-fit">
          {TESTNETS.map((n) => (
            <button key={n.chainId} type="button" onClick={() => setChainId(n.chainId)} className={`px-3 py-1.5 rounded-lg text-sm ${chainId === n.chainId ? "bg-background shadow-card" : "text-muted-foreground"}`}>
              {n.name}
            </button>
          ))}
        </div>
        <Input placeholder="0x… recipient" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input placeholder="Amount, e.g. 0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button disabled={sending || !isAddress(to) || !amount} onClick={send}>Send</Button>
      </Card>
    </>
  );
}
