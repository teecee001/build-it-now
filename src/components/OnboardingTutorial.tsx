import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X, Sparkles, Play, Pause, RotateCcw,
  ArrowRight, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SCENES, SceneVisual } from "@/components/OnboardingTutorialScenes";

const STORAGE_KEY = "exosky-onboarding-complete";

export function OnboardingTutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const storageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;

  useEffect(() => {
    if (!user?.id) return;
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      const timer = setTimeout(() => {
        setCurrentScene(0);
        setProgress(0);
        setIsPlaying(true);
        setHasCompleted(false);
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!isVisible || !isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const scene = SCENES[currentScene];
    startTimeRef.current = Date.now() - (progress / 100) * scene.duration;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / scene.duration) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        if (currentScene < SCENES.length - 1) {
          setCurrentScene((s) => s + 1);
          setProgress(0);
          startTimeRef.current = Date.now();
        } else {
          setIsPlaying(false);
          setHasCompleted(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    }, 30);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible, isPlaying, currentScene]);

  const handleClose = () => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  };

  const handleReplay = () => {
    setCurrentScene(0);
    setProgress(0);
    setIsPlaying(true);
    setHasCompleted(false);
  };

  const handleGoToScene = (index: number) => {
    setCurrentScene(index);
    setProgress(0);
    setIsPlaying(true);
    setHasCompleted(false);
    startTimeRef.current = Date.now();
  };

  const handleTryFeature = () => {
    const route = SCENES[currentScene].route;
    handleClose();
    navigate(route);
  };

  if (!isVisible) return null;

  const scene = SCENES[currentScene];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="w-full h-full flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 border-b border-border/30 bg-background/90 backdrop-blur shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-accent-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                Welcome
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {currentScene + 1}/{SCENES.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReplay}
                className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                title="Replay"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex gap-1 px-4 py-2 shrink-0">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleGoToScene(i)}
                className="flex-1 h-1 rounded-full overflow-hidden bg-muted/40 relative cursor-pointer group"
                title={s.title}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    backgroundColor:
                      i === currentScene
                        ? `hsl(${scene.accentColor})`
                        : i < currentScene
                          ? `hsl(${SCENES[i].accentColor})`
                          : "transparent",
                    width:
                      i < currentScene
                        ? "100%"
                        : i === currentScene
                          ? `${progress}%`
                          : "0%",
                  }}
                  transition={{ duration: 0.05 }}
                />
              </button>
            ))}
          </div>

          {/* Visual stage — rich animated scenes */}
          <div className="relative flex-1 min-h-[42vh] overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${scene.bgGradient}`} />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 80%, hsl(${scene.accentColor} / 0.2), transparent 70%)`,
              }}
            />
            <div className="absolute inset-0 bg-[hsl(240_10%_6%)]" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, hsl(${scene.accentColor} / 0.08), transparent 80%)`,
              }}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative z-10 p-6 h-full flex items-center justify-center"
              >
                <SceneVisual visual={scene.visual} accentColor={scene.accentColor} />
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 text-white/70" />
              ) : (
                <Play className="w-3 h-3 text-white/70" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6 shrink-0 overflow-y-auto border-t border-border/30 bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `hsl(${scene.accentColor} / 0.12)` }}
                  >
                    <scene.icon className="w-5 h-5" style={{ color: `hsl(${scene.accentColor})` }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-medium uppercase tracking-wider"
                      style={{ color: `hsl(${scene.accentColor})` }}
                    >
                      {scene.subtitle}
                    </p>
                    <h2 className="text-xl font-bold tracking-tight">{scene.title}</h2>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{scene.description}</p>
                <p className="text-xs text-muted-foreground/80 mt-2 italic">Tip: {scene.tip}</p>

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTryFeature}
                    className="gap-1.5 text-xs"
                    style={{ color: `hsl(${scene.accentColor})` }}
                  >
                    Try it now <ArrowRight className="w-3 h-3" />
                  </Button>
                  <div className="flex-1" />
                  {hasCompleted ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleReplay} className="gap-1.5 text-xs">
                        <RotateCcw className="w-3 h-3" />
                        Replay
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleClose}
                        className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-xs"
                      >
                        Get Started <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (currentScene < SCENES.length - 1) handleGoToScene(currentScene + 1);
                        else handleClose();
                      }}
                      className="bg-foreground text-background hover:bg-foreground/90 gap-1 text-xs"
                    >
                      {currentScene === SCENES.length - 1 ? "Get Started" : "Next"}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {currentScene === 0 && !hasCompleted && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full text-center mt-4 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip — I&apos;ll explore on my own
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function resetOnboarding(userId?: string) {
  if (userId) {
    localStorage.removeItem(`${STORAGE_KEY}:${userId}`);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`${STORAGE_KEY}:`))
      .forEach((k) => localStorage.removeItem(k));
  }
}
