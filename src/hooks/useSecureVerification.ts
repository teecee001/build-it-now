import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationMethod = "face" | "fingerprint" | "ai-challenge" | "password";
export type VerificationStep = "idle" | "loading" | "challenge" | "verifying" | "verified" | "failed";

interface SecurityChallenge {
  challengeId: string;
  question: string;
  options: string[];
  challengeType: string;
  verificationHash: string;
}

interface VerificationState {
  method: VerificationMethod;
  methodLabel: string;
  step: VerificationStep;
  isVerified: boolean;
  challenge: SecurityChallenge | null;
  error: string | null;
  startVerification: () => Promise<void>;
  submitAnswer: (answerIndex: number) => Promise<boolean>;
  verifyPassword: (password: string) => Promise<boolean>;
  reset: () => void;
}

function detectMethod(): VerificationMethod {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 0;
  if (isIOS || isMac) {
    const hasNotch = window.screen.height >= 812 && window.devicePixelRatio >= 2;
    return hasNotch ? "face" : "fingerprint";
  }
  if (/Android/.test(ua)) return "fingerprint";
  if (/Mac/.test(ua)) return "fingerprint";
  return "ai-challenge";
}

const METHOD_LABELS: Record<VerificationMethod, string> = {
  face: "Face ID",
  fingerprint: "Fingerprint",
  "ai-challenge": "Smart Verification",
  password: "Password",
};

export function useSecureVerification(): VerificationState {
  const [step, setStep] = useState<VerificationStep>("idle");
  const [isVerified, setIsVerified] = useState(false);
  const [challenge, setChallenge] = useState<SecurityChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);

  const method = detectMethod();

  const startVerification = useCallback(async () => {
    setStep("loading");
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in first");
        setStep("failed");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-identity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "generate" }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate challenge");
      }

      const data: SecurityChallenge = await response.json();
      setChallenge(data);
      setStep("challenge");
    } catch (err: any) {
      console.error("Verification start error:", err);
      setError(err.message || "Verification failed");
      setStep("failed");
    }
  }, []);

  const submitAnswer = useCallback(async (answerIndex: number): Promise<boolean> => {
    if (!challenge) return false;
    setStep("verifying");

    // Verify answer by comparing hashes client-side
    const encoder = new TextEncoder();
    const data = encoder.encode(challenge.challengeId + ":" + answerIndex.toString());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (computedHash === challenge.verificationHash) {
      setIsVerified(true);
      setStep("verified");
      return true;
    } else {
      setError("Incorrect answer. Please try again.");
      setStep("failed");
      return false;
    }
  }, [challenge]);

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    setStep("verifying");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email found");

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        setError("Incorrect password");
        setStep("failed");
        return false;
      }

      setIsVerified(true);
      setStep("verified");
      return true;
    } catch (err: any) {
      setError(err.message || "Verification failed");
      setStep("failed");
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setIsVerified(false);
    setChallenge(null);
    setError(null);
  }, []);

  return {
    method,
    methodLabel: METHOD_LABELS[method],
    step,
    isVerified,
    challenge,
    error,
    startVerification,
    submitAnswer,
    verifyPassword,
    reset,
  };
}
