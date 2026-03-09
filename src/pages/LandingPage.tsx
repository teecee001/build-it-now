import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Shield, Zap, TrendingUp, CreditCard,
  Globe, Gift, PiggyBank, BarChart3, Smartphone,
  ChevronRight, Star, Lock, Users, Wallet,
  Check, Sparkles, X, HelpCircle,
  Twitter, Github, Mail, ArrowUp
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect } from "react";
import { AppShowcase } from "@/components/AppShowcase";

/* ─── Staggered reveal variant ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const }
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ─── Reusable scroll-reveal section wrapper ─── */
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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
    q: "Is Ξ╳oSky a real bank?",
    a: "Ξ╳oSky is a licensed fintech platform, not a traditional bank. Your funds are held by our regulated banking partners and protected by industry-standard deposit insurance where applicable.",
  },
  {
    q: "How does Ξ╳oSky offer 6% APY?",
    a: "We invest your savings in low-risk, high-yield instruments and pass the returns directly to you. With no physical branches and minimal overhead, we can offer significantly higher rates than traditional banks.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No. Ξ╳oSky has zero monthly fees, zero FX markup, and free domestic transfers. International transfers and crypto trades have transparent, industry-low fees shown before you confirm.",
  },
  {
    q: "How long do transfers take?",
    a: "Internal Ξ╳oSky transfers are instant. Bank transfers typically settle in 1–2 business days depending on the destination country. Crypto transactions confirm on-chain in minutes.",
  },
  {
    q: "Is my money safe?",
    a: "Absolutely. We use bank-grade AES-256 encryption, biometric authentication, and all accounts are KYC/AML verified. Your funds are held in segregated accounts with regulated partners.",
  },
  {
    q: "Which countries does Ξ╳oSky support?",
    a: "Ξ╳oSky is available in 150+ countries. Some features like cards or stock trading may vary by region due to local regulations. Check the app for availability in your country.",
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
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setShowScrollTop(scrollTop > 400);
      setScrollProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    supabase.rpc("get_waitlist_count").then(({ data }) => {
      if (data != null) setWaitlistCount(data);
    });
  }, []);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center"
            >
              <span className="text-xs font-black text-accent-foreground tracking-tighter">Ξ╳</span>
            </motion.div>
            <span className="text-base sm:text-lg font-bold tracking-tight"><span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-accent)" }}>Ξ╳</span>oSky</span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">Beta</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
            >
              Log In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1 sm:gap-1.5 text-xs sm:text-sm"
            >
              <span className="sm:hidden">Sign Up</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative pt-28 sm:pt-32 pb-20 px-6 will-change-transform"
      >
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[300px] sm:h-[400px] bg-accent/8 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />

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
              className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05]"
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
              all in one beautifully simple app. Now in beta — built for the borderless generation.
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
                className="bg-accent text-accent-foreground hover:bg-accent/90 h-13 px-8 text-base font-semibold gap-2 rounded-xl shadow-[0_0_30px_hsl(142_71%_45%/0.3)] hover:shadow-[0_0_50px_hsl(142_71%_45%/0.4)] transition-shadow"
              >
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-13 px-8 text-base rounded-xl border-border/60 hover:border-accent/30 transition-colors"
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
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex-shrink-0"
          >
            <AppShowcase />
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Stats Bar ─── */}
      <section className="px-6 pb-16">
        <RevealSection className="max-w-4xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border bg-border"
          >
            {STATS.map((stat) => (
              <motion.div
                key={stat.label}
                variants={staggerItem}
                className="bg-card p-6 text-center group"
              >
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-accent group-hover:scale-110 transition-transform">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </RevealSection>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-6 py-20 relative">
        {/* Subtle divider gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="max-w-4xl mx-auto">
          <RevealSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-6">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">How It Works</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Up and running in{" "}
              <span className="text-accent">minutes</span>
            </h2>
          </RevealSection>

          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <RevealSection key={item.step} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className="relative group cursor-default"
                >
                  <div className="text-5xl font-black text-accent/10 group-hover:text-accent/25 transition-colors duration-300 mb-4">
                    {item.step}
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-accent" />
                  </motion.div>
                  <h3 className="text-base font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className="hidden sm:block absolute top-8 -right-3 w-6"
                    >
                      <ChevronRight className="w-5 h-5 text-border" />
                    </motion.div>
                  )}
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="px-6 py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Everything you need.{" "}
              <span className="text-muted-foreground">Nothing you don't.</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              From everyday spending to building wealth — Ξ╳oSky replaces your bank, broker, and payment apps.
            </p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
                className={`group relative rounded-2xl border border-border bg-gradient-to-br ${feature.gradient} p-6 hover:border-accent/30 hover:shadow-[0_8px_30px_-12px_hsl(var(--accent)/0.15)] transition-all duration-300 cursor-default`}
              >
                <motion.div
                  whileHover={{ scale: 1.15, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors"
                >
                  <feature.icon className="w-5 h-5 text-accent" />
                </motion.div>
                <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Welcome Bonus CTA ─── */}
      <section className="px-6 py-20">
        <RevealSection className="max-w-4xl mx-auto">
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
                  className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl shadow-[0_0_40px_hsl(142_71%_45%/0.25)] hover:shadow-[0_0_60px_hsl(142_71%_45%/0.35)] transition-shadow"
                >
                  Claim Your $25 <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <motion.div
                whileHover={{ scale: 1.08, rotate: 3 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-48 h-48 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center"
              >
                <div className="text-center">
                  <motion.p
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="text-5xl font-black text-accent"
                  >
                    $25
                  </motion.p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Welcome Bonus</p>
                </div>
              </motion.div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ─── APY Section ─── */}
      <section className="px-6 py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="max-w-4xl mx-auto text-center">
          <RevealSection>
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
          </RevealSection>

          <RevealSection delay={0.15}>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-10 grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border max-w-lg mx-auto"
            >
              {[
                { amount: "$1,000", earnings: "$60/yr" },
                { amount: "$10,000", earnings: "$600/yr" },
                { amount: "$100,000", earnings: "$6,000/yr" },
              ].map((tier) => (
                <motion.div
                  key={tier.amount}
                  variants={staggerItem}
                  className="bg-card p-5 text-center group"
                >
                  <p className="text-xs text-muted-foreground">Save {tier.amount}</p>
                  <p className="text-lg font-bold text-warning mt-1 group-hover:scale-110 transition-transform">{tier.earnings}</p>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="px-6 py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="max-w-3xl mx-auto">
          <RevealSection className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <BarChart3 className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">Side by Side</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Ξ╳oSky vs. Traditional Banks
            </h2>
            <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
              See why thousands are making the switch.
            </p>
          </RevealSection>

          <RevealSection delay={0.1}>
            <div className="rounded-2xl border border-border overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-3 bg-secondary/50">
                <div className="p-4 sm:p-5 text-sm font-semibold text-muted-foreground">Feature</div>
                <div className="p-4 sm:p-5 text-center">
                  <span className="text-sm font-bold text-accent">Ξ╳oSky</span>
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
              ].map((row) => (
                <div
                  key={row.feature}
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
                </div>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={0.25} className="mt-8 text-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl hover:shadow-[0_0_30px_hsl(142_71%_45%/0.25)] transition-shadow"
            >
              Switch to Ξ╳oSky <ArrowRight className="w-4 h-4" />
            </Button>
          </RevealSection>
        </div>
      </section>

      {/* ─── Private Beta Access ─── */}
      <section className="px-6 py-28 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <div className="relative rounded-3xl overflow-hidden border border-accent/15 p-10 sm:p-16 text-center">
              {/* Layered glow effects */}
              <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] via-transparent to-accent/[0.06]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/[0.06] rounded-full blur-[120px]" />
              <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent/[0.04] rounded-full blur-[80px]" />

              <div className="relative">
                {/* Exclusive badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-8"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[11px] font-semibold text-accent tracking-wider uppercase">Private Beta</span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
                >
                  Ξ╳oSky is currently in
                  <br />
                  <span className="text-accent">private beta.</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mt-5 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed"
                >
                  Request access to the next generation financial&nbsp;network.
                </motion.p>

                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const emailInput = form.elements.namedItem("waitlist-email") as HTMLInputElement;
                    const email = emailInput.value.trim();
                    if (!email) return;

                    const { error } = await supabase.from("waitlist").insert({ email });
                    if (error) {
                      if (error.code === "23505") {
                        toast.info("You're already on the waitlist!");
                      } else {
                        toast.error("Something went wrong. Please try again.");
                      }
                    } else {
                      toast.success("You're on the list! We'll be in touch soon.");
                      emailInput.value = "";
                      setWaitlistCount((prev) => prev + 1);
                    }
                  }}
                  className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
                >
                  <Input
                    name="waitlist-email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    className="h-12 bg-background/50 border-border/50 rounded-xl text-center sm:text-left backdrop-blur-sm focus:border-accent/40 transition-colors"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl shadow-[0_0_50px_hsl(142_71%_45%/0.2)] hover:shadow-[0_0_70px_hsl(142_71%_45%/0.3)] transition-shadow shrink-0 px-6"
                  >
                    Request Access <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.form>

                {waitlistCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="text-sm text-accent/80 font-medium mt-5 flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {waitlistCount.toLocaleString()}+ people ahead of you
                  </motion.p>
                )}
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="text-[11px] text-muted-foreground/60 mt-3 tracking-wide"
                >
                  Invite-only · Limited spots · $25 welcome bonus for beta testers
                </motion.p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />

        <div className="max-w-2xl mx-auto">
          <RevealSection className="text-center mb-12">
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
          </RevealSection>

          <RevealSection delay={0.1}>
            <Accordion type="single" collapsible className="space-y-2">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border rounded-xl px-5 data-[state=open]:bg-secondary/30 transition-colors hover:border-accent/20"
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
          </RevealSection>
        </div>
      </section>

      {/* ─── Trust Section ─── */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12"
            >
              {TRUST_BADGES.map((badge) => (
                <motion.div
                  key={badge.label}
                  variants={staggerItem}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-3 cursor-default"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <badge.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{badge.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-6 py-20 pb-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />
        {/* Background glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center relative">
          <RevealSection>
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
              className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 h-14 px-10 text-base font-semibold gap-2 rounded-xl shadow-[0_0_40px_hsl(142_71%_45%/0.3)] hover:shadow-[0_0_60px_hsl(142_71%_45%/0.4)] hover:scale-105 transition-all"
            >
              Create Your Free Account <ArrowRight className="w-5 h-5" />
            </Button>
          </RevealSection>
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
                <span className="text-base font-bold"><span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-accent)" }}>Ξ╳</span>oSky</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The everything finance app. Banking, crypto, stocks, and global payments in one place.
              </p>
              <div className="flex items-center gap-3 mt-5">
                {[
                  { icon: Twitter, href: "#" },
                  { icon: Github, href: "#" },
                  { icon: Mail, href: "mailto:support@exosky.app" },
                ].map(({ icon: Icon, href }) => (
                  <motion.a
                    key={href}
                    href={href}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent/10 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.a>
                ))}
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
              © {new Date().getFullYear()} Ξ╳oSky Inc. All rights reserved. Ξ╳oSky is not a bank. Banking services provided by partner institutions.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/disclosures" className="hover:text-foreground transition-colors">Disclosures</a>
            </div>
          </div>
        </div>
      </footer>
      {/* ─── Scroll to Top ─── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={showScrollTop ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center group ${!showScrollTop ? "pointer-events-none" : ""}`}
        aria-label="Scroll to top"
      >
        {/* Progress ring */}
        <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.3" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - scrollProgress)}`}
            className="transition-all duration-150"
          />
        </svg>
        {/* Inner pill */}
        <div className="w-9 h-9 rounded-full bg-accent/15 backdrop-blur-sm border border-accent/30 flex items-center justify-center group-hover:bg-accent/25 group-hover:border-accent/50 transition-all duration-200">
          <ArrowUp className="w-4 h-4 text-accent group-hover:-translate-y-0.5 transition-transform duration-200" />
        </div>
      </motion.button>
    </div>
  );
}
