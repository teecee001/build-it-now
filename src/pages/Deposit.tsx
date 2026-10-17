import { Card } from "@/components/ui/card";
import { Landmark } from "lucide-react";

export default function Deposit() {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-title">Add money</h1>
      <Card className="p-6 bg-card border-border space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Bank deposits are not connected</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ExoSky cannot accept bank transfers, debit-card funding, or direct deposit yet.
          No routing number or account number is issued, and nothing on this screen adds money to your wallet.
        </p>
      </Card>
    </div>
  );
}
