import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wallet, CreditCard, TrendingUp, Send, PiggyBank,
  Bot, X, Sparkles, Landmark,
  Play, Pause, RotateCcw, Volume2, VolumeX,
  ArrowRight, ChevronRight, Globe, Shield, Gift,
  Zap, BarChart3, QrCode, ArrowUpRight, ArrowDownLeft,
  DollarSign, Repeat, Eye, Star, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Scene data ─── */
interface Scene {
  id: string;
  icon: typeof Wallet;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  route: string;
  accentColor: string;
  bgGradient: string;
  duration: number; // ms per scene
  visual: "wallet" | "deposit" | "card" | "send" | "markets" | "savings" | "ai";
}

const SCENES: Scene[] = [
  {
    id: "intro",
    icon: Wallet,
    title: "Your Wallet",
    subtitle: "Everything starts here",
    description: "View balances across multiple currencies, track spending, and manage all your money in one unified dashboard.",
    tip: "Tap your balance to toggle visibility for privacy.",
    route: "/dashboard",
    accentColor: "142 71% 45%",
    bgGradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
    duration: 5000,
    visual: "wallet",
  },
  {
    id: "deposit",
    icon: Landmark,
    title: "Direct Deposit",
    subtitle: "Get paid faster",
    description: "Set up direct deposit with your unique routing and account numbers. Funds arrive instantly — no waiting.",
    tip: "Share your deposit details with your employer to get started.",
    route: "/deposit",
    accentColor: "217 91% 60%",
    bgGradient: "from-blue-500/15 via-indigo-500/10 to-transparent",
    duration: 4500,
    visual: "deposit",
  },
  {
    id: "card",
    icon: CreditCard,
    title: "ExoSky Card",
    subtitle: "Premium metal design",
    description: "Your sleek metal card for everyday spending. Earn 1% cashback on everything, freeze instantly, and control limits.",
    tip: "Freeze or unfreeze your card in one tap from the Card page.",
    route: "/card",
    accentColor: "280 73% 58%",
    bgGradient: "from-violet-500/15 via-purple-500/10 to-transparent",
    duration: 5000,
    visual: "card",
  },
  {
    id: "send",
    icon: Send,
    title: "Send Money",
    subtitle: "Instant & free",
    description: "Send money to anyone worldwide using their handle, email, or QR code — with zero fees and instant delivery.",
    tip: "Use QR Pay for quick in-person payments.",
    route: "/send",
    accentColor: "25 95% 53%",
    bgGradient: "from-orange-500/15 via-amber-500/10 to-transparent",
    duration: 4500,
    visual: "send",
  },
  {
    id: "markets",
    icon: TrendingUp,
    title: "Markets",
    subtitle: "Crypto & stocks",
    description: "Trade Bitcoin, Ethereum, Tesla, Apple and 100+ assets with real-time charts, alerts, and fractional shares.",
    tip: "Set price alerts to never miss an opportunity.",
    route: "/markets",
    accentColor: "190 90% 50%",
    bgGradient: "from-cyan-500/15 via-sky-500/10 to-transparent",
    duration: 5000,
    visual: "markets",
  },
  {
    id: "savings",
    icon: PiggyBank,
    title: "Savings",
    subtitle: "6% APY — no lock-ups",
    description: "Grow your money with industry-leading 6% annual yield. Deposit and withdraw anytime — your money stays liquid.",
    tip: "Check the dashboard to see your monthly earnings projection.",
    route: "/savings",
    accentColor: "142 71% 45%",
    bgGradient: "from-green-500/15 via-lime-500/10 to-transparent",
    duration: 4500,
    visual: "savings",
  },
  {
    id: "ai",
    icon: Bot,
    title: "AI Advisor",
    subtitle: "Your financial copilot",
    description: "Get personalized insights, spending analysis, and smart recommendations powered by AI — available 24/7.",
    tip: "Ask about your spending patterns for tailored advice.",
    route: "/advisor",
    accentColor: "330 81% 60%",
    bgGradient: "from-pink-500/15 via-rose-500/10 to-transparent",
    duration: 4500,
    visual: "ai",
  },
];

const STORAGE_KEY = "exosky-onboarding-complete";

