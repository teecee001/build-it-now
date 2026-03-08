import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { COUNTRY_TO_CURRENCY, COUNTRY_NAMES } from "@/constants/countryToCurrency";
import { CURRENCIES } from "@/constants/currencies";
import {
  Plane, MapPin, Globe, ArrowLeftRight, Loader2, X, Sparkles, Navigation
} from "lucide-react";
import { toast } from "sonner";

interface LocationData {
  countryCode: string;
  countryName: string;
  localCurrency: string;
  city?: string;
}

export function TravelMode() {
  const { activeCurrency, setActiveCurrency, activeSymbol, wallets } = useActiveCurrency();
  const { addCurrency } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();

  const [isOpen, setIsOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCurrencyInfo = (code: string) => CURRENCIES.find(c => c.code === code);

  const detectLocation = useCallback(async () => {
    setDetecting(true);
    setError(null);
    try {
      // Use free IP geolocation API
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error("Location detection failed");
      const data = await res.json();

      const countryCode = data.country_code || data.country;
      const localCurrency = COUNTRY_TO_CURRENCY[countryCode] || data.currency;

      setLocation({
        countryCode,
        countryName: COUNTRY_NAMES[countryCode] || data.country_name || countryCode,
        localCurrency,
        city: data.city,
      });
    } catch {
      setError("Could not detect your location. Please check your connection.");
    } finally {
      setDetecting(false);
    }
  }, []);

  const hasLocalWallet = location && wallets.some(w => w.currency === location.localCurrency);
  const isAlreadyActive = location && activeCurrency === location.localCurrency;

  const handleSwitchToLocal = async () => {
    if (!location) return;
    // Add wallet if doesn't exist
    if (!hasLocalWallet) {
      try {
        await addCurrency.mutateAsync(location.localCurrency);
        toast.success(`${location.localCurrency} wallet created`);
      } catch (err: any) {
        toast.error(err.message);
        return;
      }
    }
    setActiveCurrency(location.localCurrency);
    toast.success(`Switched to ${location.localCurrency} for spending in ${location.countryName}`);
  };

  const handleSwitchBack = () => {
    setActiveCurrency("USD");
    toast.success("Switched back to USD");
  };

  // Common amounts to show conversion for
  const quickAmounts = [10, 50, 100, 500];

  return (
    <>
      {/* Travel Mode Toggle */}
      <Card
        className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !location) detectLocation();
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Plane className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Travel Mode</p>
              {location && isAlreadyActive && (
                <Badge className="bg-success/10 text-success border-0 text-[10px]">Active</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {location
                ? `${location.city ? location.city + ", " : ""}${location.countryName}`
                : "Detect local currency & rates"}
            </p>
          </div>
          <Navigation className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>

      {/* Expanded Travel Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-5 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Plane className="w-4 h-4 text-accent" /> Travel Mode
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-secondary rounded">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {detecting && (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Detecting your location...</span>
                </div>
              )}

              {error && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button size="sm" variant="outline" onClick={detectLocation}>
                    Try Again
                  </Button>
                </div>
              )}

              {location && !detecting && (
                <>
                  {/* Location Card */}
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold">
                          {location.city ? `${location.city}, ` : ""}{location.countryName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Local currency: <span className="font-medium text-foreground">
                            {getCurrencyInfo(location.localCurrency)?.symbol || ""} {location.localCurrency}
                          </span>
                          {" — "}
                          {getCurrencyInfo(location.localCurrency)?.name}
                        </p>
                      </div>
                    </div>

                    {/* Switch button */}
                    {isAlreadyActive ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success/10 text-success border-0 gap-1">
                          <Sparkles className="w-3 h-3" /> Spending in {location.localCurrency}
                        </Badge>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={handleSwitchBack}>
                          Switch to USD
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleSwitchToLocal}
                        disabled={addCurrency.isPending}
                        className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 gap-2 text-xs font-semibold"
                      >
                        {addCurrency.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            {hasLocalWallet ? `Switch to ${location.localCurrency}` : `Add & Switch to ${location.localCurrency}`}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Quick Conversion Reference */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      Quick Reference — {activeCurrency} to {location.localCurrency}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickAmounts.map(amt => {
                        const fromRate = rates[activeCurrency] || 1;
                        const toRate = rates[location.localCurrency] || 1;
                        const converted = (amt / fromRate) * toRate;
                        const fromSymbol = getCurrencyInfo(activeCurrency)?.symbol || "";
                        const toSymbol = getCurrencyInfo(location.localCurrency)?.symbol || "";
                        return (
                          <div key={amt} className="p-2.5 rounded-lg bg-secondary/50 text-center">
                            <p className="text-xs text-muted-foreground">
                              {fromSymbol}{amt.toLocaleString()} {activeCurrency}
                            </p>
                            <p className="text-sm font-bold font-mono">
                              {toSymbol}{converted.toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: converted > 100 ? 0 : 2,
                              })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current rate */}
                  <div className="p-3 rounded-lg bg-secondary/30 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Exchange Rate</p>
                    <p className="text-sm font-mono font-semibold mt-0.5">
                      1 {activeCurrency} = {((rates[location.localCurrency] || 1) / (rates[activeCurrency] || 1)).toLocaleString("en-US", { maximumFractionDigits: 4 })} {location.localCurrency}
                    </p>
                  </div>

                  {/* Re-detect */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground gap-1"
                    onClick={detectLocation}
                  >
                    <Globe className="w-3.5 h-3.5" /> Re-detect Location
                  </Button>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
