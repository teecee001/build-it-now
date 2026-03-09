import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Wallet, CreditCard, TrendingUp, Send, PiggyBank,
  Bot, ChevronRight, ChevronLeft, X, Sparkles, Landmark, QrCode
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ExoLogo } from "./ExoLogo";

interface TutorialStep {
  icon: typeof Wallet;
  title: string;
  description: string;
  tip: string;
  route: string;
  gradient: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: Wallet,
    title: "Your Wallet",
    description: "View your balance, manage multiple currencies, and track your spending — all in one place.",
    tip: "Tap your balance on the dashboard to toggle visibility for privacy.",
    route: "/dashboard",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: Landmark,
    title: "Direct Deposit",
    description: "Set up direct deposit with your unique routing and account numbers to get paid faster.",
    tip: "Go to Deposit to find your banking details and fund your account.",
    route: "/deposit",
    gradient: "from-blue-500/20 to-indigo-500/20",
  },
  {
    icon: CreditCard,
    title: "ExoSky Card",
    description: "Your premium metal card for everyday spending. Earn cashback on every purchase.",
    tip: "Freeze or unfreeze your card instantly from the Card page.",
    route: "/card",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: Send,
    title: "Send Money",
    description: "Send money instantly to anyone using their handle, email, or QR code — zero fees.",
    tip: "Use QR Pay for quick in-person payments.",
    route: "/send",
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  {
    icon: TrendingUp,
    title: "Markets",
    description: "Trade crypto and stocks with real-time charts and market data at your fingertips.",
    tip: "Set rate alerts to get notified when prices hit your targets.",
    route: "/markets",
    gradient: "from-cyan-500/20 to-sky-500/20",
  },
  {
    icon: PiggyBank,
    title: "Savings",
    description: "Grow your money with up to 6% APY. Move funds in and out anytime — no lock-ups.",
    tip: "Check the dashboard to see your monthly earnings projection.",
    route: "/savings",
    gradient: "from-green-500/20 to-lime-500/20",
  },
  {
    icon: Bot,
    title: "AI Advisor",
    description: "Get personalized financial insights and ask anything about your money.",
    tip: "Ask the AI about your spending patterns for smart recommendations.",
    route: "/advisor",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
];

const STORAGE_KEY = "exosky-onboarding-complete";

export function OnboardingTutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so dashboard renders first
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const handleGoToFeature = () => {
    handleComplete();
    navigate(STEPS[currentStep].route);
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:px-4"
        onClick={(e) => e.target === e.currentTarget && handleComplete()}
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full sm:max-w-md"
        >
          <Card className="relative overflow-hidden border-border bg-card shadow-2xl rounded-b-none sm:rounded-b-xl max-h-[90dvh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={handleComplete}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header gradient */}
            <div className={`relative bg-gradient-to-br ${step.gradient} p-5 pb-8 sm:p-8 sm:pb-12`}>
              {/* Step counter */}
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <ExoLogo size="sm" variant="mark" />
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Welcome Tour · {currentStep + 1}/{STEPS.length}
                </span>
              </div>

              {/* Icon */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg mb-3 sm:mb-4">
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">{step.title}</h2>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                    {step.description}
                  </p>
                  <div className="flex items-start gap-2.5 bg-accent/10 rounded-xl p-3.5">
                    <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-accent font-medium leading-relaxed">
                      {step.tip}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 my-6">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > currentStep ? 1 : -1);
                      setCurrentStep(i);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-6 bg-accent"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoToFeature}
                  className="text-accent hover:text-accent hover:bg-accent/10"
                >
                  Try it now
                </Button>

                <div className="flex-1" />

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-foreground text-background hover:bg-foreground/90 gap-1"
                >
                  {isLast ? "Get Started" : "Next"}
                  {!isLast && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {/* Skip */}
              {currentStep === 0 && (
                <button
                  onClick={handleComplete}
                  className="w-full text-center mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tutorial — I'll explore on my own
                </button>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Call this to reset the onboarding (e.g. from settings) */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
