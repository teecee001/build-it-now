import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { M3_EMPHASIZED } from "@/lib/motion";

const MENU_LINKS: { label: string; href: string }[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Markets", href: "/auth" },
  { label: "Get started", href: "/auth" },
  { label: "Log In", href: "/auth" },
];

const EASE = [...M3_EMPHASIZED] as [number, number, number, number];

export function LandingHeader() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const dy = y - lastY.current;
      if (y < 64) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the menu is open; Escape closes overlays.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setLangOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dur = reduce ? 0 : 0.3;
  const show = !hidden || menuOpen || langOpen;

  const go = (href: string) => {
    setMenuOpen(false);
    if (href.startsWith("#")) {
      // wait for body scroll unlock before jumping to the anchor
      requestAnimationFrame(() =>
        document.querySelector(href)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }),
      );
    } else navigate(href);
  };

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: show ? 0 : "-100%" }}
        transition={{ duration: show ? dur : reduce ? 0 : 0.2, ease: EASE }}
        className={[
          "fixed top-0 inset-x-0 z-50 transition-[height,background-color,border-color] duration-300",
          "[transition-timing-function:cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none border-b",
          scrolled && !menuOpen
            ? "h-[52px] bg-black/70 backdrop-blur-xl border-accent/40"
            : "h-16 bg-black border-transparent",
        ].join(" ")}
      >
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <a href="/" aria-label="ExoSky" className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }}>
            <span className="text-lg font-bold tracking-tight text-white">
              <span className="bg-clip-text text-transparent exo-breathe" style={{ backgroundImage: "var(--gradient-accent)" }}>
                Ξ╳
              </span>
              oSky
            </span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
              Beta
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Language"
              aria-expanded={langOpen}
              onClick={() => setLangOpen((v) => !v)}
              className="w-9 h-9 rounded-full border border-accent/40 text-accent flex items-center justify-center hover:bg-accent/10 transition-colors"
            >
              <Globe className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="h-9 px-4 rounded-full bg-accent text-accent-foreground text-sm font-semibold flex items-center gap-1 hover:bg-accent/90 transition-colors"
            >
              Sign Up
              <ArrowRight className="w-3.5 h-3.5 hidden sm:block" />
            </button>
            <button
              type="button"
              aria-label={menuOpen ? "Close" : "Menu"}
              aria-expanded={menuOpen}
              onClick={() => { setLangOpen(false); setMenuOpen((v) => !v); }}
              className="h-9 w-12 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center"
            >
              <span className="relative block w-4 h-3">
                <motion.span
                  className="absolute left-0 right-0 h-[2px] rounded bg-accent"
                  initial={false}
                  animate={menuOpen ? { top: 5, rotate: 45 } : { top: 1, rotate: 0 }}
                  transition={{ duration: dur, ease: EASE }}
                />
                <motion.span
                  className="absolute left-0 right-0 h-[2px] rounded bg-accent"
                  initial={false}
                  animate={menuOpen ? { top: 5, rotate: -45 } : { top: 9, rotate: 0 }}
                  transition={{ duration: dur, ease: EASE }}
                />
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {langOpen && (
            <motion.div
              role="dialog"
              aria-label="Language"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
              className="absolute right-4 sm:right-6 top-full mt-2 w-48 rounded-2xl border border-accent/30 bg-black/90 backdrop-blur-xl p-1.5 shadow-xl"
            >
              <button
                type="button"
                onClick={() => setLangOpen(false)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-white bg-accent/10"
              >
                English
                <Check className="w-4 h-4 text-accent" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="menu"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
            className="fixed inset-0 z-40 bg-black pt-20 px-6 overflow-y-auto overscroll-contain"
          >
            <motion.nav
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.05, delayChildren: reduce ? 0 : 0.12 } } }}
              className="max-w-6xl mx-auto flex flex-col"
            >
              {MENU_LINKS.map((l) => (
                <motion.a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => { e.preventDefault(); go(l.href); }}
                  variants={{ hidden: { opacity: 0, y: reduce ? 0 : -12 }, show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.25, ease: EASE } } }}
                  className="py-4 border-b border-accent/15 text-2xl font-semibold text-white hover:text-accent transition-colors"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.div
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                className="pt-6"
              >
                <ThemeToggle />
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
