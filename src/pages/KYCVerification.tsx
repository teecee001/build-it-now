import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Shield, User, FileCheck, CheckCircle2, Loader2,
  Camera, Upload, ArrowRight, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

type Step = "info" | "id" | "selfie" | "review" | "complete";

export default function KYCVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [ssn, setSSN] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [idUploaded, setIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);

  const steps: { key: Step; label: string; icon: typeof User }[] = [
    { key: "info", label: "Personal Info", icon: User },
    { key: "id", label: "Government ID", icon: FileCheck },
    { key: "selfie", label: "Selfie", icon: Camera },
    { key: "review", label: "Review", icon: Shield },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  const handleSubmitInfo = () => {
    if (!fullName || !dob || !ssn || !address || !city || !state || !zip) {
      toast.error("Please fill in all fields");
      return;
    }
    if (ssn.replace(/\D/g, "").length !== 9) {
      toast.error("Please enter a valid 9-digit SSN");
      return;
    }
    setStep("id");
  };

  const handleIDUpload = () => {
    // Simulated upload — in production, this would use a real document upload
    setIdUploaded(true);
    toast.success("ID document uploaded");
    setTimeout(() => setStep("selfie"), 500);
  };

  const handleSelfieCapture = () => {
    setSelfieUploaded(true);
    toast.success("Selfie captured");
    setTimeout(() => setStep("review"), 500);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Update profile with KYC status
      if (user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", user.id);
      }
      // Simulate verification processing
      await new Promise((r) => setTimeout(r, 2000));
      setStep("complete");
      toast.success("Verification submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSSN = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  if (step === "complete") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>
          <CheckCircle2 className="w-20 h-20 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold text-center">Verification Submitted!</h2>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          We're reviewing your documents. This typically takes 1–2 business days. You'll be notified once approved.
        </p>
        <Button onClick={() => navigate("/dashboard")} className="bg-foreground text-background hover:bg-foreground/90 gap-2">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-success" />
          <h1 className="text-2xl font-bold tracking-tight">Verify Your Identity</h1>
        </div>
        <p className="text-muted-foreground text-sm">Required by federal law to access financial services</p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < currentIndex ? "bg-success text-success-foreground" :
                i === currentIndex ? "bg-foreground text-background" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-1 transition-colors ${
                  i < currentIndex ? "bg-success" : "bg-secondary"
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s) => (
            <span key={s.key} className="text-[10px] text-muted-foreground">{s.label}</span>
          ))}
        </div>
      </motion.div>

      {/* Regulatory Notice */}
      <Card className="p-3 bg-warning/5 border-warning/10 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-warning">
          Required under the USA PATRIOT Act and Bank Secrecy Act. Your information is encrypted and stored securely.
        </p>
      </Card>

      <AnimatePresence mode="wait">
        {/* Step 1: Personal Info */}
        {step === "info" && (
          <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="text-sm font-semibold">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Legal Full Name</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As shown on your ID" className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Date of Birth</label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Social Security Number</label>
                  <Input
                    value={ssn}
                    onChange={(e) => setSSN(formatSSN(e.target.value))}
                    placeholder="XXX-XX-XXXX"
                    maxLength={11}
                    className="mt-1 bg-secondary border-border font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Street Address</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="mt-1 bg-secondary border-border" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">City</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">State</label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="CA" className="mt-1 bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">ZIP</label>
                    <Input value={zip} onChange={(e) => setZip(e.target.value)} maxLength={5} className="mt-1 bg-secondary border-border" />
                  </div>
                </div>
              </div>
              <Button onClick={handleSubmitInfo} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Step 2: ID Upload */}
        {step === "id" && (
          <motion.div key="id" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="text-sm font-semibold">Upload Government-Issued ID</h3>
              <p className="text-xs text-muted-foreground">Driver's license, passport, or state ID. Both front and back required for licenses.</p>
              <div
                onClick={handleIDUpload}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-accent/50 hover:bg-secondary/30 transition-all"
              >
                {idUploaded ? (
                  <CheckCircle2 className="w-12 h-12 text-success" />
                ) : (
                  <Upload className="w-12 h-12 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                  {idUploaded ? "Document uploaded" : "Tap to upload or take a photo"}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Selfie */}
        {step === "selfie" && (
          <motion.div key="selfie" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="text-sm font-semibold">Take a Selfie</h3>
              <p className="text-xs text-muted-foreground">We'll match your selfie to your ID document to verify your identity.</p>
              <div
                onClick={handleSelfieCapture}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-accent/50 hover:bg-secondary/30 transition-all"
              >
                {selfieUploaded ? (
                  <CheckCircle2 className="w-12 h-12 text-success" />
                ) : (
                  <Camera className="w-12 h-12 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                  {selfieUploaded ? "Selfie captured" : "Tap to take a selfie"}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="text-sm font-semibold">Review & Submit</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">{dob}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">SSN</span>
                  <span className="font-medium font-mono">***-**-{ssn.slice(-4)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-right">{address}, {city}, {state} {zip}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Government ID</span>
                  <span className="text-success font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Selfie</span>
                  <span className="text-success font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Captured</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                By submitting, you certify that the information provided is accurate and authorize Ξ╳oSky to verify your identity in accordance with our{" "}
                <a href="/privacy" className="text-accent underline">Privacy Policy</a>.
              </p>

              <Button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Submit Verification <Shield className="w-4 h-4" /></>
                )}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
