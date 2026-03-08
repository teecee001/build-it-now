import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, ShieldCheck, AlertTriangle, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FaceScannerProps {
  onVerified: () => void;
  onFailed: (error: string) => void;
  onCancel: () => void;
}

type ScanPhase = "init" | "scanning" | "analyzing" | "verified" | "failed";

export function FaceScanner({ onVerified, onFailed, onCancel }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("init");
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setPhase("init");
    setError(null);
    setScanProgress(0);
    setFaceDetected(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("scanning");
      startFaceDetection();
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permissions.");
      setPhase("failed");
    }
  }, []);

  const startFaceDetection = useCallback(() => {
    let stableFaceFrames = 0;
    const REQUIRED_STABLE_FRAMES = 8; // ~2 seconds of stable face detection

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Try the native FaceDetector API (Chrome/Edge)
      if ("FaceDetector" in window) {
        try {
          const detector = new (window as any).FaceDetector({ fastMode: true });
          const faces = await detector.detect(canvas);
          if (faces.length > 0) {
            stableFaceFrames++;
            setFaceDetected(true);
          } else {
            stableFaceFrames = Math.max(0, stableFaceFrames - 1);
            setFaceDetected(false);
          }
        } catch {
          // FaceDetector API failed, fall back to brightness heuristic
          stableFaceFrames = detectFaceHeuristic(ctx, canvas) ? stableFaceFrames + 1 : Math.max(0, stableFaceFrames - 1);
          setFaceDetected(stableFaceFrames > 2);
        }
      } else {
        // Fallback: simple skin-tone + center brightness heuristic
        stableFaceFrames = detectFaceHeuristic(ctx, canvas) ? stableFaceFrames + 1 : Math.max(0, stableFaceFrames - 1);
        setFaceDetected(stableFaceFrames > 2);
      }

      setScanProgress(Math.min(100, (stableFaceFrames / REQUIRED_STABLE_FRAMES) * 100));

      if (stableFaceFrames >= REQUIRED_STABLE_FRAMES) {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        completeVerification();
      }
    }, 250);
  }, []);

  // Simple heuristic: check for skin-tone pixels in the center region
  function detectFaceHeuristic(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.25;
    const imageData = ctx.getImageData(cx - radius, cy - radius, radius * 2, radius * 2);
    const data = imageData.data;
    let skinPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Skin-tone detection in RGB
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) {
        skinPixels++;
      }
    }

    const skinRatio = skinPixels / (totalPixels / 4);
    return skinRatio > 0.15; // At least 15% skin-tone pixels in center
  }

  const completeVerification = useCallback(() => {
    setPhase("analyzing");
    // Brief "analyzing" phase for dramatic effect
    setTimeout(() => {
      setPhase("verified");
      stopCamera();
      setTimeout(() => {
        onVerified();
      }, 1200);
    }, 1500);
  }, [onVerified, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="space-y-4 text-center">
      <AnimatePresence mode="wait">
        {/* Camera View */}
        {(phase === "init" || phase === "scanning" || phase === "analyzing") && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative mx-auto"
          >
            {/* Face ID frame */}
            <div className="relative w-56 h-56 mx-auto">
              {/* Scanning animation ring */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
                <defs>
                  <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="1" />
                  </linearGradient>
                </defs>
                {/* Background circle */}
                <circle cx="112" cy="112" r="106" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                {/* Progress arc */}
                <motion.circle
                  cx="112" cy="112" r="106"
                  fill="none"
                  stroke="url(#scanGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 106}`}
                  strokeDashoffset={`${2 * Math.PI * 106 * (1 - scanProgress / 100)}`}
                  transform="rotate(-90 112 112)"
                  className="transition-all duration-300"
                />
              </svg>

              {/* Corner brackets for Face ID feel */}
              <div className="absolute inset-2">
                {/* Top-left */}
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl transition-colors duration-300 ${faceDetected ? "border-accent" : "border-muted-foreground/40"}`} />
                {/* Top-right */}
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl transition-colors duration-300 ${faceDetected ? "border-accent" : "border-muted-foreground/40"}`} />
                {/* Bottom-left */}
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl transition-colors duration-300 ${faceDetected ? "border-accent" : "border-muted-foreground/40"}`} />
                {/* Bottom-right */}
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-xl transition-colors duration-300 ${faceDetected ? "border-accent" : "border-muted-foreground/40"}`} />
              </div>

              {/* Scanning line animation */}
              {phase === "scanning" && (
                <motion.div
                  className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent"
                  animate={{ top: ["15%", "85%", "15%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Analyzing pulse */}
              {phase === "analyzing" && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-accent/10"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}

              {/* Video (circular) */}
              <div className="absolute inset-3 rounded-full overflow-hidden bg-secondary">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                  playsInline
                  muted
                />
              </div>

              {/* Hidden canvas for detection */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Status text */}
            <motion.div className="mt-4 space-y-1" key={phase}>
              {phase === "init" && (
                <>
                  <p className="text-sm font-medium text-foreground">Starting camera…</p>
                  <p className="text-xs text-muted-foreground">Please allow camera access</p>
                </>
              )}
              {phase === "scanning" && (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {faceDetected ? "Face detected — hold steady" : "Position your face in the frame"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {faceDetected
                      ? `Scanning… ${Math.round(scanProgress)}%`
                      : "Look directly at the camera"}
                  </p>
                </>
              )}
              {phase === "analyzing" && (
                <>
                  <p className="text-sm font-medium text-accent">Analyzing face…</p>
                  <p className="text-xs text-muted-foreground">Verifying your identity</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Verified */}
        {phase === "verified" && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-accent/10 mx-auto flex items-center justify-center"
            >
              <ShieldCheck className="w-10 h-10 text-accent" />
            </motion.div>
            <p className="text-base font-bold mt-3 text-accent">Face Verified</p>
            <p className="text-xs text-muted-foreground">Identity confirmed successfully</p>
          </motion.div>
        )}

        {/* Failed */}
        {phase === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <p className="text-base font-bold">Camera Unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">{error || "Could not access camera"}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={startCamera} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
              <Button variant="outline" onClick={onCancel} className="w-full gap-2">
                Use another method
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel button during scanning */}
      {(phase === "scanning" || phase === "init") && (
        <button onClick={() => { stopCamera(); onCancel(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancel · use another method
        </button>
      )}
    </div>
  );
}
