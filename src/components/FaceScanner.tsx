import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertTriangle, RefreshCw, Check, ArrowUp, ArrowLeft, ArrowRight, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FaceScannerProps {
  onVerified: () => void;
  onFailed: (error: string) => void;
  onCancel: () => void;
}

type ScanPhase = "init" | "positioning" | "challenge" | "analyzing" | "verified" | "failed";
type ChallengeDirection = "left" | "right" | "up";

interface ChallengeStep {
  direction: ChallengeDirection;
  label: string;
  icon: typeof ArrowLeft;
  completed: boolean;
}

const CHALLENGES: ChallengeStep[] = [
  { direction: "left", label: "Turn head left", icon: ArrowLeft, completed: false },
  { direction: "right", label: "Turn head right", icon: ArrowRight, completed: false },
  { direction: "up", label: "Look up", icon: ArrowUp, completed: false },
];

function analyzeFace(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return { detected: false, centerX: 0.5, centerY: 0.5, coverage: 0 };

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let skinCount = 0;
  let sumX = 0, sumY = 0;
  const step = 6;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) {
        skinCount++;
        sumX += x;
        sumY += y;
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

  if (!detected || skinCount === 0) return { detected: false, centerX: 0.5, centerY: 0.5, coverage: 0 };

  const avgX = sumX / skinCount / w; // normalized 0-1
  const avgY = sumY / skinCount / h;
  const faceW = (maxX - minX) / w;
  const faceH = (maxY - minY) / h;
  const coverage = Math.max(faceW, faceH);
  const centered = Math.abs(avgX - 0.5) < 0.25 && Math.abs(avgY - 0.5) < 0.25;
  const sizeOk = coverage > 0.10 && coverage < 0.98;

  return { detected, centerX: avgX, centerY: avgY, coverage, centered, sizeOk };
}

