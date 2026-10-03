import { motion } from "framer-motion";
import {
  Wallet, CreditCard, TrendingUp, Send, PiggyBank,
  Bot, Landmark, Globe, Shield, Gift, QrCode,
  ArrowUpRight, ArrowDownLeft, Repeat,
} from "lucide-react";

export interface Scene {
  id: string;
  icon: typeof Wallet;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  route: string;
  accentColor: string;
  bgGradient: string;
  duration: number;
  visual: "wallet" | "deposit" | "card" | "send" | "markets" | "savings" | "ai";
}

export const SCENES: Scene[] = [
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
    description: "Set up direct deposit with your unique routing and account numbers. Funds arrive instantly. No waiting.",
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
    subtitle: "Instant and free",
    description: "Send money to anyone worldwide using their handle, email, or QR code, with zero fees and instant delivery.",
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
    subtitle: "Crypto and stocks",
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
    subtitle: "6% APY, no lock-ups",
    description: "Grow your money with industry-leading 6% annual yield. Deposit and withdraw anytime. Your money stays liquid.",
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
    title: "Exo",
    subtitle: "Exo Intelligence",
    description: "Get personalized insights, spending analysis, and smart recommendations. Available 24/7.",
    tip: "Ask Exo about your spending patterns for tailored advice.",
    route: "/advisor",
    accentColor: "330 81% 60%",
    bgGradient: "from-pink-500/15 via-rose-500/10 to-transparent",
    duration: 4500,
    visual: "ai",
  },
];

export function SceneVisual({ visual, accentColor }: { visual: string; accentColor: string }) {
  const accent = `hsl(${accentColor})`;
  const accentDim = `hsl(${accentColor} / 0.15)`;
  const baseClasses = "w-full h-full flex items-center justify-center";

  switch (visual) {
    case "wallet":
      return (
        <div className={baseClasses}>
          <div className="relative w-full max-w-[240px]">
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
                  { icon: ArrowDownLeft, label: "Add" },
                  { icon: ArrowUpRight, label: "Send" },
                  { icon: Repeat, label: "Swap" },
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
          </div>
        </div>
      );

    case "deposit":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[240px]">
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
            className="w-full max-w-[260px]"
          >
            <div
              className="rounded-2xl p-4 aspect-[1.586/1] flex flex-col justify-between relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(160 30% 12%), hsl(150 40% 6%))",
                border: "1px solid hsl(150 30% 20%)",
              }}
            >
              <div className="relative flex items-start justify-between">
                <span className="text-[8px] font-bold tracking-wider text-white/80">Ξ╳OSKY</span>
                <span className="text-[7px] font-medium text-white/50">METAL</span>
              </div>
              <div className="relative">
                <div className="w-7 h-5 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40" />
              </div>
              <div className="relative space-y-1.5">
                <p className="text-[10px] font-mono tracking-[0.15em] text-white/90">•••• 4832</p>
                <div className="flex items-end justify-between">
                  <p className="text-[7px] text-white/40">ExoSky Card</p>
                  <span className="text-[9px] font-bold italic tracking-tighter text-white/60">VISA</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      );

    case "send":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[240px]">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-xl p-4 border border-white/10 bg-white/[0.06]">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: "spring" }} className="text-center p-3 rounded-lg" style={{ backgroundColor: `hsl(${accentColor} / 0.08)` }}>
                <p className="text-lg font-bold text-white font-mono">$500.00</p>
                <p className="text-[8px] mt-1" style={{ color: accent }}>Instant · Zero fees</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      );

    case "markets":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[240px]">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-xl p-3 border border-white/10 bg-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold text-white">Bitcoin</p>
                <p className="text-[9px] font-bold text-white font-mono">$67,842</p>
              </div>
              <p className="text-[7px] font-semibold text-green-400">+5.23%</p>
            </motion.div>
          </div>
        </div>
      );

    case "savings":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[240px]">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-xl p-4 border border-white/10 bg-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-white/40">Savings APY</p>
                <p className="text-2xl font-bold" style={{ color: accent }}>6.00%</p>
              </div>
            </motion.div>
          </div>
        </div>
      );

    case "ai":
      return (
        <div className={baseClasses}>
          <div className="w-full max-w-[240px] space-y-2">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accentDim }}>
                <Bot className="w-3 h-3" style={{ color: accent }} />
              </div>
              <div className="p-2 rounded-lg bg-white/[0.06] border border-white/10 max-w-[180px]">
                <p className="text-[8px] text-white/70 leading-relaxed">Exo Intelligence is ready. Ask about markets, budgets, or strategy.</p>
              </div>
            </motion.div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
