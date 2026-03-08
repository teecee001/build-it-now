import { useEffect } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams } from "react-router-dom";
import {
  Crown, CheckCircle2, Loader2, Zap, Shield, Star,
  CreditCard, Percent, Headphones, Rocket, Settings
} from "lucide-react";
import { toast } from "sonner";

const FEATURE_ICONS = [Percent, Zap, Headphones, Rocket, CreditCard, Star];

export default function Premium() {
  return (
    <FeatureGate feature="features_premium" featureLabel="Premium">
      <PremiumContent />
    </FeatureGate>
  );
}

function PremiumContent() {
  const {
    isSubscribed, currentTier, subscriptionEnd, isLoading,
    isCheckoutLoading, startCheckout, openPortal, checkSubscription, tiers,
  } = useSubscription();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Welcome to Ξ╳oSky Pro! 🎉");
      checkSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled");
    }
  }, [searchParams, checkSubscription]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Crown className="w-6 h-6 text-warning" />
          <h1 className="text-2xl font-bold tracking-tight">ExoSky Pro</h1>
          {isSubscribed && (
            <Badge className="bg-warning/10 text-warning border-0 text-xs font-semibold">Active</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {isSubscribed ? "You're on the Pro plan" : "Unlock premium features"}
        </p>
      </motion.div>

      {/* Active Subscription Card */}
      {isSubscribed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <Card className="p-5 bg-card border-warning/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent pointer-events-none" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-warning" />
                  <p className="font-semibold">Pro Plan</p>
                </div>
                <Badge className="bg-success/10 text-success border-0 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>
              {subscriptionEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews on {new Date(subscriptionEnd).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={openPortal}
                className="gap-2"
              >
                <Settings className="w-3 h-3" /> Manage Subscription
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Pro Plan Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card className={`p-6 bg-card relative overflow-hidden ${
          isSubscribed ? "border-warning/20" : "border-border"
        }`}>
          {isSubscribed && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-warning/10 text-warning border-0 text-xs">Your Plan</Badge>
            </div>
          )}
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold">{tiers.pro.name}</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold font-mono">${tiers.pro.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>

            <div className="space-y-3">
              {tiers.pro.features.map((feature, i) => {
                const Icon = FEATURE_ICONS[i] || CheckCircle2;
                return (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-success" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                );
              })}
            </div>

            {!isSubscribed && (
              <Button
                onClick={() => startCheckout("pro")}
                disabled={isCheckoutLoading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2 h-12 text-base"
              >
                {isCheckoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" /> Upgrade to Pro
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Free Plan Comparison */}
      {!isSubscribed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <Card className="p-5 bg-card border-border space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Free Plan</h3>
              <p className="text-xs text-muted-foreground mt-1">What you currently have</p>
            </div>
            <div className="space-y-2">
              {["6% APY on Savings", "Standard transfer speeds", "Email support", "Basic transaction limits", "Standard debit card"].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Security Note */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="p-3 bg-secondary/30 border-border flex items-start gap-2">
          <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Payments are securely processed by Stripe. Cancel anytime from your subscription settings. No hidden fees.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
