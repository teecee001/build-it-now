import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Information We Collect",
      content: null,
      list: [
        "Personal identifiers: full name, email, phone number, date of birth, nationality",
        "Identity documents: government-issued ID, passport, or national ID card for KYC verification",
        "Geographic data: country of residence, IP address, device location (GPS), browser geolocation",
        "Financial information: transaction history, wallet balances, linked payment methods",
        "Device information: device type, operating system, browser, unique device identifiers",
        "Usage data: feature usage, session data, interaction logs, preferences",
      ],
    },
    {
      title: "2. How We Use Your Information",
      content: null,
      list: [
        "Provide, maintain, and improve Ξ╳oSky services",
        "Verify your identity and country of residence (KYC/AML compliance)",
        "Enforce geographic restrictions and detect VPN/proxy usage",
        "Process transactions and send related notifications",
        "Detect, prevent, and investigate fraud, unauthorized access, and policy violations",
        "Comply with legal obligations across all operating jurisdictions",
        "Determine feature availability based on your verified location",
        "Communicate service updates, security alerts, and regulatory changes",
      ],
    },
    {
      title: "3. Geographic Verification & Location Data",
      content: `Ξ╳oSky collects and processes location data to comply with international financial regulations. This includes your IP address geolocation, device GPS coordinates (with your permission), and phone number country code verification. We use this data to verify your country of residence, enforce geographic feature restrictions, detect VPN and proxy usage, and prevent sanctions evasion. Location checks are performed at registration and periodically during active sessions. You cannot opt out of location verification as it is required for regulatory compliance.`,
    },
    {
      title: "4. Information Sharing",
      content: `We share information with: licensed banking partners to provide financial services in your jurisdiction; identity verification providers for KYC compliance; regulatory authorities and law enforcement when legally required; fraud prevention services; and infrastructure providers who assist in operating our platform. We may share data across jurisdictions as necessary to provide our global service, subject to appropriate safeguards. We never sell your personal information to third parties for marketing purposes.`,
    },
    {
      title: "5. International Data Transfers",
      content: `As a global platform, your data may be transferred to and processed in countries other than your country of residence. We implement appropriate safeguards for international transfers including Standard Contractual Clauses (SCCs), adequacy decisions, and encryption. Data processing complies with GDPR for EU/EEA users, LGPD for Brazilian users, POPIA for South African users, and other applicable local data protection laws.`,
    },
    {
      title: "6. Data Security",
      content: `We implement industry-leading security measures including: encryption in transit (TLS 1.3) and at rest (AES-256); multi-factor authentication; continuous location monitoring; biometric authentication support; regular penetration testing and security audits; SOC 2 Type II certified infrastructure; real-time fraud detection and anomaly monitoring. Despite these measures, no method of electronic transmission or storage is 100% secure.`,
    },
    {
      title: "7. Data Retention",
      content: `We retain personal information for as long as your account is active and for a minimum of 5–7 years after closure, as required by financial regulations (e.g., Bank Secrecy Act in the US, Anti-Money Laundering Directives in the EU). Retention periods may vary by jurisdiction. Transaction records are retained for the legally mandated period in your country. You may request deletion of non-essential data at any time.`,
    },
    {
      title: "8. Your Rights",
      content: `Depending on your jurisdiction, you have the right to: access your personal data; correct inaccurate information; request deletion (subject to legal retention requirements); restrict or object to processing; data portability; withdraw consent; lodge a complaint with your local data protection authority. EU/EEA users have full GDPR rights. To exercise your rights, contact privacy@exosky.app. We respond within 30 days (or sooner if required by local law).`,
    },
    {
      title: "9. Cookies & Tracking",
      content: `We use: essential cookies for authentication, security, and geographic verification; functional cookies for preferences and settings; analytics cookies to improve our service (with your consent where required). You can manage non-essential cookie preferences in your browser settings. Note that blocking essential cookies may prevent you from using the Service.`,
    },
    {
      title: "10. Children's Privacy",
      content: `Ξ╳oSky is not intended for individuals under 18 years of age (or the age of majority in your jurisdiction). We do not knowingly collect personal information from minors. If we discover we have collected data from a minor, we will promptly delete it and close the associated account.`,
    },
    {
      title: "11. Changes to This Policy",
      content: `We may update this Privacy Policy to reflect changes in our practices or applicable laws. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. The "Last updated" date will be revised accordingly.`,
    },
    {
      title: "12. Contact Us",
      content: `For privacy inquiries: privacy@exosky.app · Data Protection Officer: dpo@exosky.app · Ξ╳oSky Inc., 1355 Market Street, San Francisco, CA 94103, USA. EU Representative: Ξ╳oSky EU Ltd., Dublin, Ireland.`,
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
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-2">Last updated: March 8, 2026 · Applies to all jurisdictions</p>
          </div>

          <Card className="p-4 bg-muted/30 border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Your privacy matters.</strong> ExoSky collects location and identity data to comply with international financial regulations. This policy explains what we collect, why, and your rights. We comply with GDPR, CCPA, LGPD, POPIA, and other applicable data protection laws.
            </p>
          </Card>

          {sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {s.content && <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>}
              {s.list && (
                <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-5">
                  {s.list.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
