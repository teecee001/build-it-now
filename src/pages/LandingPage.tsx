import { motion, useScroll, useTransform } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Shield, Zap, TrendingUp, CreditCard,
  Globe, Gift, PiggyBank, BarChart3, Smartphone,
  ChevronRight, Star, Lock, Users, Wallet,
  Check, Sparkles, X, HelpCircle,
  Twitter, Github, Mail
} from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect, useRef } from "react";
import { AppShowcase } from "@/components/AppShowcase";

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

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    description: "Sign up in under 2 minutes with just your email. Get $25 free instantly.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Fund & explore",
    description: "Deposit via bank transfer, card, or crypto. Access every feature from day one.",
    icon: Wallet,
  },
  {
    step: "03",
    title: "Grow your money",
    description: "Earn 6% APY, trade crypto & stocks, send money globally — all from one app.",
    icon: TrendingUp,
  },
];

const FAQS = [
  {
    q: "Is ExoSky a real bank?",
    a: "ExoSky is a licensed fintech platform, not a traditional bank. Your funds are held by our regulated banking partners and protected by industry-standard deposit insurance where applicable.",
  },
  {
    q: "How does ExoSky offer 6% APY?",
    a: "We invest your savings in low-risk, high-yield instruments and pass the returns directly to you. With no physical branches and minimal overhead, we can offer significantly higher rates than traditional banks.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No. ExoSky has zero monthly fees, zero FX markup, and free domestic transfers. International transfers and crypto trades have transparent, industry-low fees shown before you confirm.",
  },
  {
    q: "How long do transfers take?",
    a: "Internal ExoSky transfers are instant. Bank transfers typically settle in 1–2 business days depending on the destination country. Crypto transactions confirm on-chain in minutes.",
  },
  {
    q: "Is my money safe?",
    a: "Absolutely. We use bank-grade AES-256 encryption, biometric authentication, and all accounts are KYC/AML verified. Your funds are held in segregated accounts with regulated partners.",
  },
  {
    q: "Which countries does ExoSky support?",
    a: "ExoSky is available in 150+ countries. Some features like cards or stock trading may vary by region due to local regulations. Check the app for availability in your country.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

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
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">Beta</span>
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
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-20 px-6"
      >
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

            {/* Trust indicators inline */}
            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-8 flex items-center justify-center lg:justify-start gap-5 flex-wrap"
            >
              {[
                "Bank-grade encryption",
                "150+ countries",
                "No hidden fees",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-muted-foreground font-medium">{item}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Animated App Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            className="relative flex-shrink-0"
          >
            <AppShowcase />
          </motion.div>
        </div>
      </motion.section>

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
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="bg-card p-6 text-center"
              >
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-accent">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-6">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">How It Works</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Up and running in{" "}
              <span className="text-accent">minutes</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative group"
              >
                <div className="text-5xl font-black text-accent/10 group-hover:text-accent/20 transition-colors mb-4">
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:block absolute top-8 -right-3 w-6">
                    <ChevronRight className="w-5 h-5 text-border" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
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
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`group relative rounded-2xl border border-border bg-gradient-to-br ${feature.gradient} p-6 hover:border-accent/30 transition-all duration-300 cursor-default`}
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

              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-48 h-48 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center"
              >
                <div className="text-center">
                  <p className="text-5xl font-black text-accent">$25</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Welcome Bonus</p>
                </div>
              </motion.div>
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
              ].map((tier, i) => (
                <motion.div
                  key={tier.amount}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card p-5 text-center"
                >
                  <p className="text-xs text-muted-foreground">Save {tier.amount}</p>
                  <p className="text-lg font-bold text-warning mt-1">{tier.earnings}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <BarChart3 className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">Side by Side</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              ExoSky vs. Traditional Banks
            </h2>
            <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
              See why thousands are making the switch.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border overflow-hidden"
          >
            {/* Header row */}
            <div className="grid grid-cols-3 bg-secondary/50">
              <div className="p-4 sm:p-5 text-sm font-semibold text-muted-foreground">Feature</div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-bold text-accent">ExoSky</span>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-bold text-muted-foreground">Banks</span>
              </div>
            </div>

            {[
              { feature: "Savings APY", exo: "6.00%", bank: "0.5%" },
              { feature: "Monthly fees", exo: "$0", bank: "$5–25" },
              { feature: "FX markup", exo: "0%", bank: "2–4%" },
              { feature: "Global transfers", exo: "Instant", bank: "3–5 days" },
              { feature: "Crypto & stocks", exo: true, bank: false },
              { feature: "Virtual cards", exo: "Instant", bank: "7–10 days" },
              { feature: "Welcome bonus", exo: "$25", bank: "$0" },
              { feature: "150+ currencies", exo: true, bank: false },
            ].map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-3 border-t border-border hover:bg-secondary/30 transition-colors"
              >
                <div className="p-4 sm:p-5 text-sm font-medium text-foreground">{row.feature}</div>
                <div className="p-4 sm:p-5 flex items-center justify-center">
                  {row.exo === true ? (
                    <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-accent" />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-accent">{String(row.exo)}</span>
                  )}
                </div>
                <div className="p-4 sm:p-5 flex items-center justify-center">
                  {row.bank === false ? (
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{String(row.bank)}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl"
            >
              Switch to ExoSky <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── Early Access CTA ─── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden border border-accent/20 p-8 sm:p-12 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/8 rounded-full blur-[100px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-accent">Now in Beta</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Be among the first to{" "}
                <span className="text-accent">experience ExoSky</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
                We're building the future of finance and you can be part of it from day one. 
                Sign up now to get early access and your $25 welcome bonus.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl shadow-[0_0_40px_hsl(142_71%_45%/0.25)]"
                >
                  Get Early Access <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Free to join · No credit card required · Beta users get exclusive perks
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-6">
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Got questions?
            </h2>
            <p className="text-muted-foreground mt-3">
              Everything you need to know before getting started.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="space-y-2">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border rounded-xl px-5 data-[state=open]:bg-secondary/30 transition-colors"
                >
                  <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
            {TRUST_BADGES.map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <badge.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{badge.label}</span>
              </motion.div>
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
      <footer className="border-t border-border px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                  <span className="text-xs font-black text-accent-foreground tracking-tighter">Ξ╳</span>
                </div>
                <span className="text-base font-bold">ExoSky</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The everything finance app. Banking, crypto, stocks, and global payments in one place.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <a href="#" className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent/10 transition-colors">
                  <Twitter className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent/10 transition-colors">
                  <Github className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
                <a href="mailto:support@exosky.app" className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent/10 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="/auth" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/auth" className="hover:text-foreground transition-colors">Cards</a></li>
                <li><a href="/auth" className="hover:text-foreground transition-colors">Crypto</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="/disclosures" className="hover:text-foreground transition-colors">Compliance</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Support</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="mailto:support@exosky.app" className="hover:text-foreground transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} ExoSky Inc. All rights reserved. ExoSky is not a bank. Banking services provided by partner institutions.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/disclosures" className="hover:text-foreground transition-colors">Disclosures</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
