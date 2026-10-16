import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Test-only web wallet entry point.
 * Real Privy (@privy-io/react-auth) requires VITE_PRIVY_APP_ID + VITE_PRIVY_CLIENT_ID
 * in Vercel env vars. Until set, this shows a clear disabled state.
 * Mobile uses the Expo native Privy path separately.
 */
export function WebPrivyWallet() {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;
  const clientId = import.meta.env.VITE_PRIVY_CLIENT_ID;
  const enabled = !!(appId && clientId);
  const [connected, setConnected] = useState(false);

  if (!enabled) {
    return (
      <Card className="p-4 border-dashed">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Web Wallet (Privy)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Test mode. Set VITE_PRIVY_APP_ID and VITE_PRIVY_CLIENT_ID in Vercel to enable.
            </p>
          </div>
          <Badge variant="secondary">Disabled</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Web Wallet (Privy)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {connected ? "Connected (test)" : "Connect to test embedded wallet"}
          </p>
        </div>
        <Button size="sm" onClick={() => setConnected((c) => !c)}>
          {connected ? "Disconnect" : "Connect"}
        </Button>
      </div>
      {connected && (
        <p className="text-xs text-muted-foreground mt-2">
          Test wallet active. Full Privy SDK integration pending env confirmation.
        </p>
      )}
    </Card>
  );
}
