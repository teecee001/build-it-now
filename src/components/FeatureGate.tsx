import { motion } from "framer-motion";
import { ShieldX, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGeoVerification, Country } from "@/hooks/useGeoVerification";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  feature: keyof Country;
  featureLabel: string;
  children: React.ReactNode;
}

export function FeatureGate({ feature, featureLabel, children }: FeatureGateProps) {
  const { isFeatureAvailable, geoStatus } = useGeoVerification();
  const navigate = useNavigate();

  if (!isFeatureAvailable(feature)) {
    const countryName = geoStatus?.country?.name || "your country";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center border-destructive/20 bg-card">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-xl font-bold text-foreground mb-2">
              {featureLabel} Not Available
            </h1>

            <p className="text-muted-foreground text-sm mb-1">
              This feature is not available in <span className="font-semibold text-foreground">{countryName}</span> due to local regulations.
            </p>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-6">
              <MapPin className="w-3.5 h-3.5" />
              <span>Region: {geoStatus?.country?.region || "Unknown"}</span>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-muted-foreground">
                Feature availability is determined by your verified location and local regulatory requirements. 
                If you believe this is an error, please contact support.
              </p>
            </div>

            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
