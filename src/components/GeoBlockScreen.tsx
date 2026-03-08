import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExoLogo } from "@/components/ExoLogo";
import { ShieldAlert, Wifi, MapPin, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  vpnDetected: boolean;
  locationMismatch: boolean;
}

export function GeoBlockScreen({ vpnDetected, locationMismatch }: Props) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="inline-flex items-center justify-center mb-4">
          <ExoLogo size="lg" variant="mark" />
        </div>

        <Card className="p-6 bg-card border-destructive/20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-xl font-bold">Access Restricted</h2>

          {vpnDetected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">VPN / Proxy Detected</span>
              </div>
              <p className="text-sm text-muted-foreground">
                For regulatory compliance, ExoSky does not allow access through VPNs, proxies, or anonymizing services.
                Please disable your VPN and reload the page.
              </p>
            </div>
          ) : locationMismatch ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Location Mismatch</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your current IP location does not match the country registered on your account.
                If you've permanently moved, please contact support to update your country of residence.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your access has been restricted. Please contact support for assistance.
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full gap-1"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </Card>

        <p className="text-[10px] text-muted-foreground mt-4">
          ExoSky complies with international financial regulations including OFAC, EU sanctions, and local laws.
        </p>
      </motion.div>
    </div>
  );
}
