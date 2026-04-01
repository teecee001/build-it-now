import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, TrendingUp, CreditCard, PiggyBank, Globe,
  ArrowUpRight, ArrowDownLeft, BarChart3, Send, QrCode,
  Bell, Shield, Eye, Plus, Repeat, DollarSign,
  Gift, Percent, Landmark, Bot, RefreshCw,
  Snowflake, Wifi, Star, ChevronRight,
  Search, Briefcase, Coins, Gem,
  ArrowRightLeft, Calendar, ArrowRight,
  Users, ShoppingBag, Utensils, Fuel,
  CheckCircle2, ShieldCheck, Loader2,
  LineChart as LineChartIcon, PieChart,
  Smartphone, Monitor
} from "lucide-react";

/* ─── Screen definitions ─── */
const SCREENS = [
  { id: "dashboard", label: "Dashboard", icon: Wallet, color: "hsl(142 71% 45%)" },
  { id: "markets", label: "Markets", icon: TrendingUp, color: "hsl(217 91% 60%)" },
  { id: "cards", label: "Cards", icon: CreditCard, color: "hsl(280 73% 58%)" },
  { id: "savings", label: "Savings", icon: PiggyBank, color: "hsl(38 92% 50%)" },
  { id: "send", label: "Send", icon: Send, color: "hsl(190 90% 50%)" },
  { id: "analytics", label: "Analytics", icon: BarChart3, color: "hsl(280 70% 55%)" },
  { id: "wallet", label: "Crypto", icon: Coins, color: "hsl(38 80% 50%)" },
];

const DURATION = 4500;

/* ─── Shared animated entry wrapper ─── */
function Stagger({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 1 — Dashboard
   ═══════════════════════════════════════════ */
function DashboardScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-white/40">Welcome back,</p>
            <p className="text-[13px] font-bold text-white tracking-tight">Alex Johnson</p>
            <p className="text-[8px] text-white/30 font-mono">@alexjohnson</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded bg-white/8 text-[7px] font-semibold text-white/50">USD $</div>
            <div className="w-5 h-5 rounded-md bg-white/8 flex items-center justify-center">
              <Eye className="w-2.5 h-2.5 text-white/40" />
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="rounded-xl p-3.5 border border-white/8 bg-white/[0.04] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[9px] text-white/50">Total Balance</p>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15">
                <div className="w-1 h-1 rounded-full bg-green-400" />
                <span className="text-[7px] font-semibold text-green-400">Live</span>
              </div>
            </div>
            <motion.p
              className="text-[22px] font-bold text-white tracking-tight font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              $24,856.32
            </motion.p>

            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <div className="p-2 rounded-lg bg-white/[0.05]">
                <p className="text-[7px] text-white/40">USD Wallet</p>
                <p className="text-[10px] font-semibold text-white font-mono">$12,406.32</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.05]">
                <div className="flex items-center gap-1">
                  <p className="text-[7px] text-white/40">Savings</p>
                  <span className="text-[6px] px-1 py-0 rounded bg-green-500/15 text-green-400 font-semibold">6% APY</span>
                </div>
                <p className="text-[10px] font-semibold text-white font-mono">$12,450.00</p>
              </div>
            </div>

            <div className="mt-2 p-2 rounded-lg bg-green-500/[0.06] border border-green-500/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PiggyBank className="w-3 h-3 text-green-400" />
                <span className="text-[8px] text-green-400">Monthly earnings</span>
              </div>
              <span className="text-[8px] font-mono font-semibold text-green-400">+$62.25/mo</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-3">
              {[
                { icon: ArrowDownLeft, label: "Deposit", filled: true },
                { icon: ArrowUpRight, label: "Send" },
                { icon: DollarSign, label: "Request" },
                { icon: Repeat, label: "Convert" },
              ].map((a, i) => (
                <motion.div
                  key={a.label}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-center ${
                    a.filled ? "bg-white/90" : "border border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <a.icon className={`w-3 h-3 ${a.filled ? "text-[hsl(240,10%,8%)]" : "text-white/60"}`} />
                  <span className={`text-[7px] font-medium ${a.filled ? "text-[hsl(240,10%,8%)]" : "text-white/50"}`}>{a.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.25}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Recent Activity</p>
          <span className="text-[8px] text-white/30">View All →</span>
        </div>
        {[
          { icon: Gift, label: "Welcome Bonus", desc: "2 minutes ago", amount: "+$25.00", positive: true, bg: "bg-green-500/10" },
          { icon: ArrowDownLeft, label: "Deposit", desc: "1 hour ago", amount: "+$4,200.00", positive: true, bg: "bg-green-500/10" },
          { icon: ArrowUpRight, label: "Sent to @sarah", desc: "3 hours ago", amount: "-$500.00", positive: false, bg: "bg-white/5" },
          { icon: CreditCard, label: "Netflix", desc: "Yesterday", amount: "-$15.99", positive: false, bg: "bg-white/5" },
        ].map((tx, i) => (
          <motion.div
            key={tx.label}
            initial={{ x: -15, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.08 }}
            className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${tx.bg}`}>
              <tx.icon className={`w-3 h-3 ${tx.positive ? "text-green-400" : "text-white/50"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-white">{tx.label}</p>
              <p className="text-[8px] text-white/30">{tx.desc}</p>
            </div>
            <span className={`text-[10px] font-semibold font-mono ${tx.positive ? "text-green-400" : "text-white/60"}`}>
              {tx.amount}
            </span>
          </motion.div>
        ))}
      </Stagger>

      <Stagger delay={0.5}>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: CreditCard, label: "Debit Card", desc: "Visa", color: "text-green-400" },
            { icon: QrCode, label: "QR Pay", desc: "Scan & pay", color: "text-green-400" },
            { icon: Globe, label: "Multi-Currency", desc: "Hold & convert", color: "text-green-400" },
            { icon: RefreshCw, label: "Recurring", desc: "Auto payments", color: "text-amber-400" },
            { icon: BarChart3, label: "Analytics", desc: "Spending", color: "text-amber-400" },
            { icon: Bot, label: "AI Advisor", desc: "Smart insights", color: "text-green-400" },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55 + i * 0.04 }}
              className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03]"
            >
              <f.icon className={`w-3.5 h-3.5 ${f.color} mb-1`} />
              <p className="text-[8px] font-semibold text-white">{f.label}</p>
              <p className="text-[7px] text-white/30">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </Stagger>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 2 — Markets
   ═══════════════════════════════════════════ */
function MarketsScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <p className="text-[13px] font-bold text-white tracking-tight">Markets</p>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15">
            <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[7px] font-semibold text-green-400">Live</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.08}>
        <div className="flex gap-1">
          {[
            { icon: Coins, label: "Crypto", active: true },
            { icon: Briefcase, label: "Stocks" },
            { icon: Globe, label: "Forex" },
            { icon: Gem, label: "Comm." },
          ].map((tab) => (
            <div
              key={tab.label}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium ${
                tab.active ? "bg-white/10 text-white" : "text-white/30"
              }`}
            >
              <tab.icon className="w-2.5 h-2.5" />
              {tab.label}
            </div>
          ))}
        </div>
      </Stagger>

      <Stagger delay={0.12}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <div className="w-full h-7 rounded-lg bg-white/[0.06] border border-white/8 pl-7 flex items-center">
            <span className="text-[9px] text-white/25">Search assets...</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.18}>
        <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-[7px] font-bold text-amber-400">BT</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-white">Bitcoin</span>
                <span className="text-[8px] text-white/30 ml-1">BTC</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white font-mono">$67,842.50</p>
              <span className="text-[8px] text-green-400 font-medium">+5.23%</span>
            </div>
          </div>
          <svg viewBox="0 0 220 55" className="w-full h-11">
            <motion.path
              d="M0,42 C15,40 25,38 40,32 C55,26 65,30 85,24 C105,18 120,22 140,16 C160,10 175,14 195,8 C205,5 215,3 220,2"
              fill="none"
              stroke="hsl(142 71% 45%)"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.8, delay: 0.3 }}
            />
            <motion.path
              d="M0,42 C15,40 25,38 40,32 C55,26 65,30 85,24 C105,18 120,22 140,16 C160,10 175,14 195,8 C205,5 215,3 220,2 L220,55 L0,55 Z"
              fill="url(#mktGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 0.8, delay: 1 }}
            />
            <defs>
              <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142 71% 45%)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex gap-1 mt-2">
            {["24H", "7D", "30D", "90D", "1Y"].map((p, i) => (
              <div key={p} className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${i === 2 ? "bg-white/10 text-white" : "text-white/30"}`}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.3}>
        {[
          { code: "ETH", name: "Ethereum", price: "$3,456.78", change: "+3.12%", pos: true },
          { code: "SOL", name: "Solana", price: "$142.67", change: "+8.43%", pos: true },
          { code: "BNB", name: "BNB", price: "$612.34", change: "-1.25%", pos: false },
          { code: "XRP", name: "Ripple", price: "$0.6234", change: "+2.18%", pos: true },
          { code: "ADA", name: "Cardano", price: "$0.4521", change: "-0.87%", pos: false },
        ].map((asset, i) => (
          <motion.div
            key={asset.code}
            initial={{ x: 15, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.07 }}
            className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
          >
            <div className="flex items-center gap-2">
              <Star className="w-2.5 h-2.5 text-amber-400/40" />
              <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center">
                <span className="text-[7px] font-bold text-white/60">{asset.code.slice(0, 2)}</span>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-white">{asset.name}</p>
                <p className="text-[7px] text-white/30">{asset.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 30 12" className="w-7 h-3">
                <path
                  d={`M0,${asset.pos ? 10 : 2} Q7,${asset.pos ? 6 : 8} 15,${asset.pos ? 4 : 6} T30,${asset.pos ? 2 : 10}`}
                  fill="none"
                  stroke={asset.pos ? "#22c55e" : "#ef4444"}
                  strokeWidth="1"
                />
              </svg>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-white font-mono">{asset.price}</p>
                <p className={`text-[7px] font-medium ${asset.pos ? "text-green-400" : "text-red-400"}`}>{asset.change}</p>
              </div>
              <ChevronRight className="w-2.5 h-2.5 text-white/15" />
            </div>
          </motion.div>
        ))}
      </Stagger>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 3 — Cards
   ═══════════════════════════════════════════ */
function CardsScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <p className="text-[13px] font-bold text-white tracking-tight">My Cards</p>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/8">
            <Plus className="w-2.5 h-2.5 text-white/50" />
            <span className="text-[8px] text-white/50 font-medium">Add Card</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.12}>
        <motion.div
          initial={{ rotateY: 60, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="rounded-2xl p-4 aspect-[1.586/1] flex flex-col justify-between relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(220 50% 15%), hsl(230 60% 8%))",
            border: "1px solid hsl(220 40% 25%)",
          }}
        >
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 70% 30%, hsl(210 90% 50% / 0.4), transparent 60%)"
          }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold opacity-[0.05] select-none tracking-tighter text-white">Ξ╳</span>
          </div>

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                <span className="text-[6px] font-bold text-white/80 tracking-tighter">Ξ╳</span>
              </div>
              <span className="text-[9px] font-bold tracking-wider text-white/80">Ξ╳OSKY</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-white/50">METAL</span>
            </div>
          </div>

          <div className="relative">
            <div className="w-7 h-5 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40 border border-yellow-700/30" />
          </div>

          <div className="relative space-y-1.5">
            <p className="text-[13px] font-mono tracking-[0.15em] text-white/90">•••• •••• •••• 4829</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[7px] text-white/40">Midnight Blue</p>
              </div>
              <p className="text-[9px] font-mono text-white/80">12/28</p>
              <span className="text-[10px] font-bold italic tracking-tighter text-white/60">VISA</span>
            </div>
          </div>
        </motion.div>
      </Stagger>

      <Stagger delay={0.35}>
        <div className="rounded-xl p-3 flex items-center justify-between border border-white/8 bg-white/[0.03]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-7 rounded-lg relative overflow-hidden" style={{
              background: "linear-gradient(135deg, hsl(160 30% 12%), hsl(150 40% 6%))",
              border: "1px solid hsl(150 30% 20%)"
            }}>
              <Wifi className="w-3 h-3 text-white/20 rotate-90 absolute bottom-0.5 right-0.5" />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-white">Virtual Card</p>
              <p className="text-[7px] text-white/30 font-mono">•••• 7612</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10">
            <span className="text-[7px] text-blue-400 font-semibold">VIRTUAL</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.45}>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: Snowflake, label: "Freeze", color: "text-blue-400" },
            { icon: Shield, label: "Limits", color: "text-white/60" },
            { icon: Eye, label: "Details", color: "text-white/60" },
            { icon: Star, label: "Rewards", color: "text-amber-400" },
          ].map((ctrl, i) => (
            <motion.div
              key={ctrl.label}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]"
            >
              <ctrl.icon className={`w-3 h-3 ${ctrl.color}`} />
              <span className="text-[7px] text-white/40 font-medium">{ctrl.label}</span>
            </motion.div>
          ))}
        </div>
      </Stagger>

      <Stagger delay={0.6}>
        <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-1">This Month's Spending</p>
        {[
          { category: "Shopping", amount: "$345.20", pct: 45, color: "hsl(280 70% 55%)" },
          { category: "Food & Dining", amount: "$189.50", pct: 28, color: "hsl(38 92% 50%)" },
          { category: "Transport", amount: "$67.00", pct: 10, color: "hsl(200 70% 50%)" },
          { category: "Subscriptions", amount: "$42.97", pct: 7, color: "hsl(142 71% 45%)" },
        ].map((cat, i) => (
          <motion.div
            key={cat.category}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 + i * 0.08 }}
            className="mb-2"
          >
            <div className="flex justify-between text-[8px] mb-0.5">
              <span className="text-white/60">{cat.category}</span>
              <span className="text-white/80 font-medium font-mono">{cat.amount}</span>
            </div>
            <div className="h-1 rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full"
                style={{ background: cat.color }}
                initial={{ width: 0 }}
                animate={{ width: `${cat.pct}%` }}
                transition={{ delay: 0.8 + i * 0.08, duration: 0.6 }}
              />
            </div>
          </motion.div>
        ))}
      </Stagger>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 4 — Savings
   ═══════════════════════════════════════════ */
function SavingsScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center gap-2 mb-0.5">
          <PiggyBank className="w-4 h-4 text-green-400" />
          <p className="text-[13px] font-bold text-white tracking-tight">Savings</p>
          <div className="px-1.5 py-0.5 rounded bg-green-500/15 text-[8px] font-semibold text-green-400">6% APY</div>
        </div>
        <p className="text-[9px] text-white/40">Grow your money with industry-leading yields</p>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="rounded-xl p-4 border border-white/8 bg-white/[0.04] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-[9px] text-white/50 mb-0.5">Savings Balance</p>
            <motion.p
              className="text-[22px] font-bold text-white tracking-tight font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              $12,450.00
            </motion.p>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Daily", value: "+$2.05", icon: Calendar },
                { label: "Monthly", value: "+$62.25", icon: TrendingUp },
                { label: "Yearly", value: "+$747.00", icon: Percent },
              ].map((e, i) => (
                <motion.div
                  key={e.label}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="p-2 rounded-lg bg-green-500/[0.06] text-center"
                >
                  <e.icon className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
                  <p className="text-[7px] text-white/40">{e.label}</p>
                  <p className="text-[9px] font-bold text-green-400 font-mono">{e.value}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.3}>
        <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-white/50 font-medium">12-Month Projection</p>
            <LineChartIcon className="w-3 h-3 text-white/20" />
          </div>
          <svg viewBox="0 0 220 50" className="w-full h-10">
            <motion.path
              d="M0,45 C25,43 50,40 75,36 C100,32 120,27 145,21 C170,15 190,10 210,6 L220,4"
              fill="none"
              stroke="hsl(38 92% 50%)"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.4 }}
            />
            <motion.path
              d="M0,45 C25,43 50,40 75,36 C100,32 120,27 145,21 C170,15 190,10 210,6 L220,4 L220,50 L0,50 Z"
              fill="url(#savGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ delay: 1, duration: 0.6 }}
            />
            <defs>
              <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(38 92% 50%)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex justify-between mt-2">
            <div>
              <p className="text-[7px] text-white/30">Now</p>
              <p className="text-[9px] font-bold text-white font-mono">$12,450</p>
            </div>
            <div className="text-right">
              <p className="text-[7px] text-white/30">In 12 months</p>
              <p className="text-[9px] font-bold text-amber-400 font-mono">$13,197</p>
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.5}>
        <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-3 h-3 text-white/40" />
            <p className="text-[9px] text-white/50 font-medium">Quick Transfer</p>
          </div>
          <div className="flex gap-1.5 mb-2">
            <div className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/8 flex items-center px-2">
              <DollarSign className="w-2.5 h-2.5 text-white/30 mr-1" />
              <span className="text-[9px] text-white/25">Amount</span>
            </div>
            <div className="px-3 h-7 rounded-lg bg-green-500/20 flex items-center">
              <span className="text-[8px] font-semibold text-green-400">Save</span>
            </div>
          </div>
          <div className="flex gap-1">
            {["$10", "$25", "$50", "$100"].map((amt) => (
              <div key={amt} className="flex-1 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-center">
                <span className="text-[8px] text-white/50 font-medium">{amt}</span>
              </div>
            ))}
          </div>
        </div>
      </Stagger>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 5 — Send Money
   ═══════════════════════════════════════════ */
function SendScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-400" />
          <p className="text-[13px] font-bold text-white tracking-tight">Send Money</p>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="rounded-xl bg-white/[0.04] border border-white/8 p-4 text-center">
          <p className="text-[9px] text-white/40 mb-1">You're sending</p>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <p className="text-[28px] font-black text-white font-mono tracking-tight">$500.00</p>
          </motion.div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Globe className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-[9px] text-cyan-400 font-medium">≈ €462.35 EUR</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.25}>
        <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Recipient</p>
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/8 p-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-cyan-400">SM</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-white">Sarah Mitchell</p>
            <p className="text-[8px] text-white/30">@sarahm · Berlin, Germany</p>
          </div>
          <ChevronRight className="w-3 h-3 text-white/20" />
        </div>
      </Stagger>

      <Stagger delay={0.35}>
        <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-1">Quick Send</p>
        <div className="flex gap-3">
          {[
            { initials: "SM", name: "Sarah", color: "bg-cyan-500/20 text-cyan-400" },
            { initials: "JD", name: "James", color: "bg-blue-500/20 text-blue-400" },
            { initials: "AR", name: "Aisha", color: "bg-purple-500/20 text-purple-400" },
            { initials: "MK", name: "Mike", color: "bg-amber-500/20 text-amber-400" },
          ].map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="flex flex-col items-center gap-1"
            >
              <div className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center`}>
                <span className="text-[9px] font-bold">{c.initials}</span>
              </div>
              <span className="text-[7px] text-white/40">{c.name}</span>
            </motion.div>
          ))}
        </div>
      </Stagger>

      <Stagger delay={0.5}>
        <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3 space-y-1.5">
          {[
            { label: "Transfer fee", value: "$0.00", highlight: true },
            { label: "Exchange rate", value: "1 USD = 0.9247 EUR" },
            { label: "Arrives in", value: "< 30 seconds", highlight: true },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[8px]">
              <span className="text-white/40">{row.label}</span>
              <span className={row.highlight ? "text-green-400 font-medium" : "text-white/60"}>{row.value}</span>
            </div>
          ))}
        </div>
      </Stagger>

      <Stagger delay={0.6}>
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl py-3 text-center font-bold text-[11px] text-white flex items-center justify-center gap-1.5"
          style={{ background: "linear-gradient(135deg, hsl(190 90% 40%), hsl(200 85% 50%))" }}
        >
          <ShieldCheck className="w-3 h-3" />
          Send $500.00
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      </Stagger>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 6 — Analytics
   ═══════════════════════════════════════════ */
function AnalyticsScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <p className="text-[13px] font-bold text-white tracking-tight">Spending Analytics</p>
        </div>
      </Stagger>

      <Stagger delay={0.08}>
        <div className="flex gap-1">
          {["7D", "30D", "All"].map((t, i) => (
            <div key={t} className={`px-2.5 py-1 rounded-lg text-[8px] font-medium ${i === 1 ? "bg-white/10 text-white" : "text-white/30"}`}>
              {t}
            </div>
          ))}
        </div>
      </Stagger>

      <Stagger delay={0.15}>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-green-500/[0.06] border border-green-500/10">
            <div className="flex items-center gap-1 mb-1">
              <ArrowDownLeft className="w-3 h-3 text-green-400" />
              <span className="text-[8px] text-green-400 font-medium">Income</span>
            </div>
            <p className="text-[14px] font-bold text-green-400 font-mono">$4,225.00</p>
          </div>
          <div className="p-3 rounded-xl bg-red-500/[0.06] border border-red-500/10">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight className="w-3 h-3 text-red-400" />
              <span className="text-[8px] text-red-400 font-medium">Spending</span>
            </div>
            <p className="text-[14px] font-bold text-red-400 font-mono">$644.67</p>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.25}>
        <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3 flex items-center gap-4">
          <svg viewBox="0 0 60 60" className="w-16 h-16 flex-shrink-0">
            <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(280 70% 55%)" strokeWidth="8"
              strokeDasharray="62.8 94.2" strokeDashoffset="0" transform="rotate(-90 30 30)"
              initial={{ strokeDashoffset: 157 }} animate={{ strokeDashoffset: 0 }}
              transition={{ delay: 0.4, duration: 1 }} />
            <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(38 92% 50%)" strokeWidth="8"
              strokeDasharray="43.9 113.1" strokeDashoffset="-62.8" transform="rotate(-90 30 30)"
              initial={{ strokeDashoffset: 94.2 }} animate={{ strokeDashoffset: -62.8 }}
              transition={{ delay: 0.6, duration: 0.8 }} />
            <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(200 70% 50%)" strokeWidth="8"
              strokeDasharray="15.7 141.3" strokeDashoffset="-106.7" transform="rotate(-90 30 30)"
              initial={{ strokeDashoffset: 50.3 }} animate={{ strokeDashoffset: -106.7 }}
              transition={{ delay: 0.8, duration: 0.6 }} />
            <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="8"
              strokeDasharray="12.6 144.4" strokeDashoffset="-122.4" transform="rotate(-90 30 30)"
              initial={{ strokeDashoffset: 34.6 }} animate={{ strokeDashoffset: -122.4 }}
              transition={{ delay: 1, duration: 0.5 }} />
          </svg>
          <div className="space-y-1.5 flex-1">
            {[
              { label: "Transfers", pct: "40%", color: "bg-purple-500" },
              { label: "Bills", pct: "28%", color: "bg-amber-500" },
              { label: "Withdrawals", pct: "10%", color: "bg-blue-500" },
              { label: "Shopping", pct: "8%", color: "bg-green-500" },
            ].map((cat) => (
              <div key={cat.label} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cat.color}`} />
                <span className="text-[8px] text-white/60 flex-1">{cat.label}</span>
                <span className="text-[8px] text-white/80 font-medium">{cat.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.45}>
        <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-1">Weekly Spending</p>
        <div className="flex items-end justify-between gap-1 h-16 px-1">
          {[
            { day: "Mon", h: 55 },
            { day: "Tue", h: 35 },
            { day: "Wed", h: 75 },
            { day: "Thu", h: 40 },
            { day: "Fri", h: 90 },
            { day: "Sat", h: 60 },
            { day: "Sun", h: 25 },
          ].map((bar, i) => (
            <div key={bar.day} className="flex-1 flex flex-col items-center gap-0.5">
              <motion.div
                className="w-full rounded-t"
                style={{ background: i === 4 ? "hsl(280 70% 55%)" : "hsl(280 70% 55% / 0.3)" }}
                initial={{ height: 0 }}
                animate={{ height: `${bar.h}%` }}
                transition={{ delay: 0.55 + i * 0.06, duration: 0.5 }}
              />
              <span className="text-[6px] text-white/30">{bar.day}</span>
            </div>
          ))}
        </div>
      </Stagger>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN 7 — Crypto Wallet
   ═══════════════════════════════════════════ */