export function FaceScanner({ onVerified, onFailed, onCancel }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<ScanPhase>("init");
  const [faceDetected, setFaceDetected] = useState(false);
  const [positionHoldTime, setPositionHoldTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Challenge state
  const [challenges, setChallenges] = useState<ChallengeStep[]>(CHALLENGES.map(c => ({ ...c })));
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);

  // Baseline center (captured when face is centered during positioning)
  const baselineRef = useRef<{ x: number; y: number } | null>(null);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setPhase("init");
    setError(null);
    setPositionHoldTime(0);
    setFaceDetected(false);
    setChallenges(CHALLENGES.map(c => ({ ...c, completed: false })));
    setCurrentChallengeIdx(0);
    setChallengeProgress(0);
    baselineRef.current = null;

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
      startPositioning();
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
      setPhase("failed");
    }
  }, []);

  const startPositioning = useCallback(() => {
    let stableFrames = 0;
    const THRESHOLD = 12;

    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const a = analyzeFace(ctx, canvas);
      setFaceDetected(a.detected);

      if (a.detected && a.centered && a.sizeOk) {
        stableFrames++;
        // Record baseline position when stable
        if (stableFrames >= 6 && !baselineRef.current) {
          baselineRef.current = { x: a.centerX, y: a.centerY };
        }
      } else {
        stableFrames = Math.max(0, stableFrames - 2);
      }

      setPositionHoldTime(Math.min(100, (stableFrames / THRESHOLD) * 100));

      if (stableFrames >= THRESHOLD) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!baselineRef.current) baselineRef.current = { x: a.centerX, y: a.centerY };
        setPhase("challenge");
        startChallenges();
      }
    }, 250);
  }, []);

  const startChallenges = useCallback(() => {
    let holdFrames = 0;
    const HOLD_THRESHOLD = 4; // ~1 second of holding direction
    let idx = 0;

    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const a = analyzeFace(ctx, canvas);
      setFaceDetected(a.detected);

      if (!a.detected) {
        holdFrames = Math.max(0, holdFrames - 1);
        setChallengeProgress(Math.min(100, (holdFrames / HOLD_THRESHOLD) * 100));
        return;
      }

      const baseline = baselineRef.current || { x: 0.5, y: 0.5 };
      // Note: video is mirrored, so camera left = user's right
      // We detect based on skin centroid shift
      const dx = a.centerX - baseline.x; // positive = shifted right in camera frame (user turned left)
      const dy = a.centerY - baseline.y; // positive = shifted down

      const currentChallenge = CHALLENGES[idx];
      let directionMatched = false;

      // Since camera is mirrored: user turning left moves centroid RIGHT in raw frame
      if (currentChallenge.direction === "left" && dx > 0.025) {
        directionMatched = true;
      } else if (currentChallenge.direction === "right" && dx < -0.025) {
        directionMatched = true;
      } else if (currentChallenge.direction === "up" && dy < -0.015) {
        directionMatched = true;
      }

      if (directionMatched) {
        holdFrames++;
      } else {
        holdFrames = Math.max(0, holdFrames - 1);
      }

      setChallengeProgress(Math.min(100, (holdFrames / HOLD_THRESHOLD) * 100));

      if (holdFrames >= HOLD_THRESHOLD) {
        // Mark challenge complete
        setChallenges(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], completed: true };
          return updated;
        });

        holdFrames = 0;
        setChallengeProgress(0);
        idx++;
        setCurrentChallengeIdx(idx);

        if (idx >= CHALLENGES.length) {
          // All challenges done
          if (intervalRef.current) clearInterval(intervalRef.current);
          completeVerification();
        }
      }
    }, 250);
  }, []);

  const completeVerification = useCallback(() => {
    setPhase("analyzing");
    setTimeout(() => {
      setPhase("verified");
      stopCamera();
      setTimeout(() => onVerified(), 1200);
    }, 1500);
  }, [onVerified, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const currentChallenge = challenges[currentChallengeIdx] || null;
  const completedCount = challenges.filter(c => c.completed).length;
  const overallProgress = ((completedCount + (challengeProgress / 100)) / challenges.length) * 100;

  const getGuidance = (): string => {
    if (phase === "positioning") {
      if (!faceDetected) return "Move your face into the frame";
      return "Center your face and hold still…";
    }
    if (phase === "challenge" && currentChallenge) {
      return currentChallenge.label;
    }
    return "";
  };

  const ringColor = phase === "challenge" || phase === "analyzing"
    ? "url(#scanGrad)"
    : faceDetected ? "url(#posGrad)" : "hsl(var(--border))";

  const ringProgress = phase === "positioning"
    ? positionHoldTime
    : phase === "challenge"
    ? overallProgress
    : phase === "analyzing" ? 100 : 0;

  return (
    <div className="space-y-4 text-center">
      <AnimatePresence mode="wait">
        {(phase === "init" || phase === "positioning" || phase === "challenge" || phase === "analyzing") && (
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
                <motion.circle
                  cx="112" cy="112" r="106"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 106}`}
                  strokeDashoffset={`${2 * Math.PI * 106 * (1 - ringProgress / 100)}`}
                  transform="rotate(-90 112 112)"
                  className="transition-all duration-300"
                />
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
                      phase === "challenge" || phase === "analyzing"
                        ? "border-accent"
                        : faceDetected ? "border-accent" : "border-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>

              {/* Direction arrow overlay during challenges */}
              {phase === "challenge" && currentChallenge && (
                <motion.div
                  key={currentChallenge.direction}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <motion.div
                    animate={
                      currentChallenge.direction === "left"
                        ? { x: [-5, -15, -5] }
                        : currentChallenge.direction === "right"
                        ? { x: [5, 15, 5] }
                        : { y: [-5, -15, -5] }
                    }
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-full bg-accent/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <currentChallenge.icon className="w-6 h-6 text-accent" />
                  </motion.div>
                </motion.div>
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
            <div className="mt-4 space-y-3">
              {phase === "init" && (
                <p className="text-sm font-medium text-foreground">Starting camera…</p>
              )}

              {phase === "positioning" && (
                <p className="text-sm font-medium text-foreground">{getGuidance()}</p>
              )}

              {phase === "challenge" && (
                <>
                  <motion.p
                    key={currentChallenge?.direction}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-semibold text-accent"
                  >
                    {getGuidance()}
                  </motion.p>

                  {/* Challenge progress bar */}
                  <div className="w-40 mx-auto h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${challengeProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  {/* Challenge steps */}
                  <div className="flex items-center justify-center gap-4 mt-2">
                    {challenges.map((ch, i) => {
                      const Icon = ch.icon;
                      const isCurrent = i === currentChallengeIdx;
                      return (
                        <motion.div
                          key={ch.direction}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex flex-col items-center gap-1 ${
                            ch.completed
                              ? "text-accent"
                              : isCurrent
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            ch.completed
                              ? "bg-accent/20 ring-2 ring-accent/40"
                              : isCurrent
                              ? "bg-secondary ring-2 ring-accent/30"
                              : "bg-secondary/50"
                          }`}>
                            {ch.completed ? (
                              <Check className="w-5 h-5 text-accent" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-[10px] font-medium">{ch.direction === "up" ? "Up" : ch.direction === "left" ? "Left" : "Right"}</span>
                        </motion.div>
                      );
                    })}
                  </div>
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
      {(phase === "positioning" || phase === "challenge" || phase === "init") && (
        <button onClick={() => { stopCamera(); onCancel(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Cancel · use another method
        </button>
      )}
    </div>
  );
}
