import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@/tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ActiveCurrencyProvider } from "@/hooks/useActiveCurrency";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WalletPage from "./pages/WalletPage";
import SendMoney from "./pages/SendMoney";
import Deposit from "./pages/Deposit";
import Activity from "./pages/Activity";
import Rewards from "./pages/Rewards";
import CardPage from "./pages/CardPage";
import BillPay from "./pages/BillPay";
import Markets from "./pages/Markets";
import Forecasts from "./pages/Forecasts";
import AIAdvisor from "./pages/AIAdvisor";
import Savings from "./pages/Savings";
import Referrals from "./pages/Referrals";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import KYCVerification from "./pages/KYCVerification";
import SpendingAnalytics from "./pages/SpendingAnalytics";
import QRPayments from "./pages/QRPayments";
import RecurringPayments from "./pages/RecurringPayments";
import MultiCurrencyWallet from "./pages/MultiCurrencyWallet";
import StocksPage from "./pages/StocksPage";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ComplianceDisclosures from "./pages/ComplianceDisclosures";
import OAuthConsent from "./pages/OAuthConsent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
