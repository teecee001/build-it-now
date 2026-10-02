import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExoLogo } from "@/components/ExoLogo";
import { useCountries, useGeoVerification } from "@/hooks/useGeoVerification";
import { Globe, Search, ChevronRight, Loader2, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
}

export function CountryOnboarding({ onComplete }: Props) {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: countries = [], isLoading: countriesLoading } = useCountries();
  const { checkCountry, registerGeo } = useGeoVerification();

  const groupedCountries = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone_code.includes(q),
    );
    const groups: Record<string, typeof countries> = {};
    filtered.forEach((c) => {
      if (!groups[c.region]) groups[c.region] = [];
      groups[c.region].push(c);
    });
    return groups;
  }, [countries, search]);

  const finishWithCountry = async (code: string) => {
    const country = countries.find((c) => c.code === code);
    if (!country) return;

    setSelectedCountry(code);
    setSaving(true);

    try {
      const check = await checkCountry.mutateAsync(code);
      if (!check?.success) {
        throw new Error(check?.error || "Country not available");
      }

      // Phone optional in beta — register with country + dial code only
      await registerGeo.mutateAsync({
        countryCode: code,
        phoneNumber: country.phone_code || "",
      });

      toast.success("You're in — welcome to ExoSky");
      onComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("SANCTIONED") || message.toLowerCase().includes("regulatory")) {
        toast.error("ExoSky isn't available in this country yet.");
      } else if (message.includes("UNSUPPORTED")) {
        toast.error("This country isn't supported in the beta yet.");
      } else {
        toast.error(message || "Could not save country. Try again.");
      }
      setSelectedCountry("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <ExoLogo size="lg" variant="mark" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Where are you based?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            One step — sets your currency and local experience
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-5 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Account created</span>
          <span className="text-border">·</span>
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground font-medium">Country</span>
          <span className="text-border">·</span>
          <span>Dashboard</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="country"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 bg-card border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search countries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 bg-secondary border-border"
                  disabled={saving}
                />
              </div>

              {countriesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1">
                  {Object.entries(groupedCountries).map(([region, regionCountries]) => (
                    <div key={region}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                        {region}
                      </p>
                      <div className="space-y-1">
                        {regionCountries.map((c) => {
                          const active = selectedCountry === c.code && saving;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => finishWithCountry(c.code)}
                              disabled={saving}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                                active
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-secondary/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{getFlagEmoji(c.code)}</span>
                                <div>
                                  <p className="text-sm font-medium">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {c.currency_code} · local rates
                                  </p>
                                </div>
                              </div>
                              {active ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupedCountries).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No countries match your search
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Demo beta · no real money · data protected
                </p>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
          <a href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </a>
          <span>·</span>
          <a href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function getFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}
