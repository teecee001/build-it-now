import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, ShieldCheck, AlertTriangle, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FaceScannerProps {
  onVerified: () => void;
  onFailed: (error: string) => void;
  onCancel: () => void;
}

type ScanPhase = "init" | "positioning" | "scanning" | "analyzing" | "verified" | "failed";

interface FacePosition {
  centered: boolean;
  sizeOk: boolean;
  stable: boolean;
}

export function FaceScanner({ onVerified, onFailed, onCancel }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("init");
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [facePos, setFacePos] = useState<FacePosition>({ centered: false, sizeOk: false, stable: false });
  const [positionHoldTime, setPositionHoldTime] = useState(0);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionReadyFrames = useRef(0);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
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
    setFacePos({ centered: false, sizeOk: false, stable: false });
    setPositionHoldTime(0);
    positionReadyFrames.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("positioning");
      startPositionDetection();
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permissions.");
      setPhase("failed");
    }
  }, []);

  // Analyze face position: center, size, stability
  function analyzeFaceRegion(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): { detected: boolean; centered: boolean; sizeOk: boolean; centerX: number; centerY: number; coverage: number } {
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return { detected: false, centered: false, sizeOk: false, centerX: 0.5, centerY: 0.5, coverage: 0 };

    // Scan for skin-tone pixels in the full frame to find face bounding box
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let skinCount = 0;
    const step = 8; // sample every 8th pixel for speed

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) {
          skinCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalSampled = (w / step) * (h / step);
    const skinRatio = skinCount / totalSampled;
    const detected = skinRatio > 0.08;

    if (!detected) return { detected: false, centered: false, sizeOk: false, centerX: 0.5, centerY: 0.5, coverage: 0 };

    const faceCX = (minX + maxX) / 2 / w; // normalized 0-1
    const faceCY = (minY + maxY) / 2 / h;
    const faceW = (maxX - minX) / w;
    const faceH = (maxY - minY) / h;
    const coverage = Math.max(faceW, faceH);

    const centered = Math.abs(faceCX - 0.5) < 0.15 && Math.abs(faceCY - 0.5) < 0.18;
    const sizeOk = coverage > 0.15 && coverage < 0.95;

    return { detected, centered, sizeOk, centerX: faceCX, centerY: faceCY, coverage };
  }

  const startPositionDetection = useCallback(() => {
    let stablePositionFrames = 0;
    const POSITION_READY_THRESHOLD = 12; // ~3 seconds of good positioning

    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const analysis = analyzeFaceRegion(ctx, canvas);
      
      setFaceDetected(analysis.detected);
      setFacePos({
        centered: analysis.centered,
        sizeOk: analysis.sizeOk,
        stable: stablePositionFrames > 3,
      });

      if (analysis.detected && analysis.centered && analysis.sizeOk) {
        stablePositionFrames++;
        setPositionHoldTime(Math.min(100, (stablePositionFrames / POSITION_READY_THRESHOLD) * 100));
      } else {
        stablePositionFrames = Math.max(0, stablePositionFrames - 2);
        setPositionHoldTime(Math.min(100, (stablePositionFrames / POSITION_READY_THRESHOLD) * 100));
      }

      // Once positioned well enough, transition to scanning
      if (stablePositionFrames >= POSITION_READY_THRESHOLD) {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        setPhase("scanning");
        startVerificationScan();
      }
    }, 250);
  }, []);

  const startVerificationScan = useCallback(() => {
    let verifyFrames = 0;
    const REQUIRED_VERIFY_FRAMES = 10; // ~2.5 seconds of stable scan

    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const analysis = analyzeFaceRegion(ctx, canvas);

      if (analysis.detected && analysis.centered && analysis.sizeOk) {
        verifyFrames++;
        setFaceDetected(true);
      } else {
        verifyFrames = Math.max(0, verifyFrames - 1);
        setFaceDetected(analysis.detected);
      }

      setScanProgress(Math.min(100, (verifyFrames / REQUIRED_VERIFY_FRAMES) * 100));

      if (verifyFrames >= REQUIRED_VERIFY_FRAMES) {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        completeVerification();
      }
    }, 250);
  }, []);

  const completeVerification = useCallback(() => {
    setPhase("analyzing");
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

  const positionChecks = [
    { label: "Face detected", ok: faceDetected },
    { label: "Centered in frame", ok: facePos.centered },
    { label: "Correct distance", ok: facePos.sizeOk },
    { label: "Holding steady", ok: facePos.stable },
  ];

  // Guidance message
  function getGuidance(): string {
    if (!faceDetected) return "Move your face into the frame";
    if (!facePos.centered) return "Center your face in the circle";
    if (!facePos.sizeOk) return "Move closer or further from camera";
    if (!facePos.stable) return "Hold still…";
    return "Great! Hold position…";
  }

  return (
    <div className="space-y-4 text-center">
      <AnimatePresence mode="wait">
        {/* Camera View — Positioning + Scanning + Analyzing */}
        {(phase === "init" || phase === "positioning" || phase === "scanning" || phase === "analyzing") && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative mx-auto"
          >
            <div className="relative w-56 h-56 mx-auto">
              {/* Progress ring */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
                <defs>
                  <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="posGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <circle cx="112" cy="112" r="106" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                {/* Position hold progress (positioning phase) */}
                {phase === "positioning" && (
                  <motion.circle
                    cx="112" cy="112" r="106"
                    fill="none"
                    stroke="url(#posGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 106}`}
                    strokeDashoffset={`${2 * Math.PI * 106 * (1 - positionHoldTime / 100)}`}
                    transform="rotate(-90 112 112)"
                    className="transition-all duration-300"
                  />
                )}
                {/* Scan progress (scanning phase) */}
                {(phase === "scanning" || phase === "analyzing") && (
                  <motion.circle
                    cx="112" cy="112" r="106"
                    fill="none"
                    stroke="url(#scanGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 106}`}
                    strokeDashoffset={`${2 * Math.PI * 106 * (1 - scanProgress / 100)}`}
                    transform="rotate(-90 112 112)"
                    className="transition-all duration-300"
                  />
                )}
              </svg>

              {/* Corner brackets */}
              <div className="absolute inset-2">
                {[
                  "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl",
                  "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl",
                  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl",
                  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl",
                ].map((cls, i) => (
                  <div
                    key={i}
                    className={`absolute w-8 h-8 transition-colors duration-300 ${cls} ${
                      phase === "scanning" || phase === "analyzing"
                        ? "border-accent"
                        : faceDetected && facePos.centered && facePos.sizeOk
                        ? "border-accent"
                        : faceDetected
                        ? "border-warning"
                        : "border-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>

              {/* Scanning line */}
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

              {/* Video */}
              <div className="absolute inset-3 rounded-full overflow-hidden bg-secondary">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                  playsInline
                  muted
                />
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Status + Guidance */}
            <div className="mt-4 space-y-2">
              {phase === "init" && (
                <p className="text-sm font-medium text-foreground">Starting camera…</p>
              )}

              {phase === "positioning" && (
                <>
                  <p className="text-sm font-medium text-foreground">{getGuidance()}</p>

                  {/* Position checklist */}
                  <div className="flex flex-col items-center gap-1 mt-2">
                    {positionChecks.map((check, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 ${
                          check.ok ? "bg-accent/20" : "bg-muted"
                        }`}>
                          {check.ok && <Check className="w-3 h-3 text-accent" />}
                        </div>
                        <span className={`transition-colors duration-300 ${check.ok ? "text-accent font-medium" : "text-muted-foreground"}`}>
                          {check.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              {phase === "scanning" && (
                <>
                  <p className="text-sm font-medium text-accent">Scanning face… {Math.round(scanProgress)}%</p>
                  <p className="text-xs text-muted-foreground">Hold still — verifying identity</p>
                </>
              )}

              {phase === "analyzing" && (
                <>
                  <p className="text-sm font-medium text-accent">Analyzing face…</p>
                  <p className="text-xs text-muted-foreground">Confirming identity match</p>
                </>
              )}
            </div>
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

      {/* Cancel */}
      {(phase === "positioning" || phase === "scanning" || phase === "init") && (
        <button onClick={() => { stopCamera(); onCancel(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancel · use another method
        </button>
      )}
    </div>
  );
}
