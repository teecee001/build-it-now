import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExoLogo } from "@/components/ExoLogo";
import { useCountries, useGeoVerification } from "@/hooks/useGeoVerification";
import {
  Globe, Phone, Shield, Search, ChevronRight, Loader2, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
}

type Step = "country" | "phone" | "registering";

export function CountryOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("country");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [search, setSearch] = useState("");

  const { data: countries = [], isLoading: countriesLoading } = useCountries();
  const { checkCountry, verifyPhone, registerGeo } = useGeoVerification();

  const selectedCountryData = countries.find(c => c.code === selectedCountry);

  const groupedCountries = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone_code.includes(q)
    );
    const groups: Record<string, typeof countries> = {};
    filtered.forEach(c => {
      if (!groups[c.region]) groups[c.region] = [];
      groups[c.region].push(c);
    });
    return groups;
  }, [countries, search]);

  const handleCountrySelect = async (code: string) => {
    setSelectedCountry(code);
    const country = countries.find(c => c.code === code);
    if (country) {
      setPhoneNumber(country.phone_code);
    }

    try {
      const result = await checkCountry.mutateAsync(code);
      if (result.success) {
        setStep("phone");
      }
    } catch (err: any) {
      if (err?.message?.includes("SANCTIONED") || err?.message?.includes("regulatory")) {
        toast.error("Services are not available in this country due to regulatory restrictions.");
      } else if (err?.message?.includes("UNSUPPORTED")) {
        toast.error("Services are not yet available in this country.");
      } else {
        toast.error(err.message || "Something went wrong");
      }
      setSelectedCountry("");
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error("Enter a valid phone number");
      return;
    }
    try {
      const result = await verifyPhone.mutateAsync({
        countryCode: selectedCountry,
        phoneNumber,
      });
      if (result.success) {
        // Phone verified, now register
        setStep("registering");
        await registerGeo.mutateAsync({
          countryCode: selectedCountry,
          phoneNumber,
        });
        toast.success("Welcome to Ξ╳oSky!");
        onComplete();
      }
    } catch (err: any) {
      const msg = err?.context?.body?.error || err?.message || "Verification failed";
      toast.error(msg);
      setStep("phone");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <ExoLogo size="lg" variant="mark" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Ξ╳oSky</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select your country to get started
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { s: "country", icon: Globe },
            { s: "phone", icon: Phone },
          ].map((item, i) => {
            const isCurrent = step === item.s;
            const isPast = ["country", "phone", "registering"].indexOf(step) >
              ["country", "phone", "registering"].indexOf(item.s);
            return (
              <div key={item.s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isPast ? "bg-success text-success-foreground" :
                  isCurrent ? "bg-foreground text-background" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : <item.icon className="w-3.5 h-3.5" />}
                </div>
                {i < 1 && <div className={`w-8 h-0.5 ${isPast ? "bg-success" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Country Selection */}
          {step === "country" && (
            <motion.div key="country" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-4 bg-card border-border space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Select your country</h3>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search countries..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 h-10 bg-secondary border-border"
                  />
                </div>

                {countriesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto space-y-4 pr-1">
                    {Object.entries(groupedCountries).map(([region, regionCountries]) => (
                      <div key={region}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{region}</p>
                        <div className="space-y-1">
                          {regionCountries.map(c => (
                            <button
                              key={c.code}
                              onClick={() => handleCountrySelect(c.code)}
                              disabled={checkCountry.isPending}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                                selectedCountry === c.code
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-secondary/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{getFlagEmoji(c.code)}</span>
                                <div>
                                  <p className="text-sm font-medium">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{c.phone_code} · {c.currency_code}</p>
                                </div>
                              </div>
                              {checkCountry.isPending && selectedCountry === c.code ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> Your data is protected and encrypted
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Phone Number */}
          {step === "phone" && selectedCountryData && (
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-5 bg-card border-border space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Enter your phone number</h3>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg">
                  <span className="text-lg">{getFlagEmoji(selectedCountry)}</span>
                  <span className="text-sm font-medium">{selectedCountryData.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{selectedCountryData.phone_code}</Badge>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Phone number</label>
                  <Input
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder={`${selectedCountryData.phone_code} XXXX XXXX`}
                    className="h-11 bg-secondary border-border font-mono text-base"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Must start with {selectedCountryData.phone_code}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setStep("country"); setSelectedCountry(""); }} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handlePhoneSubmit}
                    disabled={verifyPhone.isPending || registerGeo.isPending}
                    className="flex-1 bg-foreground text-background hover:bg-foreground/90"
                  >
                    {(verifyPhone.isPending || registerGeo.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Started"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Registering */}
          {step === "registering" && (
            <motion.div key="registering" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-8 bg-card border-border text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Setting up your account</h3>
                <p className="text-sm text-muted-foreground mt-2">Just a moment...</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
          <span>·</span>
          <a href="/disclosures" className="hover:text-foreground transition-colors">Disclosures</a>
        </div>
      </motion.div>
    </div>
  );
}

function getFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}
