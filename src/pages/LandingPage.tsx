import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Smartphone, ChevronRight, Check, Gift, ArrowUp, X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppShowcase } from "@/components/AppShowcase";
import { FEATURES, STATS, TRUST_BADGES, HOW_IT_WORKS, FAQS } from "@/pages/landingContent";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const COMPARE_ROWS = [
  { feature: "Try without a bank deposit", exo: true, typical: false },
  { feature: "Live market data", exo: true, typical: true },
  { feature: "Multi-currency balances", exo: true, typical: false },
  { feature: "Wallet + markets in one app", exo: true, typical: false },
  { feature: "Clear beta labeling", exo: true, typical: false },
  { feature: "Paper balances for demos", exo: true, typical: false },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <span className="text-xs font-black text-accent-foreground tracking-tighter">Ξ╳</span>
            </div>
            <span className="text-base font-bold tracking-tight">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-accent)" }}>
                Ξ╳
              </span>
              oSky
            </span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
              Beta
            </span>
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
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1 text-xs sm:text-sm"
            >
              Sign Up
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={prefersReducedMotion ? undefined : { opacity: heroOpacity, y: heroY }}
        className="relative pt-20 sm:pt-24 pb-10 px-5 will-change-transform"
      >
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[360px] sm:w-[520px] h-[240px] bg-accent/[0.07] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-5"
            >
              <Gift className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">
                Get $25 when you sign up. No deposit required.
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              The future of
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-accent)" }}
              >
                money is here
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed"
            >
              Wallet, markets, savings, cards, and global send in one app. Now in beta: paper
              balances, live market data, real product feel.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 h-11 px-6 text-sm font-semibold gap-2 rounded-xl"
              >
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full sm:w-auto h-11 px-6 text-sm rounded-xl border-border/60"
              >
                See how it works
              </Button>
            </motion.div>

            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-5 flex items-center justify-center lg:justify-start gap-4 flex-wrap"
            >
              {["Encrypted by design", "Live markets", "Demo-friendly beta"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[11px] text-muted-foreground font-medium">{item}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex-shrink-0 mx-auto lg:mx-0 scale-[0.92] sm:scale-100 origin-top"
          >
            <AppShowcase />
          </motion.div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="border-y border-border/60 bg-card/30">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={staggerItem}
              className="px-4 py-5 sm:py-6 text-center border-border/40 border-r border-b sm:border-b-0 last:border-r-0 sm:[&:nth-child(2)]:border-r even:border-r-0 sm:even:border-r"
            >
              <p className="text-2xl sm:text-3xl font-bold text-accent">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="px-5 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <RevealSection className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 mb-4">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground">How it works</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Up and running in <span className="text-accent">minutes</span>
            </h2>
          </RevealSection>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {HOW_IT_WORKS.map((item, i) => (
              <RevealSection key={item.step} delay={i * 0.08}>
                <div className="relative h-full rounded-2xl border border-border/60 bg-card/40 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono font-bold text-accent/80">{item.step}</span>
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <ChevronRight className="hidden sm:block absolute top-1/2 -right-3 w-4 h-4 text-border -translate-y-1/2" />
                  )}
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-14 sm:py-16 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Everything you need.{" "}
              <span className="text-muted-foreground">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
              From everyday balances to markets and send. One product path instead of three separate
              apps.
            </p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/40 hover:border-accent/25 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3`}
                >
                  <feature.icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <h3 className="text-sm font-bold mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Compact comparison */}
      <section className="px-5 py-14 sm:py-16 border-t border-border/50">
        <div className="max-w-2xl mx-auto">
          <RevealSection className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Why try the beta</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Built for demos, investors, and early users. Honest about what works today.
            </p>
          </RevealSection>

          <RevealSection>
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="grid grid-cols-3 bg-card/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="p-3 sm:p-4">Feature</div>
                <div className="p-3 sm:p-4 text-center text-accent">ExoSky beta</div>
                <div className="p-3 sm:p-4 text-center">Typical app</div>
              </div>
              {COMPARE_ROWS.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-3 border-t border-border/50 text-sm"
                >
                  <div className="p-3 sm:p-4 text-xs sm:text-sm font-medium">{row.feature}</div>
                  <div className="p-3 sm:p-4 flex items-center justify-center">
                    {row.exo ? (
                      <Check className="w-4 h-4 text-accent" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex items-center justify-center">
                    {row.typical ? (
                      <Check className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={0.1} className="mt-8 text-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl"
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </Button>
          </RevealSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-14 sm:py-16 border-t border-border/50">
        <div className="max-w-2xl mx-auto">
          <RevealSection className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">FAQ</h2>
          </RevealSection>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Trust + footer */}
      <section className="px-5 py-10 border-t border-border/50">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-muted-foreground">
              <badge.icon className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60 text-center sm:text-left">
            © {new Date().getFullYear()} Ξ╳oSky. Demo beta. Not a bank. No real deposits in this
            version.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="/disclosures" className="hover:text-foreground transition-colors">
              Disclosures
            </a>
          </div>
        </div>
      </footer>

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={showScrollTop ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center ${!showScrollTop ? "pointer-events-none" : ""}`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-4 h-4 text-accent" />
      </motion.button>
    </div>
  );
}