/* ─── Mini animated visuals for each scene ─── */
function SceneVisual({ visual, accentColor }: { visual: string; accentColor: string }) {
  const accent = `hsl(${accentColor})`;
  const accentDim = `hsl(${accentColor} / 0.15)`;
  const accentMid = `hsl(${accentColor} / 0.3)`;

  const baseClasses = "w-full h-full flex items-center justify-center";

  switch (visual) {
    case "wallet":
      return (
        <div className={baseClasses}>
          <div className="relative w-full max-w-[200px]">
            {/* Balance card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="rounded-xl p-4 border border-white/10 bg-white/[0.06] backdrop-blur"
            >
              <p className="text-[8px] text-white/40 mb-0.5">Total Balance</p>
              <motion.p
                className="text-xl font-bold text-white font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                $24,856
              </motion.p>
              <div className="flex gap-2 mt-3">
                {[
                  { icon: ArrowDownLeft, label: "Add", color: accent },
                  { icon: ArrowUpRight, label: "Send", color: "white" },
                  { icon: Repeat, label: "Swap", color: "white" },
                ].map((a, i) => (
                  <motion.div
                    key={a.label}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, type: "spring", stiffness: 400 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: i === 0 ? accent : "rgba(255,255,255,0.08)" }}
                    >
                      <a.icon className="w-3 h-3" style={{ color: i === 0 ? "black" : "rgba(255,255,255,0.6)" }} />
                    </div>
                    <span className="text-[7px] text-white/40">{a.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Floating currency badges */}
            {["USD", "EUR", "GBP"].map((c, i) => (
              <motion.div
                key={c}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.15, type: "spring", stiffness: 300 }}
                className="absolute w-8 h-8 rounded-full border border-white/10 bg-card/80 backdrop-blur flex items-center justify-center"
                style={{
                  top: `${-8 + i * 15}px`,
                  right: `${-12 + i * 8}px`,
                }}
              >
                <span className="text-[7px] font-bold text-white/70">{c}</span>
              </motion.div>
            ))}
          </div>
        </div>
      );

    case "deposit":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[200px]">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-4 border border-white/10 bg-white/[0.06] space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentDim }}>
                  <Landmark className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-white">Direct Deposit</p>
                  <p className="text-[7px] text-white/40">Setup your account</p>
                </div>
              </div>
              {[
                { label: "Routing", value: "021000021" },
                { label: "Account", value: "****4832" },
              ].map((field, i) => (
                <motion.div
                  key={field.label}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.2 }}
                  className="p-2 rounded-lg bg-white/[0.04] border border-white/5"
                >
                  <p className="text-[7px] text-white/30">{field.label}</p>
                  <p className="text-[10px] font-mono font-semibold text-white">{field.value}</p>
                </motion.div>
              ))}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="flex items-center gap-1.5 p-2 rounded-lg border border-white/5"
                style={{ backgroundColor: `hsl(${accentColor} / 0.08)` }}
              >
                <Shield className="w-3 h-3" style={{ color: accent }} />
                <span className="text-[7px] font-medium" style={{ color: accent }}>FDIC Protected</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      );

    case "card":
      return (
        <div className={baseClasses}>
          <motion.div
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-[210px]"
            style={{ perspective: 800 }}
          >
            <div
              className="rounded-2xl p-4 aspect-[1.586/1] flex flex-col justify-between relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(160 30% 12%), hsl(150 40% 6%))",
                border: "1px solid hsl(150 30% 20%)",
              }}
            >
              {/* Accent glow */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "radial-gradient(circle at 20% 80%, hsl(142 71% 45% / 0.4), transparent 50%), radial-gradient(circle at 80% 20%, hsl(160 60% 40% / 0.2), transparent 50%)"
              }} />
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold opacity-[0.06] select-none tracking-tighter text-white">Ξ╳</span>
              </div>
              {/* Top row: logo + type */}
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white/80 tracking-tighter">Ξ╳</span>
                  </div>
                  <span className="text-[8px] font-bold tracking-wider text-white/80">Ξ╳OSKY</span>
                </div>
                <span className="text-[7px] font-medium text-white/50">METAL</span>
              </div>
              {/* Chip */}
              <div className="relative">
                <div className="w-7 h-5 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40 border border-yellow-700/30" />
              </div>
              {/* Bottom: number, expiry, visa */}
              <div className="relative space-y-1.5">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-[10px] font-mono tracking-[0.15em] text-white/90"
                >
                  •••• 4832
                </motion.p>
                <div className="flex items-end justify-between">
                  <p className="text-[7px] text-white/40">ExoSky Card</p>
                  <p className="text-[8px] font-mono text-white/80">09/28</p>
                  <span className="text-[9px] font-bold italic tracking-tighter text-white/60">VISA</span>
                </div>
              </div>
            </div>
            {/* Cashback indicator */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-white/8 bg-white/[0.04]"
            >
              <Gift className="w-3 h-3" style={{ color: accent }} />
              <span className="text-[8px] font-semibold" style={{ color: accent }}>1% cashback on everything</span>
            </motion.div>
          </motion.div>
        </div>
      );

    case "send":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[200px]">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-4 border border-white/10 bg-white/[0.06]"
            >
              {/* Sending animation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white/60">AJ</span>
                  </div>
                  <span className="text-[9px] text-white/50">You</span>
                </div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex-1 mx-3 h-px origin-left"
                  style={{ backgroundColor: accent }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/50">@sarah</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white/60">SK</span>
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: "spring" }}
                className="text-center p-3 rounded-lg"
                style={{ backgroundColor: `hsl(${accentColor} / 0.08)` }}
              >
                <p className="text-lg font-bold text-white font-mono">$500.00</p>
                <p className="text-[8px] mt-1" style={{ color: accent }}>Instant · Zero fees</p>
              </motion.div>
              {/* QR + handle options */}
              <div className="flex gap-2 mt-3">
                {[
                  { icon: QrCode, label: "QR Code" },
                  { icon: Globe, label: "Worldwide" },
                ].map((opt, i) => (
                  <motion.div
                    key={opt.label}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.3 + i * 0.15 }}
                    className="flex-1 flex items-center gap-1.5 p-2 rounded-lg border border-white/5 bg-white/[0.03]"
                  >
                    <opt.icon className="w-3 h-3 text-white/40" />
                    <span className="text-[7px] text-white/40">{opt.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      );

    case "markets":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[200px]">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-3 border border-white/10 bg-white/[0.06]"
            >
              {/* BTC header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-amber-400">₿</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white">Bitcoin</p>
                    <p className="text-[7px] text-white/30">BTC</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-white font-mono">$67,842</p>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-[7px] font-semibold text-green-400"
                  >
                    +5.23%
                  </motion.span>
                </div>
              </div>
              {/* Animated chart */}
              <svg viewBox="0 0 200 50" className="w-full h-10">
                <motion.path
                  d="M0,40 C20,38 35,35 50,28 C65,21 80,26 100,20 C120,14 140,18 160,12 C175,8 190,5 200,3"
                  fill="none"
                  stroke={accent}
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                />
                <motion.path
                  d="M0,40 C20,38 35,35 50,28 C65,21 80,26 100,20 C120,14 140,18 160,12 C175,8 190,5 200,3 L200,50 L0,50 Z"
                  fill={`hsl(${accentColor} / 0.1)`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.8 }}
                />
              </svg>
              {/* Mini asset list */}
              {[
                { name: "Ethereum", code: "ETH", price: "$3,456", change: "+3.1%", up: true },
                { name: "Apple", code: "AAPL", price: "$189.50", change: "+1.2%", up: true },
              ].map((asset, i) => (
                <motion.div
                  key={asset.code}
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.8 + i * 0.15 }}
                  className="flex items-center justify-between py-1.5 border-t border-white/5"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center">
                      <span className="text-[6px] font-bold text-white/50">{asset.code.slice(0, 2)}</span>
                    </div>
                    <span className="text-[8px] font-medium text-white">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-white/70">{asset.price}</span>
                    <span className={`text-[7px] font-semibold ${asset.up ? "text-green-400" : "text-red-400"}`}>{asset.change}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      );

    case "savings":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[200px]">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-4 border border-white/10 bg-white/[0.06]"
            >
              <div className="text-center mb-3">
                <p className="text-[8px] text-white/40">Savings Balance</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xl font-bold text-white font-mono"
                >
                  $12,450
                </motion.p>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="h-px mx-auto mt-2"
                  style={{ backgroundColor: accent }}
                />
              </div>
              {/* APY indicator */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: "spring" }}
                className="p-3 rounded-lg text-center mb-3"
                style={{ backgroundColor: `hsl(${accentColor} / 0.08)`, border: `1px solid hsl(${accentColor} / 0.15)` }}
              >
                <p className="text-2xl font-black" style={{ color: accent }}>6%</p>
                <p className="text-[8px] text-white/50">Annual Percentage Yield</p>
              </motion.div>
              {/* Earnings */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04]"
              >
                <span className="text-[8px] text-white/40">Monthly earnings</span>
                <span className="text-[9px] font-bold font-mono" style={{ color: accent }}>+$62.25</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      );

    case "ai":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[200px]">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-3 border border-white/10 bg-white/[0.06] space-y-2"
            >
              {/* Chat bubbles */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-2"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accentDim }}>
                  <Bot className="w-3 h-3" style={{ color: accent }} />
                </div>
                <div className="p-2 rounded-lg bg-white/[0.06] border border-white/5 flex-1">
                  <p className="text-[8px] text-white/70 leading-relaxed">
                    Good morning! You spent 23% less on dining this month. Keep it up! 🎉
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex gap-2 justify-end"
              >
                <div className="p-2 rounded-lg border border-white/8 max-w-[75%]" style={{ backgroundColor: `hsl(${accentColor} / 0.1)` }}>
                  <p className="text-[8px] text-white/70 leading-relaxed">
                    What should I invest in?
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex gap-2"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accentDim }}>
                  <Bot className="w-3 h-3" style={{ color: accent }} />
                </div>
                <div className="p-2 rounded-lg bg-white/[0.06] border border-white/5 flex-1">
                  <p className="text-[8px] text-white/70 leading-relaxed">
                    Based on your profile, a diversified mix of ETFs and BTC could work well. Want details?
                  </p>
                </div>
              </motion.div>
              {/* Suggestion chips */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 2 }}
                className="flex gap-1.5 flex-wrap"
              >
                {["Spending tips", "Savings goals", "Market insights"].map((chip) => (
                  <div key={chip} className="px-2 py-1 rounded-full border border-white/8 bg-white/[0.03]">
                    <span className="text-[7px] text-white/40">{chip}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* Wifi icon used in card visual */
function Wifi(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

/* ─── Main Component ─── */
export function OnboardingTutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Progress timer
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
    localStorage.setItem(STORAGE_KEY, "true");
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
    startTimeRef.current = Date.now();
    if (hasCompleted) {
      setIsPlaying(true);
      setHasCompleted(false);
    }
  };

  const handleTryFeature = () => {
    handleClose();
    navigate(SCENES[currentScene].route);
  };

  if (!isVisible) return null;

  const scene = SCENES[currentScene];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-[440px] max-h-[92dvh] flex flex-col"
        >
          <div className="relative overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border/50 shadow-2xl flex flex-col max-h-[92dvh]">
            
            {/* ─── Top bar: film-style controls ─── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-card/95 backdrop-blur shrink-0">
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
                  onClick={handleReplay}
                  className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                  title="Replay"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* ─── Scene timeline (like a video scrubber) ─── */}
            <div className="flex gap-1 px-4 py-2 shrink-0">
              {SCENES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => handleGoToScene(i)}
                  className="flex-1 h-1 rounded-full overflow-hidden bg-muted/40 relative cursor-pointer group"
                  title={s.title}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      backgroundColor: i === currentScene ? `hsl(${scene.accentColor})` : i < currentScene ? `hsl(${SCENES[i].accentColor})` : "transparent",
                      width: i < currentScene ? "100%" : i === currentScene ? `${progress}%` : "0%",
                    }}
                    transition={{ duration: 0.05 }}
                  />
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-foreground/10 transition-opacity" />
                </button>
              ))}
            </div>

            {/* ─── Visual stage (the "video" area) ─── */}
            <div className="relative overflow-hidden shrink-0" style={{ minHeight: "240px" }}>
              {/* Cinematic gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${scene.bgGradient}`} />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 80%, hsl(${scene.accentColor} / 0.2), transparent 70%)`,
                }}
              />
              {/* Dark base for the visual */}
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
                  className="relative z-10 p-6 h-[240px] flex items-center justify-center"
                >
                  <SceneVisual visual={scene.visual} accentColor={scene.accentColor} />
                </motion.div>
              </AnimatePresence>

              {/* Play/pause overlay button */}
              <button
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

            {/* ─── Content area ─── */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScene}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Scene title group */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `hsl(${scene.accentColor} / 0.12)` }}
                    >
                      <scene.icon className="w-5 h-5" style={{ color: `hsl(${scene.accentColor})` }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground leading-tight">{scene.title}</h2>
                      <p className="text-xs text-muted-foreground font-medium">{scene.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/75 leading-relaxed mb-3">
                    {scene.description}
                  </p>

                  {/* Pro tip */}
                  <div
                    className="flex items-start gap-2.5 rounded-xl p-3"
                    style={{
                      backgroundColor: `hsl(${scene.accentColor} / 0.06)`,
                      border: `1px solid hsl(${scene.accentColor} / 0.12)`,
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: `hsl(${scene.accentColor})` }} />
                    <p className="text-xs font-medium leading-relaxed" style={{ color: `hsl(${scene.accentColor})` }}>
                      {scene.tip}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* ─── Actions ─── */}
              <div className="mt-5 flex items-center gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplay}
                      className="gap-1.5 text-xs"
                    >
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
                      if (currentScene < SCENES.length - 1) {
                        handleGoToScene(currentScene + 1);
                      } else {
                        handleClose();
                      }
                    }}
                    className="bg-foreground text-background hover:bg-foreground/90 gap-1 text-xs"
                  >
                    {currentScene === SCENES.length - 1 ? "Get Started" : "Next"}
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Skip on first scene */}
              {currentScene === 0 && !hasCompleted && (
                <button
                  onClick={handleClose}
                  className="w-full text-center mt-4 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip — I'll explore on my own
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Call this to reset the onboarding (e.g. from settings) */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
