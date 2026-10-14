import { EASE, DUR } from "@/lib/motion";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BetaFeedback } from "@/components/BetaFeedback";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { 
  LayoutDashboard, Wallet, Send, TrendingUp, Target, Bot, LogOut, X,
  Menu, CreditCard, Gift, Activity, Landmark, Receipt, Shield, PiggyBank, Users, Crown, Settings, QrCode, Briefcase,
  FileText, Lock, Scale, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExoLogo } from "@/components/ExoLogo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Suspense, useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { OPEN_MENU_EVENT } from "@/lib/appMenu";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* Exo Intelligence nav */
const NAV_ITEMS = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Account" },
  { path: "/wallet", icon: Wallet, label: "Crypto" },
  { path: "/stocks", icon: Briefcase, label: "Stocks" },
  { path: "/send", icon: Send, label: "Send" },
  { path: "/qr", icon: QrCode, label: "QR Pay" },
  { path: "/deposit", icon: Landmark, label: "Deposit" },
  { path: "/activity", icon: Activity, label: "Activity" },
  { path: "/savings", icon: PiggyBank, label: "Savings" },
  { path: "/rewards", icon: Gift, label: "Rewards" },
  { path: "/card", icon: CreditCard, label: "Card" },
  { path: "/bills", icon: Receipt, label: "Bills" },
  { path: "/markets", icon: TrendingUp, label: "Markets" },
  { path: "/forecasts", icon: Target, label: "Forecasts" },
  { path: "/referrals", icon: Users, label: "Refer & Earn" },
  { path: "/advisor", icon: Bot, label: "Exo" },
  { path: "/premium", icon: Crown, label: "Pro" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const TAB_PATHS = ["/dashboard", "/wallet", "/send", "/activity"];
const TAB_ITEMS = TAB_PATHS.map((p) => NAV_ITEMS.find((i) => i.path === p)!);

/* Menu sections (labels reuse NAV_ITEMS; section titles are short neutral headings). */
const MENU_SECTIONS: { title?: string; paths: string[] }[] = [
  { paths: ["/dashboard", "/activity", "/advisor"] },
  { title: "Money", paths: ["/send", "/qr", "/deposit", "/savings", "/card", "/bills"] },
  { title: "Invest", paths: ["/wallet", "/stocks", "/markets", "/forecasts"] },
  { title: "More", paths: ["/rewards", "/referrals", "/premium", "/settings"] },
];
const SECTIONS = MENU_SECTIONS.map((sec) => ({
  title: sec.title,
  items: sec.paths.map((p) => NAV_ITEMS.find((i) => i.path === p)!).filter(Boolean),
}));

export function AppLayout() {
  const location = useLocation();
  // Start each page at the top (the document is the scroller on mobile).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, open);
    return () => window.removeEventListener(OPEN_MENU_EVENT, open);
  }, []);

  const { profile } = useProfile();
  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  // Mobile: the document itself scrolls (min-h 100dvh). A 100vh (h-screen) shell with
  // overflow-hidden is taller than the visible area on iOS Safari/PWA, which hid the bottom
  // of every page. Desktop keeps the fixed-height shell with a scrolling <main>.
  return (
    <div className="flex min-h-[100dvh] bg-background md:h-screen md:min-h-0 md:overflow-hidden">
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: DUR.slow, ease: EASE }}
        className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 p-4"
      >
        <div className="flex items-center justify-between px-3 py-4 mb-6">
          <ExoLogo size="md" variant="word" />
          <ThemeToggle />
          <NotificationBell />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {SECTIONS.map((sec, si) => (
            <div key={si} className={si ? "pt-3" : ""}>
              {sec.title && (
                <p className="px-3 pb-1 text-caption font-semibold uppercase tracking-wider text-muted-foreground/70">{sec.title}</p>
              )}
              {sec.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-secondary"
                        transition={{ duration: DUR.base, ease: EASE }}
                      />
                    )}
                    <item.icon className="relative w-4 h-4 transition-transform duration-fast group-hover:translate-x-0.5" />
                    <span className="relative">{item.label}</span>
                  </button>
                );
              })}
              {sec.title === "More" && (
                <button
                  onClick={() => setFeedbackOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Feedback
                </button>
              )}
            </div>
          ))}
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-1",
                location.pathname === "/admin"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          )}
        </nav>

        <div className="px-3 py-2 border-t border-border space-y-1">
          <button onClick={() => navigate("/terms")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <FileText className="w-3.5 h-3.5" />
            Terms of Service
          </button>
          <button onClick={() => navigate("/privacy")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <Lock className="w-3.5 h-3.5" />
            Privacy Policy
          </button>
          <button onClick={() => navigate("/compliance")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <Scale className="w-3.5 h-3.5" />
            Compliance
          </button>
        </div>

        <div className="border-t border-border pt-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{handle}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      <div className="app-chrome md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/80 backdrop-blur-xl border-b border-border">
        <ExoLogo size="md" variant="word" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="app-chrome md:hidden fixed inset-x-0 top-[calc(52px+env(safe-area-inset-top))] bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 bg-card border-b border-border p-4 space-y-1 overflow-y-auto overscroll-contain"
          >
            {SECTIONS.map((sec, si) => (
              <div key={si} className={si ? "pt-3" : ""}>
                {sec.title && (
                  <p className="px-3 pb-1.5 text-caption font-semibold uppercase tracking-wider text-muted-foreground/70">{sec.title}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {sec.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-card text-sm font-medium transition-all",
                          isActive ? "bg-accent/10 text-accent" : "bg-secondary/40 text-foreground/90"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                  {sec.title === "More" && (
                    <button
                      onClick={() => { setFeedbackOpen(true); setMobileOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-card text-sm font-medium bg-secondary/40 text-foreground/90"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate">Feedback</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isAdmin && (
              <button
                onClick={() => { navigate("/admin"); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <button onClick={() => { navigate("/terms"); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                Terms of Service
              </button>
              <button onClick={() => { navigate("/privacy"); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                Privacy Policy
              </button>
              <button onClick={() => { navigate("/compliance"); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground">
                <Scale className="w-3.5 h-3.5" />
                Compliance
              </button>
            </div>
            <button
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-destructive mt-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 md:overflow-y-auto md:overscroll-none md:pt-0 pt-[calc(52px+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Suspense
            fallback={<PageSkeleton />}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : DUR.fast, ease: EASE }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>

      <BetaFeedback open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <OnboardingTutorial />

      {/* Mobile bottom tab bar (existing nav labels); Menu opens the existing menu sheet. */}
      <nav
        aria-label="Primary"
        className="app-chrome md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          {TAB_ITEMS.map((item) => {
            const isActive = !mobileOpen && location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-caption font-medium transition-colors active:scale-95",
                  isActive ? "text-accent" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-caption font-medium transition-colors active:scale-95",
              mobileOpen ? "text-accent" : "text-muted-foreground"
            )}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            Menu
          </button>
        </div>
      </nav>
    </div>
  );
}
