import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function TermsOfService() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using Ξ╳oSky ("Service"), you agree to be bound by these Terms of Service ("Terms"). Ξ╳oSky is a global financial technology platform operated by Ξ╳oSky Inc. If you do not agree to these Terms, do not use the Service. These Terms constitute a legally binding agreement between you and Ξ╳oSky Inc.`,
    },
    {
      title: "2. Eligibility & Geographic Restrictions",
      content: `You must be at least 18 years old (or the age of majority in your jurisdiction). You must be a resident of a supported country and complete geographic verification and identity verification (KYC) before accessing financial features. Services are not available in sanctioned countries or to persons on any government sanctions list. The use of VPNs, proxies, or location-spoofing tools to circumvent geographic restrictions is strictly prohibited and will result in immediate account suspension.`,
    },
    {
      title: "3. Account Registration & Verification",
      content: `You must provide accurate, current, and complete information during registration, including your country of residence and phone number matching your declared country. You are responsible for maintaining the confidentiality of your credentials. ExoSky performs continuous location verification. If your location is found inconsistent with your registered country, access may be restricted pending re-verification.`,
    },
    {
      title: "4. Country-Specific Feature Availability",
      content: `Feature availability varies by country due to local regulations. Features including cryptocurrency trading, stock trading, forex, money transfers, bill payments, cards, savings, and premium services may be enabled or disabled based on your verified country. ExoSky reserves the right to modify feature availability at any time to comply with changing regulations. You agree to use only features authorized in your jurisdiction.`,
    },
    {
      title: "5. Financial Services",
      content: `ExoSky provides digital wallet, payment, currency conversion, and money transfer services through licensed partners in applicable jurisdictions. ExoSky is not a bank. Banking services are provided by partner financial institutions in each supported region. Deposit insurance coverage (such as FDIC in the US) depends on your country and applicable local regulations.`,
    },
    {
      title: "6. Transaction Limits",
      content: `Transaction limits (single, daily, and monthly) vary by country and account tier. These limits are enforced to comply with local anti-money laundering regulations. Enhanced KYC may be required in certain jurisdictions to access higher limits. Limits are displayed in your account settings and may be updated without prior notice to comply with regulatory changes.`,
    },
    {
      title: "7. Fees and Charges",
      content: `Most basic services are free. Premium features, currency conversions, international transfers, and certain transactions may incur fees. All applicable fees will be disclosed before you authorize a transaction. Fee structures may vary by country and are subject to local regulatory requirements. Current fee schedules are available in the app.`,
    },
    {
      title: "8. Prohibited Activities",
      content: `You may not use ExoSky for: illegal activities; money laundering or terrorist financing; fraud or misrepresentation; circumventing geographic restrictions or sanctions; using VPNs or location-spoofing tools; creating accounts under false identities; exploiting the platform for unauthorized purposes; or any activity that violates applicable laws in your jurisdiction. We reserve the right to freeze, restrict, or close accounts suspected of prohibited activities and report to relevant authorities.`,
    },
    {
      title: "9. Intellectual Property",
      content: `All content, trademarks, logos, and intellectual property displayed on ExoSky are owned by ExoSky Inc. or its licensors. You may not copy, modify, distribute, or create derivative works from any ExoSky content without prior written consent. Your use of the Service does not grant you any ownership rights in our intellectual property.`,
    },
    {
      title: "10. Termination",
      content: `We may suspend or terminate your account at any time for violation of these Terms, regulatory requirements, or suspected fraudulent activity. Upon termination, you must cease all use of the Service. Any remaining balance will be handled according to applicable laws and our account closure procedures, which may include a holding period required by local regulations.`,
    },
    {
      title: "11. Limitation of Liability",
      content: `To the maximum extent permitted by applicable law, ExoSky Inc. and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the fees you paid in the 12 months preceding the claim. Some jurisdictions do not allow limitation of liability, so these limitations may not apply to you.`,
    },
    {
      title: "12. Governing Law & Dispute Resolution",
      content: `These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law provisions. For users outside the United States, local consumer protection laws may apply. Disputes shall first be submitted to mediation, and if unresolved, to binding arbitration under the ICC Rules. Class action waivers apply to the extent permitted by your local jurisdiction.`,
    },
    {
      title: "13. Changes to Terms",
      content: `We may update these Terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use of the Service after changes become effective constitutes acceptance of the revised Terms. If you disagree with any changes, you must stop using the Service and close your account.`,
    },
    {
      title: "14. Contact",
      content: `For questions about these Terms, contact us at legal@exosky.app or ExoSky Inc., 1355 Market Street, San Francisco, CA 94103, USA.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-2">Last updated: March 8, 2026 · Effective globally</p>
          </div>

          <Card className="p-4 bg-muted/30 border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Important:</strong> ExoSky operates globally with country-specific feature availability. By using our services, you agree to comply with the regulations of your verified country of residence. Geographic verification is mandatory and continuous.
            </p>
          </Card>

          {sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
            </section>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
