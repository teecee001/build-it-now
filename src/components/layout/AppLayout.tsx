import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BetaFeedback } from "@/components/BetaFeedback";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { 
  LayoutDashboard, Wallet, Send, TrendingUp, Target, Bot, LogOut, X,
  Menu, CreditCard, Gift, Activity, Landmark, Receipt, Shield, PiggyBank, Users, Crown, Settings, QrCode, Briefcase,
  FileText, Lock, Scale, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExoLogo } from "@/components/ExoLogo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { profile } = useProfile();
  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 p-4">
        <div className="flex items-center justify-between px-3 py-4 mb-6">
          <ExoLogo size="md" />
          <ThemeToggle />
          <NotificationBell />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
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

        <div className="px-3 py-2 border-t border-border space-y-0.5">
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="app-chrome md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/80 backdrop-blur-xl border-b border-border">
        <ExoLogo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2" aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="app-chrome md:hidden fixed inset-x-0 top-[calc(52px+env(safe-area-inset-top))] bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 bg-card border-b border-border p-4 space-y-0.5 overflow-y-auto overscroll-contain"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => { navigate("/admin"); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
            <div className="border-t border-border pt-2 mt-2 space-y-0.5">
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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive mt-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto overscroll-none md:pt-0 pt-[calc(52px+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Suspense
            fallback={
              <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Hidden on /advisor: the floating button overlaps the chat composer's send button. */}
      {location.pathname !== "/advisor" && <BetaFeedback />}
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
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95",
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
              "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95",
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
