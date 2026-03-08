import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Shield, Zap, TrendingUp, CreditCard,
  Globe, Gift, PiggyBank, BarChart3, Smartphone,
  ChevronRight, Star, Lock, Users, Wallet
} from "lucide-react";
import { useEffect } from "react";
import appMockup from "@/assets/app-mockup.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const }
  }),
};

const FEATURES = [
  {
    icon: Wallet,
    title: "Multi-Currency Wallet",
    description: "Hold USD, EUR, GBP, NGN and 50+ currencies in one account with instant conversions.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: TrendingUp,
    title: "Crypto & Stocks",
    description: "Buy, sell, and track Bitcoin, Ethereum, Tesla, Apple and 100+ assets in real-time.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: CreditCard,
    title: "Virtual & Metal Cards",
    description: "Instant virtual cards and premium metal cards with custom designs and security controls.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: PiggyBank,
    title: "6% APY Savings",
    description: "Earn industry-leading 6% annual yield on your savings with no lock-in period.",
    gradient: "from-warning/20 to-warning/5",
  },
  {
    icon: Globe,
    title: "Send Money Globally",
    description: "Instant P2P transfers to anyone worldwide with near-zero fees.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: Zap,
    title: "Bill Pay & Rewards",
    description: "Pay bills globally and earn 1% cashback on every payment. Utilities, streaming, rent.",
    gradient: "from-destructive/20 to-destructive/5",
  },
];

const STATS = [
  { value: "$25", label: "Welcome Bonus" },
  { value: "6%", label: "APY on Savings" },
  { value: "150+", label: "Countries" },
  { value: "0%", label: "FX Markup" },
];

const TRUST_BADGES = [
  { icon: Shield, label: "Bank-Grade Security" },
  { icon: Lock, label: "End-to-End Encrypted" },
  { icon: Users, label: "KYC/AML Compliant" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <span className="text-sm font-black text-accent-foreground tracking-tighter">Ξ╳</span>
            </div>
            <span className="text-lg font-bold tracking-tight">ExoSky</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground"
            >
              Log In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-8"
            >
              <Gift className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">Get $25 when you sign up — No deposit required</span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]"
            >
              The future of
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-accent)" }}>
                money is here
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Banking, savings, crypto, stocks, cards, and global payments —
              all in one beautifully simple app. Built for the borderless generation.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-accent text-accent-foreground hover:bg-accent/90 h-13 px-8 text-base font-semibold gap-2 rounded-xl shadow-[0_0_30px_hsl(142_71%_45%/0.3)]"
              >
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-13 px-8 text-base rounded-xl border-border/60"
              >
                See What's Inside
              </Button>
            </motion.div>
          </div>

          {/* Right: Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateY: -8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            className="relative flex-shrink-0"
          >
            {/* Glow behind phone */}
            <div className="absolute -inset-8 bg-accent/10 rounded-full blur-[60px] pointer-events-none" />
            
            {/* Floating phone */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Phone frame */}
              <div className="relative w-[260px] sm:w-[280px] rounded-[2.5rem] border-[6px] border-border/80 bg-card shadow-2xl shadow-black/40 overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-border/80 rounded-b-xl z-10" />
                <img
                  src={appMockup}
                  alt="ExoSky app dashboard showing account balance, portfolio chart, and quick actions"
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -6, 0], x: [0, 3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -left-12 top-16 px-3 py-2 rounded-xl bg-card border border-border shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold">+12.4%</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-10 top-1/3 px-3 py-2 rounded-xl bg-card border border-border shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold">150+ Countries</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                className="absolute -left-8 bottom-24 px-3 py-2 rounded-xl bg-card border border-accent/30 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-warning" />
                  <span className="text-xs font-bold text-warning">6% APY</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border bg-border">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-card p-6 text-center">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-accent">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Everything you need.{" "}
              <span className="text-muted-foreground">Nothing you don't.</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              From everyday spending to building wealth — ExoSky replaces your bank, broker, and payment apps.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`group relative rounded-2xl border border-border bg-gradient-to-br ${feature.gradient} p-6 hover:border-accent/30 transition-all duration-300`}
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Welcome Bonus CTA ─── */}
      <section className="px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden border border-accent/20 p-8 sm:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-blue-500/5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px]" />

            <div className="relative flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-4">
                  <Gift className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-semibold text-accent">Limited Time Offer</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Get <span className="text-accent">$25 free</span> when
                  <br className="hidden sm:block" /> you sign up today
                </h2>
                <p className="text-muted-foreground mt-3 max-w-md">
                  No deposit required. No strings attached. Start investing, saving, or spending — it's your money.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl shadow-[0_0_40px_hsl(142_71%_45%/0.25)]"
                >
                  Claim Your $25 <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-48 h-48 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center">
                <div className="text-center">
                  <p className="text-5xl font-black text-accent">$25</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Welcome Bonus</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── APY Section ─── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-warning/20 bg-warning/5 mb-6">
              <PiggyBank className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold text-warning">High-Yield Savings</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight">
              Earn <span className="text-warning">6% APY</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
              That's 10x the national average. Your money grows while you sleep — withdraw anytime, no penalties.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border max-w-lg mx-auto">
              {[
                { amount: "$1,000", earnings: "$60/yr" },
                { amount: "$10,000", earnings: "$600/yr" },
                { amount: "$100,000", earnings: "$6,000/yr" },
              ].map((tier) => (
                <div key={tier.amount} className="bg-card p-5 text-center">
                  <p className="text-xs text-muted-foreground">Save {tier.amount}</p>
                  <p className="text-lg font-bold text-warning mt-1">{tier.earnings}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Trust Section ─── */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12"
          >
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <badge.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{badge.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-6 py-20 pb-32">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Ready to take control
              <br />
              of your money?
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Join thousands of users who've made the switch. It takes less than 2 minutes.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 h-14 px-10 text-base font-semibold gap-2 rounded-xl shadow-[0_0_40px_hsl(142_71%_45%/0.3)]"
            >
              Create Your Free Account <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                <span className="text-[10px] font-black text-accent-foreground tracking-tighter">Ξ╳</span>
              </div>
              <span className="text-sm font-bold">ExoSky Inc.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/disclosures" className="hover:text-foreground transition-colors">Compliance</a>
              <span>support@exosky.app</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 text-center mt-8">
            © {new Date().getFullYear()} ExoSky Inc. All rights reserved. ExoSky is not a bank. Banking services provided by partner institutions.
          </p>
        </div>
      </footer>
    </div>
  );
}