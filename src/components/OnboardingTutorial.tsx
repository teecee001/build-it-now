import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wallet, CreditCard, TrendingUp, Send, PiggyBank, Bot, Landmark,
  X, ChevronRight, RotateCcw, ArrowRight, Play, Pause,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "exosky-onboarding-complete";

const SCENES = [
  {
    id: "wallet",
    icon: Wallet,
    title: "Your Wallet",
    subtitle: "Everything starts here",
    description:
      "View balances across currencies, track activity, and manage money in one dashboard.",
    tip: "Tap your balance to toggle visibility.",
    route: "/dashboard",
    accent: "142 71% 45%",
    duration: 5000,
  },
  {
    id: "deposit",
    icon: Landmark,
    title: "Deposit",
    subtitle: "Fund your account",
    description: "Add funds and see them reflected on your balance in the demo wallet.",
    tip: "Use Deposit from the menu when you are ready to explore funding flows.",
    route: "/deposit",
    accent: "217 91% 60%",
    duration: 4500,
  },
  {
    id: "card",
    icon: CreditCard,
    title: "ExoSky Card",
    subtitle: "Premium design",
    description: "Explore the card experience — freeze, limits, and cashback in the product vision.",
    tip: "Open Card anytime from the sidebar.",
    route: "/card",
    accent: "280 73% 58%",
    duration: 5000,
  },
  {
    id: "send",
    icon: Send,
    title: "Send Money",
    subtitle: "Instant transfers",
    description: "Send to handles, email, or QR — designed for zero-fee peer transfers.",
    tip: "Try QR Pay for in-person style payments.",
    route: "/send",
    accent: "25 95% 53%",
    duration: 4500,
  },
  {
    id: "markets",
    icon: TrendingUp,
    title: "Markets",
    subtitle: "Crypto, stocks & more",
    description: "Browse live markets with charts, logos, and multi-asset discovery.",
    tip: "Start with Markets → Crypto for the fullest live feed.",
    route: "/markets",
    accent: "190 90% 50%",
    duration: 5000,
  },
  {
    id: "savings",
    icon: PiggyBank,
    title: "Savings",
    subtitle: "Grow at 6% APY",
    description: "Move paper balances into Savings and see yield in the product story.",
    tip: "Check the dashboard for projected earnings.",
    route: "/savings",
    accent: "142 71% 45%",
    duration: 4500,
  },
  {
    id: "ai",
    icon: Bot,
    title: "AI Advisor",
    subtitle: "Your financial copilot",
    description: "Ask for insights, spending patterns, and smart recommendations anytime.",
    tip: "Open AI Advisor from the menu after the tour.",
    route: "/advisor",
    accent: "330 81% 60%",
    duration: 4500,
  },
] as const;

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

  if (!isVisible) return null;

  const scene = SCENES[currentScene];
  const Icon = scene.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-full flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border shrink-0 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="p-1.5 rounded-md hover:bg-secondary/80"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                Welcome tour · {currentScene + 1}/{SCENES.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleReplay} className="p-1.5 rounded-md hover:bg-secondary/80" title="Replay">
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button type="button" onClick={handleClose} className="p-1.5 rounded-md hover:bg-secondary/80">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex gap-1 px-4 py-2 shrink-0">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleGoToScene(i)}
                className="flex-1 h-1 rounded-full overflow-hidden bg-muted/40 relative"
                title={s.title}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    backgroundColor: `hsl(${SCENES[i].accent})`,
                    width:
                      i < currentScene
                        ? "100%"
                        : i === currentScene
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </button>
            ))}
          </div>

          <div
            className="relative flex-1 flex items-center justify-center min-h-[40vh]"
            style={{
              background: `radial-gradient(circle at 50% 45%, hsl(${scene.accent} / 0.22), transparent 65%), radial-gradient(circle at 80% 20%, hsl(${scene.accent} / 0.08), transparent 40%), hsl(240 10% 5%)`,
            }}
          >
            <motion.div
              key={scene.id}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl"
              style={{ backgroundColor: `hsl(${scene.accent} / 0.18)` }}
            >
              <Icon className="w-14 h-14 sm:w-16 sm:h-16" style={{ color: `hsl(${scene.accent})` }} />
            </motion.div>
          </div>

          <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 shrink-0 bg-card border-t border-border">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: `hsl(${scene.accent})` }}>
                {scene.subtitle}
              </p>
              <h2 className="text-2xl font-bold mt-1 tracking-tight">{scene.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md">{scene.description}</p>
              <p className="text-xs text-muted-foreground/80 mt-2 italic">Tip: {scene.tip}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                style={{ color: `hsl(${scene.accent})` }}
                onClick={() => {
                  handleClose();
                  navigate(scene.route);
                }}
              >
                Try it now <ArrowRight className="w-3 h-3" />
              </Button>
              <div className="flex-1" />
              {hasCompleted ? (
                <Button size="sm" onClick={handleClose} className="bg-accent text-accent-foreground gap-1.5 text-xs">
                  Get Started <ChevronRight className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-foreground text-background gap-1 text-xs"
                  onClick={() => {
                    if (currentScene < SCENES.length - 1) handleGoToScene(currentScene + 1);
                    else handleClose();
                  }}
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
                className="w-full text-center mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip — I&apos;ll explore on my own
              </button>
            )}
          </div>
        </motion.div>
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
