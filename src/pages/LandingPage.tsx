import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
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
import { FEATURES, STATS, TRUST_BADGES, HOW_IT_WORKS, FAQS } from "@/pages/landingContent";

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

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1 sm:gap-1.5 text-xs sm:text-sm">
              <span className="sm:hidden">Sign Up</span>
              <span className="hidden sm:inline">Get Started</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      <motion.section
        ref={heroRef}
        style={prefersReducedMotion ? undefined : { opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative pt-24 sm:pt-28 pb-14 px-6 will-change-transform"
      >
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[400px] sm:w-[620px] h-[280px] sm:h-[380px] bg-accent/[0.07] rounded-full blur-[100px] sm:blur-[130px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-14">
          <div className="flex-1 text-center lg:text-left lg:pt-6">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-6">
              <Gift className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">Get $25 when you sign up. No deposit required.</span>
            </motion.div>
            <motion.h1 custom={1} initial="hidden" animate="visible" variants={fadeUp} className="text-display-xl">
              The future of
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-accent)" }}>money is here</span>
            </motion.h1>
            <motion.p custom={2} initial="hidden" animate="visible" variants={fadeUp} className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Wallet, markets, savings, cards, and global send in one app.
              Now in beta: paper balances, live market data, real product feel.
            </motion.p>
            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-7 text-sm font-semibold gap-2 rounded-xl shadow-accent hover:shadow-accent-strong hover:-translate-y-0.5 transition-all">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="h-12 px-7 text-sm rounded-xl border-border/60 hover:border-accent/30 hover:-translate-y-0.5 transition-all">
                See What&apos;s Inside
              </Button>
            </motion.div>
            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="mt-7 flex items-center justify-center lg:justify-start gap-5 flex-wrap">
              {["Encrypted by design", "Live markets", "Demo-friendly beta"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-muted-foreground font-medium">{item}</span>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} className="relative flex-shrink-0">
            <AppShowcase />
          </motion.div>
        </div>
      </motion.section>

      <section className="border-y border-border/60 bg-card/30">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/60">
          {STATS.map((stat) => (
            <motion.div key={stat.label} variants={staggerItem} className="px-6 py-7 text-center">
              <p className="text-display-md text-accent">{stat.value}</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1.5 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 py-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />
        <div className="max-w-4xl mx-auto">
          <RevealSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-6">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">How It Works</span>
            </div>
            <h2 className="text-display-lg">Up and running in <span className="text-accent">minutes</span></h2>
          </RevealSection>
          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <RevealSection key={item.step} delay={i * 0.12}>
                <motion.div whileHover={{ y: -6, transition: { duration: 0.25 } }} className="relative group cursor-default">
                  <div className="text-5xl font-black text-accent/10 group-hover:text-accent/25 transition-colors duration-300 mb-4">{item.step}</div>
                  <motion.div whileHover={{ scale: 1.1, rotate: 3 }} transition={{ type: "spring", stiffness: 400 }} className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="w-5 h-5 text-accent" />
                  </motion.div>
                  <h3 className="text-base font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden sm:block absolute top-8 -right-3 w-6">
                      <ChevronRight className="w-5 h-5 text-border" />
                    </div>
                  )}
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-border to-transparent" />
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-display-lg">Everything you need. <span className="text-muted-foreground">Nothing you don&apos;t.</span></h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              From everyday balances to markets and send. One product path instead of three separate apps.
            </p>
          </RevealSection>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <motion.div key={feature.title} variants={staggerItem} whileHover={{ y: -4 }} className="p-6 rounded-2xl border border-border bg-card/50 hover:border-accent/20 transition-colors">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-bold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-20 border-t border-border/60">
        <div className="max-w-3xl mx-auto text-center">
          <RevealSection>
            <h2 className="text-display-lg mb-4">Try the beta</h2>
            <p className="text-muted-foreground mb-8">
              No deposit required. No strings attached. Explore with paper balances and live markets.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl">
              Create free account <ArrowRight className="w-4 h-4" />
            </Button>
          </RevealSection>
        </div>
      </section>

      <section className="px-6 py-24 border-t border-border/60">
        <div className="max-w-3xl mx-auto">
          <RevealSection className="text-center mb-10">
            <h2 className="text-display-lg">FAQ</h2>
          </RevealSection>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-border/60">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-muted-foreground">
              <badge.icon className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Ξ╳oSky. Demo beta. Not a bank. No real deposits in this version.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/disclosures" className="hover:text-foreground transition-colors">Disclosures</a>
            </div>
          </div>
        </div>
      </footer>

      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={showScrollTop ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center ${!showScrollTop ? "pointer-events-none" : ""}`}
        aria-label="Scroll to top"
      >
        <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
          <ArrowUp className="w-4 h-4 text-accent" />
        </div>
      </motion.button>
    </div>
  );
}
