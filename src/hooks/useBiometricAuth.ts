import { useState, useCallback, useEffect } from "react";

export type BiometricMethod = "face" | "fingerprint" | "password" | "none";

interface BiometricAuthState {
  isAvailable: boolean;
  method: BiometricMethod;
  methodLabel: string;
  isVerified: boolean;
  isVerifying: boolean;
  verify: () => Promise<boolean>;
  reset: () => void;
  needsPinFallback: boolean;
  verifyPin: (pin: string) => boolean;
}

function detectPlatformMethod(): BiometricMethod {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 0;
  const isAndroid = /Android/.test(ua);

  if (isIOS || isMac) {
    const hasNotch = window.screen.height >= 812 && window.devicePixelRatio >= 2;
    return hasNotch ? "face" : "fingerprint";
  }
  if (isAndroid) return "fingerprint";
  if (/Mac/.test(ua)) return "fingerprint";
  if (/Windows/.test(ua)) return "face";
  return "password";
}

const METHOD_LABELS: Record<BiometricMethod, string> = {
  face: "Face ID",
  fingerprint: "Fingerprint",
  password: "Device Passcode",
  none: "Not Available",
};

// Simple session PIN — in production this would be a real user-set PIN
const SESSION_PIN = "1234";

export function useBiometricAuth(): BiometricAuthState {
  const [isAvailable, setIsAvailable] = useState(true);
  const [method, setMethod] = useState<BiometricMethod>("password");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [needsPinFallback, setNeedsPinFallback] = useState(false);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    async function check() {
      // Detect the ideal method based on device
      const detected = detectPlatformMethod();
      setMethod(detected);

      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setWebAuthnSupported(available);
        } catch {
          setWebAuthnSupported(false);
        }
      }
      setIsAvailable(true);
    }
    check();
  }, []);

  const verify = useCallback(async (): Promise<boolean> => {
    setIsVerifying(true);
    try {
      // Try WebAuthn biometric first
      if (webAuthnSupported && window.PublicKeyCredential) {
        try {
          const challenge = new Uint8Array(32);
          crypto.getRandomValues(challenge);

          const credential = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: "Ξ╳oSky", id: window.location.hostname },
              user: {
                id: new Uint8Array(16),
                name: "card-verify",
                displayName: "Card Verification",
              },
              pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" },
              ],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
              },
              timeout: 60000,
            },
          });

          if (credential) {
            setIsVerified(true);
            return true;
          }
        } catch (err: any) {
          console.log("WebAuthn failed, falling back to PIN:", err?.message);
          // Fall through to PIN fallback
        }
      }

      // PIN fallback
      setNeedsPinFallback(true);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [webAuthnSupported]);

  const verifyPin = useCallback((pin: string): boolean => {
    if (pin === SESSION_PIN) {
      setIsVerified(true);
      setNeedsPinFallback(false);
      return true;
    }
    return false;
  }, []);

  const reset = useCallback(() => {
    setIsVerified(false);
    setNeedsPinFallback(false);
  }, []);

  return {
    isAvailable,
    method,
    methodLabel: METHOD_LABELS[method],
    isVerified,
    isVerifying,
    verify,
    reset,
    needsPinFallback,
    verifyPin,
  };
}
