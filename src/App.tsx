import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ActiveCurrencyProvider } from "@/hooks/useActiveCurrency";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useGeoVerification } from "@/hooks/useGeoVerification";
import { AppLayout } from "@/components/layout/AppLayout";
import { CountryOnboarding } from "@/components/CountryOnboarding";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WalletPage from "./pages/WalletPage";
import SendMoney from "./pages/SendMoney";
import Markets from "./pages/Markets";
import AIAdvisor from "./pages/AIAdvisor";
import Rewards from "./pages/Rewards";
import Activity from "./pages/Activity";
import CardPage from "./pages/CardPage";
import Deposit from "./pages/Deposit";
import BillPay from "./pages/BillPay";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ComplianceDisclosures from "./pages/ComplianceDisclosures";
import KYCVerification from "./pages/KYCVerification";
import Savings from "./pages/Savings";
import Referrals from "./pages/Referrals";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import SpendingAnalytics from "./pages/SpendingAnalytics";
import QRPayments from "./pages/QRPayments";
import RecurringPayments from "./pages/RecurringPayments";
import MultiCurrencyWallet from "./pages/MultiCurrencyWallet";
import StocksPage from "./pages/StocksPage";
import AdminWaitlist from "./pages/AdminWaitlist";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isCheckingGeo, hasCompletedGeoSetup } = useGeoVerification();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  if (isLoading || isCheckingGeo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Show country onboarding if user hasn't set up their country yet
  if (!hasCompletedGeoSetup && !onboardingComplete) {
    return <CountryOnboarding onComplete={() => setOnboardingComplete(true)} />;
  }

  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<LandingPage />} />
            {/* Public legal pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/disclosures" element={<ComplianceDisclosures />} />
            {/* Protected routes */}
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
              <Route path="/stocks" element={<StocksPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