function CryptoWalletScreen() {
  return (
    <div className="p-3.5 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <p className="text-[13px] font-bold text-white tracking-tight">Crypto Wallet</p>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15">
            <div className="w-1 h-1 rounded-full bg-green-400" />
            <span className="text-[7px] font-semibold text-green-400">Live</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="rounded-xl p-3.5 border border-white/8 bg-white/[0.04] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-green-500/5 pointer-events-none" />
          <div className="relative">
            <p className="text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Portfolio Value</p>
            <motion.p
              className="text-[20px] font-bold text-white font-mono tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              $8,234.56
            </motion.p>
            <p className="text-[8px] text-white/30 font-mono">USD Balance: $12,406.32</p>

            <div className="grid grid-cols-4 gap-1.5 mt-3">
              {[
                { icon: ArrowDownLeft, label: "Buy", color: "bg-green-500/10 text-green-400" },
                { icon: ArrowUpRight, label: "Sell", color: "bg-red-500/10 text-red-400" },
                { icon: ArrowRightLeft, label: "Swap", color: "bg-green-500/10 text-green-400" },
                { icon: Send, label: "Send", color: "bg-amber-500/10 text-amber-400" },
              ].map((a, i) => (
                <motion.div
                  key={a.label}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl ${a.color}`}
                >
                  <a.icon className="w-3.5 h-3.5" />
                  <span className="text-[7px] font-semibold uppercase tracking-wider">{a.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.3}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Holdings</p>
          <PieChart className="w-3 h-3 text-white/20" />
        </div>
        {[
          { code: "BTC", name: "Bitcoin", amount: "0.084521", value: "$5,734.12", pct: "69.6%", change: "+5.2%" },
          { code: "ETH", name: "Ethereum", amount: "0.543200", value: "$1,878.32", pct: "22.8%", change: "+3.1%" },
          { code: "SOL", name: "Solana", amount: "4.350000", value: "$620.62", pct: "7.5%", change: "+8.4%" },
        ].map((h, i) => (
          <motion.div
            key={h.code}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white/60">{h.code.slice(0, 2)}</span>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-white">{h.name}</p>
                <p className="text-[7px] text-white/30 font-mono">{h.amount} {h.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 28 10" className="w-6 h-2.5">
                <path d="M0,8 Q7,4 14,3 T28,1" fill="none" stroke="#22c55e" strokeWidth="1" />
              </svg>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-white font-mono">{h.value}</p>
                <p className="text-[7px] text-white/30">{h.pct}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </Stagger>
    </div>
  );
}

/* ─── Screen component map ─── */
const SCREEN_COMPONENTS: Record<string, React.FC> = {
  dashboard: DashboardScreen,
  markets: MarketsScreen,
  cards: CardsScreen,
  savings: SavingsScreen,
  send: SendScreen,
  analytics: AnalyticsScreen,
  wallet: CryptoWalletScreen,
};

/* ═══════════════════════════════════════════
   DESKTOP SCREEN COMPONENTS
   ═══════════════════════════════════════════ */

function DesktopDashboardScreen() {
  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40">Welcome back,</p>
            <p className="text-[14px] font-bold text-white tracking-tight">Alex Johnson</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded bg-white/8 text-[8px] font-semibold text-white/50">USD $</div>
            <div className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center">
              <Bell className="w-3 h-3 text-white/40" />
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.08}>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 border border-white/8 bg-white/[0.04] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent pointer-events-none" />
            <p className="text-[8px] text-white/40 relative">Total Balance</p>
            <motion.p className="text-[16px] font-bold text-white font-mono relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>$24,856.32</motion.p>
            <div className="flex items-center gap-1 mt-1 relative">
              <div className="w-1 h-1 rounded-full bg-green-400" />
              <span className="text-[7px] text-green-400 font-medium">+2.4% today</span>
            </div>
          </div>
          <div className="rounded-xl p-3 border border-white/8 bg-white/[0.04]">
            <p className="text-[8px] text-white/40">USD Wallet</p>
            <p className="text-[16px] font-bold text-white font-mono">$12,406.32</p>
            <p className="text-[7px] text-white/30 mt-1">Available</p>
          </div>
          <div className="rounded-xl p-3 border border-white/8 bg-white/[0.04] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-1 relative">
              <p className="text-[8px] text-white/40">Savings</p>
              <span className="text-[6px] px-1 rounded bg-green-500/15 text-green-400 font-semibold">6% APY</span>
            </div>
            <p className="text-[16px] font-bold text-white font-mono relative">$12,450.00</p>
            <p className="text-[7px] text-green-400 font-mono mt-1 relative">+$62.25/mo</p>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.18}>
        <div className="grid grid-cols-2 gap-2">
          {/* Quick actions */}
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
            <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">Quick Actions</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { icon: ArrowDownLeft, label: "Deposit", filled: true },
                { icon: ArrowUpRight, label: "Send" },
                { icon: DollarSign, label: "Request" },
                { icon: Repeat, label: "Convert" },
              ].map((a, i) => (
                <motion.div key={a.label} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.05 }}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg ${a.filled ? "bg-white/90" : "border border-white/10 bg-white/[0.03]"}`}>
                  <a.icon className={`w-3 h-3 ${a.filled ? "text-[hsl(240,10%,8%)]" : "text-white/60"}`} />
                  <span className={`text-[7px] font-medium ${a.filled ? "text-[hsl(240,10%,8%)]" : "text-white/50"}`}>{a.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
          {/* Recent activity */}
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Recent Activity</p>
              <span className="text-[7px] text-white/30">View All →</span>
            </div>
            {[
              { icon: Gift, label: "Welcome Bonus", amount: "+$25.00", positive: true },
              { icon: ArrowDownLeft, label: "Deposit", amount: "+$4,200.00", positive: true },
              { icon: ArrowUpRight, label: "Sent to @sarah", amount: "-$500.00", positive: false },
            ].map((tx, i) => (
              <motion.div key={tx.label} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${tx.positive ? "bg-green-500/10" : "bg-white/5"}`}>
                  <tx.icon className={`w-2.5 h-2.5 ${tx.positive ? "text-green-400" : "text-white/50"}`} />
                </div>
                <p className="text-[9px] font-medium text-white flex-1">{tx.label}</p>
                <span className={`text-[9px] font-semibold font-mono ${tx.positive ? "text-green-400" : "text-white/60"}`}>{tx.amount}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.35}>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: CreditCard, label: "Debit Card", desc: "Visa", color: "text-green-400" },
            { icon: QrCode, label: "QR Pay", desc: "Scan & pay", color: "text-green-400" },
            { icon: Globe, label: "Multi-Currency", desc: "Hold & convert", color: "text-green-400" },
            { icon: Bot, label: "AI Advisor", desc: "Smart insights", color: "text-green-400" },
          ].map((f, i) => (
            <motion.div key={f.label} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.04 }}
              className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.03]">
              <f.icon className={`w-3.5 h-3.5 ${f.color} mb-1`} />
              <p className="text-[8px] font-semibold text-white">{f.label}</p>
              <p className="text-[7px] text-white/30">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </Stagger>
    </div>
  );
}

function DesktopMarketsScreen() {
  const assets = [
    { code: "ETH", name: "Ethereum", price: "$3,456.78", change: "+3.12%", pos: true, vol: "$18.2B" },
    { code: "SOL", name: "Solana", price: "$142.67", change: "+8.43%", pos: true, vol: "$4.1B" },
    { code: "BNB", name: "BNB", price: "$612.34", change: "-1.25%", pos: false, vol: "$2.8B" },
    { code: "XRP", name: "Ripple", price: "$0.6234", change: "+2.18%", pos: true, vol: "$1.9B" },
    { code: "ADA", name: "Cardano", price: "$0.4521", change: "-0.87%", pos: false, vol: "$0.8B" },
  ];

  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <p className="text-[14px] font-bold text-white tracking-tight">Markets</p>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15">
              <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[7px] font-semibold text-green-400">Live</span>
            </div>
          </div>
          <div className="flex gap-1">
            {[
              { icon: Coins, label: "Crypto", active: true },
              { icon: Briefcase, label: "Stocks" },
              { icon: Globe, label: "Forex" },
            ].map((tab) => (
              <div key={tab.label} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium ${tab.active ? "bg-white/10 text-white" : "text-white/30"}`}>
                <tab.icon className="w-2.5 h-2.5" />{tab.label}
              </div>
            ))}
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="grid grid-cols-5 gap-2" style={{ gridTemplateColumns: "3fr 2fr" }}>
          {/* Bitcoin chart — left ~60% */}
          <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3 col-span-1" style={{ gridColumn: "1" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-amber-400">BT</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white">Bitcoin</span>
                  <span className="text-[8px] text-white/30 ml-1">BTC</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-white font-mono">$67,842.50</p>
                <span className="text-[8px] text-green-400 font-medium">+5.23%</span>
              </div>
            </div>
            <svg viewBox="0 0 300 60" className="w-full h-14">
              <motion.path
                d="M0,50 C10,48 20,46 35,42 C50,38 60,40 80,35 C100,30 115,32 135,26 C155,20 170,24 190,18 C210,12 225,16 245,10 C260,6 275,8 290,4 L300,2"
                fill="none" stroke="hsl(142 71% 45%)" strokeWidth="1.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.2 }}
              />
              <motion.path
                d="M0,50 C10,48 20,46 35,42 C50,38 60,40 80,35 C100,30 115,32 135,26 C155,20 170,24 190,18 C210,12 225,16 245,10 C260,6 275,8 290,4 L300,2 L300,60 L0,60 Z"
                fill="url(#dMktGrad)" initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 0.8, delay: 0.8 }}
              />
              <defs>
                <linearGradient id="dMktGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 71% 45%)" /><stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex gap-1 mt-2">
              {["24H", "7D", "30D", "90D", "1Y", "ALL"].map((p, i) => (
                <div key={p} className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${i === 2 ? "bg-white/10 text-white" : "text-white/30"}`}>{p}</div>
              ))}
            </div>
          </div>
          {/* Top movers — right ~40% */}
          <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3" style={{ gridColumn: "2" }}>
            <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">Top Movers</p>
            {assets.slice(0, 4).map((a, i) => (
              <motion.div key={a.code} initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.06 }}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white/60">{a.code.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-white">{a.name}</p>
                    <p className="text-[7px] text-white/30">{a.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-semibold text-white font-mono">{a.price}</p>
                  <p className={`text-[7px] font-medium ${a.pos ? "text-green-400" : "text-red-400"}`}>{a.change}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.35}>
        {/* Data table */}
        <div className="rounded-xl bg-white/[0.04] border border-white/8 overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-3 py-1.5 border-b border-white/[0.06] text-[7px] text-white/30 uppercase tracking-wider font-semibold">
            <span>Asset</span><span>Price</span><span>24h Change</span><span>Volume</span><span>Chart</span>
          </div>
          {assets.map((a, i) => (
            <motion.div key={a.code} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
              className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-white/[0.03] last:border-0 items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center">
                  <span className="text-[6px] font-bold text-white/60">{a.code.slice(0, 2)}</span>
                </div>
                <span className="text-[9px] font-semibold text-white">{a.name}</span>
              </div>
              <span className="text-[9px] text-white font-mono">{a.price}</span>
              <span className={`text-[9px] font-medium ${a.pos ? "text-green-400" : "text-red-400"}`}>{a.change}</span>
              <span className="text-[9px] text-white/50 font-mono">{a.vol}</span>
              <svg viewBox="0 0 40 14" className="w-8 h-3">
                <path d={`M0,${a.pos ? 12 : 2} Q10,${a.pos ? 6 : 8} 20,${a.pos ? 4 : 7} T40,${a.pos ? 2 : 12}`}
                  fill="none" stroke={a.pos ? "#22c55e" : "#ef4444"} strokeWidth="1" />
              </svg>
            </motion.div>
          ))}
        </div>
      </Stagger>
    </div>
  );
}

function DesktopCardsScreen() {
  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <p className="text-[14px] font-bold text-white tracking-tight">My Cards</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/8 cursor-pointer">
            <Plus className="w-2.5 h-2.5 text-white/50" />
            <span className="text-[8px] text-white/50 font-medium">Add Card</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "2fr 3fr" }}>
          {/* Card visual — left */}
          <div className="space-y-2">
            <motion.div initial={{ rotateY: 40, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.7 }}
              className="rounded-2xl p-3.5 aspect-[1.586/1] flex flex-col justify-between relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(220 50% 15%), hsl(230 60% 8%))", border: "1px solid hsl(220 40% 25%)" }}>
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, hsl(210 90% 50% / 0.4), transparent 60%)" }} />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                    <span className="text-[5px] font-bold text-white/80">Ξ╳</span>
                  </div>
                  <span className="text-[8px] font-bold tracking-wider text-white/80">Ξ╳OSKY</span>
                </div>
                <span className="text-[7px] text-white/50">METAL</span>
              </div>
              <div className="relative"><div className="w-6 h-4 rounded bg-gradient-to-br from-yellow-600/60 to-yellow-800/40 border border-yellow-700/30" /></div>
              <div className="relative space-y-1">
                <p className="text-[11px] font-mono tracking-[0.15em] text-white/90">•••• •••• •••• 4829</p>
                <div className="flex items-end justify-between">
                  <p className="text-[7px] text-white/40">Midnight Blue</p>
                  <p className="text-[8px] font-mono text-white/80">12/28</p>
                  <span className="text-[9px] font-bold italic tracking-tighter text-white/60">VISA</span>
                </div>
              </div>
            </motion.div>
            {/* Virtual card */}
            <div className="rounded-xl p-2.5 flex items-center gap-2 border border-white/8 bg-white/[0.03]">
              <div className="w-8 h-6 rounded-lg relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(160 30% 12%), hsl(150 40% 6%))", border: "1px solid hsl(150 30% 20%)" }}>
                <Wifi className="w-2.5 h-2.5 text-white/20 rotate-90 absolute bottom-0.5 right-0.5" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-semibold text-white">Virtual Card</p>
                <p className="text-[7px] text-white/30 font-mono">•••• 7612</p>
              </div>
              <span className="text-[7px] text-blue-400 font-semibold px-1.5 py-0.5 rounded bg-blue-500/10">VIRTUAL</span>
            </div>
          </div>

          {/* Right panel — details & spending */}
          <div className="space-y-2">
            {/* Controls */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { icon: Snowflake, label: "Freeze", color: "text-blue-400" },
                { icon: Shield, label: "Limits", color: "text-white/60" },
                { icon: Eye, label: "Details", color: "text-white/60" },
                { icon: Star, label: "Rewards", color: "text-amber-400" },
              ].map((ctrl, i) => (
                <motion.div key={ctrl.label} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <ctrl.icon className={`w-3 h-3 ${ctrl.color}`} />
                  <span className="text-[7px] text-white/40 font-medium">{ctrl.label}</span>
                </motion.div>
              ))}
            </div>
            {/* Spending breakdown */}
            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">This Month's Spending</p>
              {[
                { category: "Shopping", amount: "$345.20", pct: 45, color: "hsl(280 70% 55%)" },
                { category: "Food & Dining", amount: "$189.50", pct: 28, color: "hsl(38 92% 50%)" },
                { category: "Transport", amount: "$67.00", pct: 10, color: "hsl(200 70% 50%)" },
                { category: "Subscriptions", amount: "$42.97", pct: 7, color: "hsl(142 71% 45%)" },
              ].map((cat, i) => (
                <motion.div key={cat.category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.06 }} className="mb-2">
                  <div className="flex justify-between text-[8px] mb-0.5">
                    <span className="text-white/60">{cat.category}</span>
                    <span className="text-white/80 font-medium font-mono">{cat.amount}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/8">
                    <motion.div className="h-full rounded-full" style={{ background: cat.color }}
                      initial={{ width: 0 }} animate={{ width: `${cat.pct}%` }} transition={{ delay: 0.5 + i * 0.06, duration: 0.6 }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Stagger>
    </div>
  );
}

function DesktopSavingsScreen() {
  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-green-400" />
          <p className="text-[14px] font-bold text-white tracking-tight">Savings</p>
          <div className="px-1.5 py-0.5 rounded bg-green-500/15 text-[8px] font-semibold text-green-400">6% APY</div>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="grid grid-cols-2 gap-3">
          {/* Left: Balance + earnings */}
          <div className="rounded-xl p-3.5 border border-white/8 bg-white/[0.04] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent pointer-events-none" />
            <div className="relative">
              <p className="text-[9px] text-white/50 mb-0.5">Savings Balance</p>
              <motion.p className="text-[20px] font-bold text-white font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>$12,450.00</motion.p>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[
                  { label: "Daily", value: "+$2.05", icon: Calendar },
                  { label: "Monthly", value: "+$62.25", icon: TrendingUp },
                  { label: "Yearly", value: "+$747.00", icon: Percent },
                ].map((e, i) => (
                  <motion.div key={e.label} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.06 }}
                    className="p-2 rounded-lg bg-green-500/[0.06] text-center">
                    <e.icon className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
                    <p className="text-[7px] text-white/40">{e.label}</p>
                    <p className="text-[9px] font-bold text-green-400 font-mono">{e.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          {/* Right: Quick transfer + recent */}
          <div className="space-y-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-3 h-3 text-white/40" />
                <p className="text-[9px] text-white/50 font-medium">Quick Transfer</p>
              </div>
              <div className="flex gap-1.5 mb-2">
                <div className="flex-1 h-7 rounded-lg bg-white/[0.06] border border-white/8 flex items-center px-2">
                  <DollarSign className="w-2.5 h-2.5 text-white/30 mr-1" /><span className="text-[9px] text-white/25">Amount</span>
                </div>
                <div className="px-3 h-7 rounded-lg bg-green-500/20 flex items-center"><span className="text-[8px] font-semibold text-green-400">Save</span></div>
              </div>
              <div className="flex gap-1">
                {["$10", "$25", "$50", "$100"].map((amt) => (
                  <div key={amt} className="flex-1 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-center">
                    <span className="text-[8px] text-white/50 font-medium">{amt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">Recent Savings</p>
              {[
                { label: "Auto-save", amount: "+$50.00", date: "Today" },
                { label: "Transfer", amount: "+$200.00", date: "Yesterday" },
                { label: "Interest", amount: "+$2.05", date: "3 days ago" },
              ].map((tx, i) => (
                <motion.div key={tx.label + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <div><p className="text-[9px] font-medium text-white">{tx.label}</p><p className="text-[7px] text-white/30">{tx.date}</p></div>
                  <span className="text-[9px] font-semibold text-green-400 font-mono">{tx.amount}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.3}>
        <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-white/50 font-medium">12-Month Projection</p>
            <LineChartIcon className="w-3 h-3 text-white/20" />
          </div>
          <svg viewBox="0 0 400 50" className="w-full h-10">
            <motion.path d="M0,45 C30,43 60,41 100,37 C140,33 170,28 210,23 C250,18 280,14 320,10 C350,7 370,5 400,3"
              fill="none" stroke="hsl(38 92% 50%)" strokeWidth="1.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.4 }} />
            <motion.path d="M0,45 C30,43 60,41 100,37 C140,33 170,28 210,23 C250,18 280,14 320,10 C350,7 370,5 400,3 L400,50 L0,50 Z"
              fill="url(#dSavGrad)" initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ delay: 1, duration: 0.6 }} />
            <defs><linearGradient id="dSavGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(38 92% 50%)" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
          </svg>
          <div className="flex justify-between mt-2">
            <div><p className="text-[7px] text-white/30">Now</p><p className="text-[9px] font-bold text-white font-mono">$12,450</p></div>
            <div><p className="text-[7px] text-white/30">6 months</p><p className="text-[9px] font-bold text-white/60 font-mono">$12,823</p></div>
            <div className="text-right"><p className="text-[7px] text-white/30">12 months</p><p className="text-[9px] font-bold text-amber-400 font-mono">$13,197</p></div>
          </div>
        </div>
      </Stagger>
    </div>
  );
}

function DesktopSendScreen() {
  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-400" />
          <p className="text-[14px] font-bold text-white tracking-tight">Send Money</p>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "2fr 3fr" }}>
          {/* Left: contacts */}
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
            <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">Contacts</p>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/30" />
              <div className="w-full h-6 rounded-lg bg-white/[0.06] border border-white/8 pl-6 flex items-center">
                <span className="text-[8px] text-white/25">Search...</span>
              </div>
            </div>
            {[
              { initials: "SM", name: "Sarah Mitchell", handle: "@sarahm", color: "bg-cyan-500/20 text-cyan-400" },
              { initials: "JD", name: "James Davis", handle: "@jamesd", color: "bg-blue-500/20 text-blue-400" },
              { initials: "AR", name: "Aisha Rahman", handle: "@aishar", color: "bg-purple-500/20 text-purple-400" },
              { initials: "MK", name: "Mike Kim", handle: "@mikekim", color: "bg-amber-500/20 text-amber-400" },
            ].map((c, i) => (
              <motion.div key={c.name} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.06 }}
                className={`flex items-center gap-2 py-2 border-b border-white/[0.04] last:border-0 ${i === 0 ? "bg-white/[0.04] -mx-1.5 px-1.5 rounded-lg" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${c.color}`}>
                  <span className="text-[8px] font-bold">{c.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold text-white">{c.name}</p>
                  <p className="text-[7px] text-white/30">{c.handle}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right: send form */}
          <div className="space-y-2">
            <div className="rounded-xl bg-white/[0.04] border border-white/8 p-4 text-center">
              <p className="text-[9px] text-white/40 mb-1">You're sending</p>
              <motion.p className="text-[26px] font-black text-white font-mono tracking-tight"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: "spring" }}>$500.00</motion.p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Globe className="w-2.5 h-2.5 text-cyan-400" />
                <span className="text-[9px] text-cyan-400 font-medium">≈ €462.35 EUR</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3 space-y-1.5">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-1">Transfer Details</p>
              {[
                { label: "Recipient", value: "Sarah Mitchell (@sarahm)" },
                { label: "Transfer fee", value: "$0.00", highlight: true },
                { label: "Exchange rate", value: "1 USD = 0.9247 EUR" },
                { label: "Arrives in", value: "< 30 seconds", highlight: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-[8px]">
                  <span className="text-white/40">{row.label}</span>
                  <span className={row.highlight ? "text-green-400 font-medium" : "text-white/60"}>{row.value}</span>
                </div>
              ))}
            </div>

            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="rounded-xl py-3 text-center font-bold text-[11px] text-white flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(135deg, hsl(190 90% 40%), hsl(200 85% 50%))" }}>
              <ShieldCheck className="w-3 h-3" />Send $500.00<ArrowRight className="w-3 h-3" />
            </motion.div>
          </div>
        </div>
      </Stagger>
    </div>
  );
}

function DesktopAnalyticsScreen() {
  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <p className="text-[14px] font-bold text-white tracking-tight">Spending Analytics</p>
          </div>
          <div className="flex gap-1">
            {["7D", "30D", "All"].map((t, i) => (
              <div key={t} className={`px-2.5 py-1 rounded-lg text-[8px] font-medium ${i === 1 ? "bg-white/10 text-white" : "text-white/30"}`}>{t}</div>
            ))}
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.08}>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: ArrowDownLeft, label: "Income", value: "$4,225.00", color: "text-green-400", bg: "bg-green-500/[0.06] border-green-500/10" },
            { icon: ArrowUpRight, label: "Spending", value: "$644.67", color: "text-red-400", bg: "bg-red-500/[0.06] border-red-500/10" },
            { icon: PiggyBank, label: "Saved", value: "$3,580.33", color: "text-green-400", bg: "bg-green-500/[0.06] border-green-500/10" },
            { icon: TrendingUp, label: "Net +/-", value: "+85%", color: "text-green-400", bg: "bg-white/[0.04] border-white/8" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 + i * 0.05 }}
              className={`p-3 rounded-xl border ${stat.bg}`}>
              <div className="flex items-center gap-1 mb-1">
                <stat.icon className={`w-3 h-3 ${stat.color}`} />
                <span className={`text-[8px] font-medium ${stat.color}`}>{stat.label}</span>
              </div>
              <p className={`text-[13px] font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </Stagger>

      <Stagger delay={0.2}>
        <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "3fr 2fr" }}>
          {/* Weekly spending chart */}
          <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
            <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">Weekly Spending</p>
            <div className="flex items-end justify-between gap-1.5 h-20 px-1">
              {[
                { day: "Mon", h: 55 }, { day: "Tue", h: 35 }, { day: "Wed", h: 75 }, { day: "Thu", h: 40 },
                { day: "Fri", h: 90 }, { day: "Sat", h: 60 }, { day: "Sun", h: 25 },
              ].map((bar, i) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div className="w-full rounded-t"
                    style={{ background: i === 4 ? "hsl(280 70% 55%)" : "hsl(280 70% 55% / 0.3)" }}
                    initial={{ height: 0 }} animate={{ height: `${bar.h}%` }} transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }} />
                  <span className="text-[7px] text-white/30">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Category donut */}
          <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
            <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">By Category</p>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 60 60" className="w-14 h-14 flex-shrink-0">
                <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(280 70% 55%)" strokeWidth="8"
                  strokeDasharray="62.8 94.2" transform="rotate(-90 30 30)"
                  initial={{ strokeDashoffset: 157 }} animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.3, duration: 1 }} />
                <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(38 92% 50%)" strokeWidth="8"
                  strokeDasharray="43.9 113.1" strokeDashoffset="-62.8" transform="rotate(-90 30 30)"
                  initial={{ strokeDashoffset: 94.2 }} animate={{ strokeDashoffset: -62.8 }} transition={{ delay: 0.5, duration: 0.8 }} />
                <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(200 70% 50%)" strokeWidth="8"
                  strokeDasharray="15.7 141.3" strokeDashoffset="-106.7" transform="rotate(-90 30 30)"
                  initial={{ strokeDashoffset: 50.3 }} animate={{ strokeDashoffset: -106.7 }} transition={{ delay: 0.7, duration: 0.6 }} />
                <motion.circle cx="30" cy="30" r="25" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="8"
                  strokeDasharray="12.6 144.4" strokeDashoffset="-122.4" transform="rotate(-90 30 30)"
                  initial={{ strokeDashoffset: 34.6 }} animate={{ strokeDashoffset: -122.4 }} transition={{ delay: 0.9, duration: 0.5 }} />
              </svg>
              <div className="space-y-1.5 flex-1">
                {[
                  { label: "Transfers", pct: "40%", color: "bg-purple-500" },
                  { label: "Bills", pct: "28%", color: "bg-amber-500" },
                  { label: "Withdrawals", pct: "10%", color: "bg-blue-500" },
                  { label: "Shopping", pct: "8%", color: "bg-green-500" },
                ].map((cat) => (
                  <div key={cat.label} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${cat.color}`} />
                    <span className="text-[8px] text-white/60 flex-1">{cat.label}</span>
                    <span className="text-[8px] text-white/80 font-medium">{cat.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Stagger>
    </div>
  );
}

function DesktopCryptoWalletScreen() {
  return (
    <div className="p-4 space-y-3">
      <Stagger>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <p className="text-[14px] font-bold text-white tracking-tight">Crypto Wallet</p>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15">
            <div className="w-1 h-1 rounded-full bg-green-400" />
            <span className="text-[7px] font-semibold text-green-400">Live</span>
          </div>
        </div>
      </Stagger>

      <Stagger delay={0.1}>
        <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "2fr 3fr" }}>
          {/* Left: Portfolio overview + donut */}
          <div className="rounded-xl p-3.5 border border-white/8 bg-white/[0.04] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-green-500/5 pointer-events-none" />
            <div className="relative">
              <p className="text-[8px] text-white/40 uppercase tracking-wider mb-0.5">Portfolio Value</p>
              <motion.p className="text-[18px] font-bold text-white font-mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>$8,234.56</motion.p>
              <p className="text-[8px] text-white/30 font-mono mb-3">USD Balance: $12,406.32</p>

              {/* Allocation donut */}
              <svg viewBox="0 0 80 80" className="w-20 h-20 mx-auto">
                <motion.circle cx="40" cy="40" r="32" fill="none" stroke="hsl(38 80% 50%)" strokeWidth="10"
                  strokeDasharray="139.9 61.3" transform="rotate(-90 40 40)"
                  initial={{ strokeDashoffset: 201.1 }} animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.3, duration: 1 }} />
                <motion.circle cx="40" cy="40" r="32" fill="none" stroke="hsl(217 91% 60%)" strokeWidth="10"
                  strokeDasharray="45.9 155.3" strokeDashoffset="-139.9" transform="rotate(-90 40 40)"
                  initial={{ strokeDashoffset: 61.3 }} animate={{ strokeDashoffset: -139.9 }} transition={{ delay: 0.5, duration: 0.8 }} />
                <motion.circle cx="40" cy="40" r="32" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="10"
                  strokeDasharray="15.1 186.1" strokeDashoffset="-185.8" transform="rotate(-90 40 40)"
                  initial={{ strokeDashoffset: 15.3 }} animate={{ strokeDashoffset: -185.8 }} transition={{ delay: 0.7, duration: 0.6 }} />
                <text x="40" y="38" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">$8,234</text>
                <text x="40" y="48" textAnchor="middle" fill="white" fontSize="5" opacity="0.4">Total</text>
              </svg>

              <div className="grid grid-cols-4 gap-1 mt-3">
                {[
                  { icon: ArrowDownLeft, label: "Buy", color: "bg-green-500/10 text-green-400" },
                  { icon: ArrowUpRight, label: "Sell", color: "bg-red-500/10 text-red-400" },
                  { icon: ArrowRightLeft, label: "Swap", color: "bg-green-500/10 text-green-400" },
                  { icon: Send, label: "Send", color: "bg-amber-500/10 text-amber-400" },
                ].map((a, i) => (
                  <motion.div key={a.label} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl ${a.color}`}>
                    <a.icon className="w-3 h-3" />
                    <span className="text-[6px] font-semibold uppercase tracking-wider">{a.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Holdings table */}
          <div className="rounded-xl border border-white/8 bg-white/[0.04] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Holdings</p>
              <PieChart className="w-3 h-3 text-white/20" />
            </div>
            {/* Table header */}
            <div className="grid grid-cols-5 gap-2 px-3 py-1.5 border-b border-white/[0.06] text-[7px] text-white/25 uppercase tracking-wider font-semibold">
              <span>Asset</span><span>Amount</span><span>Value</span><span>Allocation</span><span>24h</span>
            </div>
            {[
              { code: "BTC", name: "Bitcoin", amount: "0.084521", value: "$5,734.12", pct: "69.6%", change: "+5.2%", pos: true },
              { code: "ETH", name: "Ethereum", amount: "0.543200", value: "$1,878.32", pct: "22.8%", change: "+3.1%", pos: true },
              { code: "SOL", name: "Solana", amount: "4.350000", value: "$620.62", pct: "7.5%", change: "+8.4%", pos: true },
            ].map((h, i) => (
              <motion.div key={h.code} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.07 }}
                className="grid grid-cols-5 gap-2 px-3 py-2.5 border-b border-white/[0.03] last:border-0 items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white/60">{h.code.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-white">{h.name}</p>
                    <p className="text-[6px] text-white/30">{h.code}</p>
                  </div>
                </div>
                <span className="text-[8px] text-white/60 font-mono">{h.amount}</span>
                <span className="text-[9px] text-white font-mono font-semibold">{h.value}</span>
                <span className="text-[8px] text-white/50">{h.pct}</span>
                <div className="flex items-center gap-1">
                  <svg viewBox="0 0 28 10" className="w-5 h-2.5">
                    <path d="M0,8 Q7,4 14,3 T28,1" fill="none" stroke="#22c55e" strokeWidth="1" />
                  </svg>
                  <span className={`text-[8px] font-medium ${h.pos ? "text-green-400" : "text-red-400"}`}>{h.change}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Stagger>
    </div>
  );
}

/* ─── Desktop screen component map ─── */
const DESKTOP_SCREEN_COMPONENTS: Record<string, React.FC> = {
  dashboard: DesktopDashboardScreen,
  markets: DesktopMarketsScreen,
  cards: DesktopCardsScreen,
  savings: DesktopSavingsScreen,
  send: DesktopSendScreen,
  analytics: DesktopAnalyticsScreen,
  wallet: DesktopCryptoWalletScreen,
};

/* ─── Desktop sidebar for laptop frame ─── */
const SIDEBAR_ITEMS = [
  { icon: Wallet, label: "Account", id: "dashboard" },
  { icon: Coins, label: "Crypto", id: "wallet" },
  { icon: Briefcase, label: "Stocks", id: "stocks" },
  { icon: Send, label: "Send", id: "send" },
  { icon: TrendingUp, label: "Markets", id: "markets" },
  { icon: PiggyBank, label: "Savings", id: "savings" },
  { icon: CreditCard, label: "Cards", id: "cards" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
  { icon: Bot, label: "AI Advisor", id: "advisor" },
];

function DesktopSidebar({ activeScreenId }: { activeScreenId: string }) {
  return (
    <div className="w-[100px] border-r border-white/[0.06] bg-[hsl(240,10%,5%)] flex flex-col py-2 px-1.5 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-1.5 px-2 py-2 mb-2">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
          <span className="text-[5px] font-bold text-white/80 tracking-tighter">Ξ╳</span>
        </div>
        <span className="text-[7px] font-bold tracking-wider text-white/60">Ξ╳OSKY</span>
      </div>

      {/* Nav items */}
      <div className="space-y-0.5 flex-1">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.id === activeScreenId || 
            (activeScreenId === "dashboard" && item.id === "dashboard");
          return (
            <div
              key={item.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[7px] font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              <item.icon className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* User */}
      <div className="border-t border-white/[0.06] pt-2 mt-1 px-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-[6px] font-bold text-green-400">AJ</span>
          </div>
          <div className="min-w-0">
            <p className="text-[6px] font-medium text-white/70 truncate">Alex Johnson</p>
            <p className="text-[5px] text-white/30 truncate">@alexjohnson</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Showcase — Phone + Laptop Cycle
   ═══════════════════════════════════════════ */
export function AppShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"phone" | "laptop">("phone");
  const navigate = useNavigate();
  const progressRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);

  const goTo = useCallback((index: number) => {
    setIsTransitioning(true);
    setActiveIndex(index);
    setProgress(0);
    progressRef.current = 0;
    setTimeout(() => setIsTransitioning(false), 400);
  }, []);

  const next = useCallback(() => {
    const nextIndex = (activeIndex + 1) % SCREENS.length;
    if (nextIndex === 0) {
      // Completed a full cycle — switch device
      setIsTransitioning(true);
      setProgress(0);
      progressRef.current = 0;
      setTimeout(() => {
        setDeviceMode((prev) => (prev === "phone" ? "laptop" : "phone"));
        setActiveIndex(0);
        setTimeout(() => setIsTransitioning(false), 600);
      }, 300);
    } else {
      goTo(nextIndex);
    }
  }, [activeIndex, goTo]);

  // Auto-advance with progress bar
  useEffect(() => {
    if (isPaused || isTransitioning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const startTime = Date.now() - (progressRef.current / 100) * DURATION;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      progressRef.current = pct;
      setProgress(pct);

      if (pct >= 100) {
        next();
      }
    }, 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isTransitioning, next]);

  const ActiveScreen = SCREEN_COMPONENTS[SCREENS[activeIndex].id];
  const ActiveDesktopScreen = DESKTOP_SCREEN_COMPONENTS[SCREENS[activeIndex].id];
  const currentColor = SCREENS[activeIndex].color;

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        {deviceMode === "phone" ? (
          /* ═══ Phone Frame ═══ */
          <motion.div
            key="phone-device"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 30 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative will-change-transform"
              style={{ transform: "translateZ(0)", perspective: "1200px" }}
            >
              {/* Multi-layered glow */}
              <div
                className="absolute -inset-16 rounded-full blur-[100px] pointer-events-none transition-all duration-700"
                style={{ backgroundColor: currentColor + "12" }}
              />
              <div
                className="absolute -inset-8 rounded-full blur-[60px] pointer-events-none transition-all duration-700"
                style={{ backgroundColor: currentColor + "08" }}
              />

              {/* Phone body */}
              <motion.div
                className="relative w-[260px] sm:w-[300px] lg:w-[340px] xl:w-[380px] rounded-[2.8rem] border-[6px] border-[hsl(240,6%,20%)] bg-[hsl(240,10%,6%)] shadow-2xl shadow-black/60 overflow-hidden group/phone cursor-pointer"
                onClick={() => navigate("/auth")}
                whileHover={{
                  rotateY: -3,
                  rotateX: 2,
                  scale: 1.02,
                  transition: { duration: 0.4, ease: "easeOut" },
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Edge reflection */}
                <div className="absolute inset-0 rounded-[2.2rem] pointer-events-none z-30"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)",
                  }}
                />

                {/* Status bar */}
                <div className="relative h-8 flex items-center justify-between px-6 pt-1 bg-[hsl(240,10%,6%)]">
                  <span className="text-[8px] text-white/40 font-medium">9:41</span>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[76px] h-[22px] bg-black rounded-b-2xl" />
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-[1px]">
                      {[3, 4, 5, 6].map(h => (
                        <div key={h} className="w-[2px] rounded-sm bg-white/40" style={{ height: h }} />
                      ))}
                    </div>
                    <div className="w-3.5 h-2 border border-white/40 rounded-[2px] relative">
                      <div className="absolute inset-[1px] right-[2px] bg-green-400 rounded-[1px]" />
                      <div className="absolute -right-[1.5px] top-1/2 -translate-y-1/2 w-[1px] h-1 bg-white/40 rounded-r" />
                    </div>
                  </div>
                </div>

                {/* Screen content */}
                <div className="h-[460px] sm:h-[520px] lg:h-[580px] xl:h-[660px] overflow-y-auto scrollbar-none relative">
                  <div
                    className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 opacity-[0.03]"
                    style={{
                      backgroundImage: `radial-gradient(ellipse at 50% 0%, ${currentColor}, transparent 70%)`,
                    }}
                  />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={SCREENS[activeIndex].id}
                      initial={{ opacity: 0, y: 60 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -60 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ActiveScreen />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom nav */}
                <div className="h-12 border-t border-white/[0.06] flex items-center justify-around px-2 bg-[hsl(240,10%,5%)]">
                  {SCREENS.slice(0, 5).map((screen, i) => {
                    const Icon = screen.icon;
                    const isActive = i === activeIndex || (activeIndex >= 5 && i === 0);
                    return (
                      <button
                        key={screen.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          goTo(i);
                        }}
                        className="flex flex-col items-center gap-[2px] py-1 px-1.5 transition-all"
                      >
                        <motion.div
                          animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <Icon
                            className="w-[14px] h-[14px] transition-colors duration-300"
                            style={{ color: isActive ? screen.color : "rgba(255,255,255,0.25)" }}
                          />
                        </motion.div>
                        <span
                          className="text-[6px] font-medium transition-colors duration-300"
                          style={{ color: isActive ? screen.color : "rgba(255,255,255,0.2)" }}
                        >
                          {screen.label}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="navDotPhone"
                            className="w-0.5 h-0.5 rounded-full"
                            style={{ backgroundColor: screen.color }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Home indicator */}
                <div className="flex justify-center py-1.5 bg-[hsl(240,10%,5%)]">
                  <div className="w-[100px] h-[4px] rounded-full bg-white/15" />
                </div>

                {/* Hover CTA overlay */}
                <div className="absolute inset-0 rounded-[2.2rem] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 opacity-0 group-hover/phone:opacity-100 transition-opacity duration-300 z-20 pointer-events-none group-hover/phone:pointer-events-auto">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-glow"
                  >
                    <ArrowRight className="w-6 h-6 text-accent-foreground" />
                  </motion.div>
                  <p className="text-white text-base font-bold tracking-tight">Try it live</p>
                  <p className="text-white/50 text-xs">Create a free account in 2 min</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          /* ═══ Laptop Frame ═══ */
          <motion.div
            key="laptop-device"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="relative will-change-transform"
              style={{ transform: "translateZ(0)", perspective: "1200px" }}
            >
              {/* Glow */}
              <div
                className="absolute -inset-20 rounded-full blur-[120px] pointer-events-none transition-all duration-700"
                style={{ backgroundColor: currentColor + "10" }}
              />
              <div
                className="absolute -inset-10 rounded-full blur-[70px] pointer-events-none transition-all duration-700"
                style={{ backgroundColor: currentColor + "06" }}
              />

              <motion.div
                className="relative cursor-pointer group/laptop"
                onClick={() => navigate("/auth")}
                whileHover={{
                  rotateY: -2,
                  rotateX: 1,
                  scale: 1.01,
                  transition: { duration: 0.4, ease: "easeOut" },
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Laptop screen */}
                <div
                  className="relative w-[340px] sm:w-[480px] md:w-[560px] lg:w-[640px] xl:w-[720px] rounded-t-xl border-[4px] border-b-0 overflow-hidden"
                  style={{
                    borderColor: "hsl(240, 6%, 18%)",
                    background: "hsl(240, 10%, 6%)",
                  }}
                >
                  {/* Camera notch / top bezel */}
                  <div className="h-5 bg-[hsl(240,6%,14%)] flex items-center justify-center relative">
                    <div className="w-2 h-2 rounded-full bg-[hsl(240,6%,22%)] border border-[hsl(240,6%,28%)]" />
                    {/* Traffic lights */}
                    <div className="absolute left-3 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                    </div>
                    {/* URL bar hint */}
                    <div className="absolute right-3 flex items-center gap-1">
                      <div className="w-16 h-2 rounded bg-white/[0.06] flex items-center justify-center">
                        <span className="text-[5px] text-white/20 font-mono">exosky.app</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout: sidebar + content */}
                  <div className="flex h-[280px] sm:h-[340px] md:h-[380px] lg:h-[420px] xl:h-[460px]">
                    {/* Sidebar */}
                    <DesktopSidebar activeScreenId={SCREENS[activeIndex].id} />

                    {/* Main content */}
                    <div className="flex-1 overflow-y-auto scrollbar-none relative">
                      {/* Color wash */}
                      <div
                        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 opacity-[0.03]"
                        style={{
                          backgroundImage: `radial-gradient(ellipse at 50% 0%, ${currentColor}, transparent 70%)`,
                        }}
                      />
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={SCREENS[activeIndex].id + "-desktop"}
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -40 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <ActiveDesktopScreen />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Laptop hinge */}
                <div
                  className="w-full h-[3px] rounded-b-sm"
                  style={{ background: "linear-gradient(to bottom, hsl(240,6%,20%), hsl(240,6%,14%))" }}
                />

                {/* Keyboard base — trapezoidal wedge */}
                <div className="relative flex justify-center">
                  <div
                    className="h-3 sm:h-4 rounded-b-lg"
                    style={{
                      width: "108%",
                      marginLeft: "-4%",
                      background: "linear-gradient(to bottom, hsl(240,6%,16%), hsl(240,6%,12%))",
                      borderLeft: "1px solid hsl(240,6%,20%)",
                      borderRight: "1px solid hsl(240,6%,20%)",
                      borderBottom: "1px solid hsl(240,6%,20%)",
                    }}
                  >
                    {/* Trackpad hint */}
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-1.5 sm:h-2 rounded-sm border border-white/[0.06] bg-white/[0.02]" />
                  </div>
                </div>

                {/* Shadow base */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] h-4 bg-black/30 blur-xl rounded-full" />

                {/* Hover CTA overlay */}
                <div className="absolute inset-0 rounded-xl bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 opacity-0 group-hover/laptop:opacity-100 transition-opacity duration-300 z-20 pointer-events-none group-hover/laptop:pointer-events-auto">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-glow"
                  >
                    <ArrowRight className="w-6 h-6 text-accent-foreground" />
                  </motion.div>
                  <p className="text-white text-base font-bold tracking-tight">Try it live</p>
                  <p className="text-white/50 text-xs">Create a free account in 2 min</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Device mode indicator ─── */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => { setDeviceMode("phone"); goTo(0); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            deviceMode === "phone"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mobile
        </button>
        <button
          onClick={() => { setDeviceMode("laptop"); goTo(0); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            deviceMode === "laptop"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Desktop
        </button>
      </div>

      {/* ─── Film-style progress timeline ─── */}
      <div className="flex items-center gap-1 mt-4 w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[340px] xl:max-w-[380px]">
        {SCREENS.map((screen, i) => (
          <button
            key={screen.id}
            onClick={() => goTo(i)}
            className="flex-1 h-1 rounded-full overflow-hidden relative cursor-pointer group/seg"
            style={{ backgroundColor: "hsl(var(--border) / 0.4)" }}
            title={screen.label}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                backgroundColor: i < activeIndex
                  ? SCREENS[i].color
                  : i === activeIndex
                    ? currentColor
                    : "transparent",
                width: i < activeIndex ? "100%" : i === activeIndex ? `${progress}%` : "0%",
              }}
            />
            <div className="absolute inset-0 rounded-full opacity-0 group-hover/seg:opacity-100 transition-opacity"
              style={{ backgroundColor: "hsl(var(--foreground) / 0.1)" }}
            />
          </button>
        ))}
      </div>

      {/* Label with icon */}
      <AnimatePresence mode="wait">
        <motion.div
          key={SCREENS[activeIndex].label + deviceMode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-3 flex items-center gap-2"
        >
          {(() => {
            const Icon = SCREENS[activeIndex].icon;
            return (
              <Icon className="w-3.5 h-3.5" style={{ color: currentColor }} />
            );
          })()}
          <span className="text-sm font-semibold text-muted-foreground">
            {SCREENS[activeIndex].label}
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {activeIndex + 1}/{SCREENS.length}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            {deviceMode === "phone" ? "Mobile" : "Desktop"}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
