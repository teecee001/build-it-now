import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function KYCVerification() {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-title">Identity verification</h1>
      <Card className="p-6 bg-card border-border space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Identity verification is not available yet</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ExoSky does not collect a Social Security number, a government ID, or a selfie, and it does not submit an identity review.
          Your account is not identity-verified.
        </p>
      </Card>
    </div>
  );
}
