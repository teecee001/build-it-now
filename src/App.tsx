import { MotionConfig } from "framer-motion";
import { T } from "@/lib/motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
const LandingPage = lazy(() => import("./pages/LandingPage"));
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ActiveCurrencyProvider } from "@/hooks/useActiveCurrency";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useGeoVerification } from "@/hooks/useGeoVerification";
import { AppLayout } from "@/components/layout/AppLayout";
import { CountryOnboarding } from "@/components/CountryOnboarding";
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const SendMoney = lazy(() => import("./pages/SendMoney"));
const Markets = lazy(() => import("./pages/Markets"));
const Forecasts = lazy(() => import("./pages/Forecasts"));
const AIAdvisor = lazy(() => import("./pages/AIAdvisor"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Activity = lazy(() => import("./pages/Activity"));
const CardPage = lazy(() => import("./pages/CardPage"));
const Deposit = lazy(() => import("./pages/Deposit"));
const BillPay = lazy(() => import("./pages/BillPay"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ComplianceDisclosures = lazy(() => import("./pages/ComplianceDisclosures"));
const KYCVerification = lazy(() => import("./pages/KYCVerification"));
const Savings = lazy(() => import("./pages/Savings"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Premium = lazy(() => import("./pages/Premium"));
const Settings = lazy(() => import("./pages/Settings"));
const SpendingAnalytics = lazy(() => import("./pages/SpendingAnalytics"));
const QRPayments = lazy(() => import("./pages/QRPayments"));
const RecurringPayments = lazy(() => import("./pages/RecurringPayments"));
const MultiCurrencyWallet = lazy(() => import("./pages/MultiCurrencyWallet"));
const StocksPage = lazy(() => import("./pages/StocksPage"));
const Admin = lazy(() => import("./pages/Admin"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { Loader2 } from "lucide-react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { lazy, Suspense, useState } from "react";

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="max-w-6xl mx-auto p-4 md:p-8 pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-8">
    <PageSkeleton />
  </div>
);

const BYPASS_AUTH = false;

function ProtectedRoute({
  children,
  skipOnboarding = false,
}: {
  children: React.ReactNode;
  skipOnboarding?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const { isCheckingGeo, hasCompletedGeoSetup } = useGeoVerification();
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (isLoading || isCheckingGeo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!BYPASS_AUTH && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!skipOnboarding && user && !hasCompletedGeoSetup && showOnboarding) {
    return (
      <CountryOnboarding
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return <>{children}</>;
}

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="exosky-theme">
    <MotionConfig reducedMotion="user" transition={T}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/oauth/consent" element={<OAuthConsent />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/disclosures" element={<ComplianceDisclosures />} />
              <Route path="/compliance" element={<ComplianceDisclosures />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute skipOnboarding>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <ActiveCurrencyProvider>
                      <AppLayout />
                    </ActiveCurrencyProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/send" element={<SendMoney />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/card" element={<CardPage />} />
                <Route path="/bills" element={<BillPay />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/forecasts" element={<Forecasts />} />
                <Route path="/advisor" element={<AIAdvisor />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/verify" element={<KYCVerification />} />
                <Route path="/analytics" element={<SpendingAnalytics />} />
                <Route path="/qr" element={<QRPayments />} />
                <Route path="/qr/pay" element={<QRPayments />} />
                <Route path="/recurring" element={<RecurringPayments />} />
                <Route path="/currencies" element={<MultiCurrencyWallet />} />
                <Route path="/convert" element={<MultiCurrencyWallet />} />
                <Route path="/stocks" element={<StocksPage />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </MotionConfig>
  </ThemeProvider>
);

export default App;
