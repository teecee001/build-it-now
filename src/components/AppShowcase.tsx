import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, TrendingUp, CreditCard, PiggyBank, Globe, Zap,
  ArrowUpRight, ArrowDownLeft, BarChart3, Send, QrCode,
  Bell, Shield, Star, ChevronRight, DollarSign, Bitcoin,
  LineChart, Eye, EyeOff, Plus, Minus
} from "lucide-react";

/* ─── Screen Data ─── */
const SCREENS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Wallet,
    color: "hsl(142 71% 45%)",
  },
  {
    id: "markets",
    label: "Markets",
    icon: TrendingUp,
    color: "hsl(217 91% 60%)",
  },
  {
    id: "cards",
    label: "Cards",
    icon: CreditCard,
    color: "hsl(280 73% 58%)",
  },
  {
    id: "savings",
    label: "Savings",
    icon: PiggyBank,
    color: "hsl(38 92% 50%)",
  },
  {
    id: "send",
    label: "Send Money",
    icon: Globe,
    color: "hsl(190 90% 50%)",
  },
];

const DURATION = 4000; // ms per screen

/* ─── Mini-screens rendered inside the phone ─── */

function DashboardScreen() {
  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/50">Good morning</p>
          <p className="text-sm font-bold text-white">Alex Johnson</p>
        </div>
        <div className="flex gap-1.5">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <Bell className="w-3 h-3 text-white/70" />
          </div>
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <Shield className="w-3 h-3 text-white/70" />
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(160 84% 39%))" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-white/70 font-medium">Total Balance</p>
          <Eye className="w-3 h-3 text-white/50" />
        </div>
        <p className="text-2xl font-black text-white tracking-tight">$24,856.32</p>
        <div className="flex items-center gap-1 mt-1">
          <ArrowUpRight className="w-3 h-3 text-white/80" />
          <span className="text-[10px] text-white/80 font-medium">+$1,234.56 today</span>
        </div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Send, label: "Send", color: "bg-blue-500/20" },
          { icon: ArrowDownLeft, label: "Receive", color: "bg-green-500/20" },
          { icon: QrCode, label: "QR Pay", color: "bg-purple-500/20" },
          { icon: Plus, label: "Deposit", color: "bg-amber-500/20" },
        ].map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center`}>
              <action.icon className="w-4 h-4 text-white/80" />
            </div>
            <span className="text-[8px] text-white/50 font-medium">{action.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div>
        <p className="text-[10px] text-white/50 font-medium mb-2">Recent Activity</p>
        {[
          { name: "Netflix", amount: "-$15.99", icon: Zap, positive: false },
          { name: "Salary", amount: "+$4,200", icon: ArrowDownLeft, positive: true },
          { name: "Uber Eats", amount: "-$32.50", icon: Minus, positive: false },
        ].map((tx, i) => (
          <motion.div
            key={tx.name}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <tx.icon className="w-3 h-3 text-white/60" />
              </div>
              <span className="text-[10px] text-white/70 font-medium">{tx.name}</span>
            </div>
            <span className={`text-[10px] font-bold ${tx.positive ? "text-green-400" : "text-white/60"}`}>
              {tx.amount}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MarketsScreen() {
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm font-bold text-white">Markets</p>

      {/* Mini chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-white/5 p-3"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Bitcoin className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-white">BTC/USD</span>
          </div>
          <span className="text-[10px] font-bold text-green-400">+5.23%</span>
        </div>
        {/* SVG Chart */}
        <svg viewBox="0 0 200 60" className="w-full h-12">
          <motion.path
            d="M0,45 C20,42 30,38 50,30 C70,22 80,35 100,28 C120,21 140,15 160,18 C180,21 190,12 200,8"
            fill="none"
            stroke="hsl(142 71% 45%)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.3 }}
          />
          <motion.path
            d="M0,45 C20,42 30,38 50,30 C70,22 80,35 100,28 C120,21 140,15 160,18 C180,21 190,12 200,8 L200,60 L0,60 Z"
            fill="url(#chartGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1, delay: 0.8 }}
          />
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142 71% 45%)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        <p className="text-lg font-black text-white mt-1">$67,842.50</p>
      </motion.div>

      {/* Asset List */}
      {[
        { name: "Ethereum", symbol: "ETH", price: "$3,456.78", change: "+3.1%", positive: true },
        { name: "Apple Inc.", symbol: "AAPL", price: "$198.45", change: "+1.8%", positive: true },
        { name: "Tesla", symbol: "TSLA", price: "$245.30", change: "-0.9%", positive: false },
        { name: "Solana", symbol: "SOL", price: "$142.67", change: "+8.4%", positive: true },
      ].map((asset, i) => (
        <motion.div
          key={asset.symbol}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
          className="flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white/60">{asset.symbol}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white">{asset.name}</p>
              <p className="text-[8px] text-white/40">{asset.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white">{asset.price}</p>
            <p className={`text-[8px] font-medium ${asset.positive ? "text-green-400" : "text-red-400"}`}>
              {asset.change}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CardsScreen() {
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm font-bold text-white">My Cards</p>

      {/* Card Visual */}
      <motion.div
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
        className="rounded-2xl p-4 h-[140px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(280 73% 40%), hsl(240 60% 35%))" }}
      >
        <div className="flex justify-between items-start">
          <span className="text-[10px] text-white/60 font-medium">ExoSky Premium</span>
          <span className="text-[10px] font-bold text-white/80">VISA</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-mono text-white/80 tracking-widest mb-2">•••• •••• •••• 4829</p>
          <div className="flex justify-between">
            <div>
              <p className="text-[7px] text-white/40">VALID THRU</p>
              <p className="text-[9px] text-white/70 font-medium">12/28</p>
            </div>
            <div>
              <p className="text-[7px] text-white/40">CARDHOLDER</p>
              <p className="text-[9px] text-white/70 font-medium">ALEX JOHNSON</p>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 right-6 w-16 h-16 rounded-full bg-white/10" />
        <div className="absolute top-1/2 right-2 w-16 h-16 rounded-full bg-white/10" />
      </motion.div>

      {/* Card Controls */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: EyeOff, label: "Freeze" },
          { icon: Shield, label: "Limits" },
          { icon: Star, label: "Rewards" },
        ].map((ctrl, i) => (
          <motion.div
            key={ctrl.label}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/5"
          >
            <ctrl.icon className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[8px] text-white/50 font-medium">{ctrl.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Spending */}
      <div>
        <p className="text-[10px] text-white/50 font-medium mb-2">This Month</p>
        <div className="space-y-2">
          {[
            { category: "Shopping", amount: "$345.20", pct: 40 },
            { category: "Food", amount: "$189.50", pct: 22 },
            { category: "Transport", amount: "$67.00", pct: 8 },
          ].map((cat, i) => (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-white/60">{cat.category}</span>
                <span className="text-white/80 font-medium">{cat.amount}</span>
              </div>
              <div className="h-1 rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "hsl(280 73% 58%)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.pct}%` }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.6 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavingsScreen() {
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm font-bold text-white">Savings</p>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="rounded-2xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(38 92% 50%), hsl(32 95% 44%))" }}
      >
        <p className="text-[10px] text-white/70">Savings Balance</p>
        <p className="text-2xl font-black text-white mt-1">$12,450.00</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Star className="w-3 h-3 text-white/80" />
          <span className="text-[10px] text-white/80 font-medium">Earning 6% APY</span>
        </div>
      </motion.div>

      {/* Growth Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-white/5 p-3"
      >
        <p className="text-[10px] text-white/50 mb-2">12-Month Projection</p>
        <svg viewBox="0 0 200 50" className="w-full h-10">
          <motion.path
            d="M0,45 C30,43 60,40 80,35 C100,30 120,24 140,18 C160,12 180,8 200,5"
            fill="none"
            stroke="hsl(38 92% 50%)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.6 }}
          />
        </svg>
        <div className="flex justify-between mt-2">
          <div>
            <p className="text-[8px] text-white/40">Now</p>
            <p className="text-[10px] font-bold text-white">$12,450</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-white/40">In 12 months</p>
            <p className="text-[10px] font-bold text-amber-400">$13,197</p>
          </div>
        </div>
      </motion.div>

      {/* Goals */}
      <div>
        <p className="text-[10px] text-white/50 font-medium mb-2">Savings Goals</p>
        {[
          { name: "Emergency Fund", target: "$20,000", pct: 62 },
          { name: "Vacation", target: "$5,000", pct: 85 },
        ].map((goal, i) => (
          <motion.div
            key={goal.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 + i * 0.15 }}
            className="mb-3"
          >
            <div className="flex justify-between text-[9px] mb-1">
              <span className="text-white/70 font-medium">{goal.name}</span>
              <span className="text-white/50">{goal.target}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "hsl(38 92% 50%)" }}
                initial={{ width: 0 }}
                animate={{ width: `${goal.pct}%` }}
                transition={{ delay: 1.1 + i * 0.15, duration: 0.7 }}
              />
            </div>
            <p className="text-[8px] text-white/40 mt-0.5">{goal.pct}% complete</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SendScreen() {
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm font-bold text-white">Send Money</p>

      {/* Amount Input */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white/5 p-4 text-center"
      >
        <p className="text-[10px] text-white/50 mb-1">You're sending</p>
        <motion.p
          className="text-3xl font-black text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          $500.00
        </motion.p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] text-cyan-400 font-medium">≈ €462.35 EUR</span>
        </div>
      </motion.div>

      {/* Recipient */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
      >
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <span className="text-xs font-bold text-cyan-400">SM</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-white">Sarah Mitchell</p>
          <p className="text-[8px] text-white/40">@sarahm · Berlin, Germany</p>
        </div>
        <ChevronRight className="w-3 h-3 text-white/30 ml-auto" />
      </motion.div>

      {/* Fee Breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-2 px-1"
      >
        {[
          { label: "Transfer fee", value: "$0.00", highlight: true },
          { label: "Exchange rate", value: "1 USD = 0.9247 EUR" },
          { label: "Arrives in", value: "< 30 seconds", highlight: true },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-[9px]">
            <span className="text-white/50">{row.label}</span>
            <span className={row.highlight ? "text-green-400 font-medium" : "text-white/70"}>
              {row.value}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Send Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="rounded-xl py-3 text-center font-bold text-[11px] text-white"
        style={{ background: "linear-gradient(135deg, hsl(190 90% 40%), hsl(200 85% 50%))" }}
      >
        Send $500.00 →
      </motion.div>
    </div>
  );
}

const SCREEN_COMPONENTS: Record<string, React.FC> = {
  dashboard: DashboardScreen,
  markets: MarketsScreen,
  cards: CardsScreen,
  savings: SavingsScreen,
  send: SendScreen,
};

/* ─── Main Showcase Component ─── */
export function AppShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SCREENS.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, DURATION);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  const ActiveScreen = SCREEN_COMPONENTS[SCREENS[activeIndex].id];

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Phone Frame */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Glow */}
        <motion.div
          className="absolute -inset-10 rounded-full blur-[80px] pointer-events-none"
          animate={{ backgroundColor: SCREENS[activeIndex].color + "20" }}
          transition={{ duration: 0.6 }}
        />

        {/* Phone body */}
        <div className="relative w-[270px] sm:w-[300px] rounded-[2.8rem] border-[6px] border-border/80 bg-[hsl(240,10%,8%)] shadow-2xl shadow-black/50 overflow-hidden">
          {/* Status bar */}
          <div className="relative h-8 flex items-center justify-between px-6 pt-1">
            <span className="text-[8px] text-white/40 font-medium">9:41</span>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-2xl" />
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 border border-white/40 rounded-sm">
                <div className="w-1.5 h-full bg-green-400 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Screen content */}
          <div className="h-[480px] sm:h-[520px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={SCREENS[activeIndex].id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="h-full"
              >
                <ActiveScreen />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom nav */}
          <div className="h-14 border-t border-white/5 flex items-center justify-around px-4 bg-[hsl(240,10%,6%)]">
            {SCREENS.map((screen, i) => {
              const Icon = screen.icon;
              const isActive = i === activeIndex;
              return (
                <button
                  key={screen.id}
                  onClick={() => setActiveIndex(i)}
                  className="flex flex-col items-center gap-0.5 transition-colors"
                >
                  <Icon
                    className="w-4 h-4 transition-colors"
                    style={{ color: isActive ? screen.color : "rgba(255,255,255,0.3)" }}
                  />
                  <span
                    className="text-[7px] font-medium transition-colors"
                    style={{ color: isActive ? screen.color : "rgba(255,255,255,0.25)" }}
                  >
                    {screen.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center py-2 bg-[hsl(240,10%,6%)]">
            <div className="w-24 h-1 rounded-full bg-white/20" />
          </div>
        </div>
      </motion.div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mt-8">
        {SCREENS.map((screen, i) => (
          <button
            key={screen.id}
            onClick={() => setActiveIndex(i)}
            className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{ width: i === activeIndex ? 32 : 8, backgroundColor: "hsl(var(--border))" }}
          >
            {i === activeIndex && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: screen.color }}
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={{ scaleX: 1 }}
                transition={{ duration: DURATION / 1000, ease: "linear" }}
                key={`progress-${activeIndex}`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={SCREENS[activeIndex].label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-3 text-sm font-semibold text-muted-foreground"
        >
          {SCREENS[activeIndex].label}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
