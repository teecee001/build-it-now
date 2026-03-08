import { motion } from "framer-motion";
import { ArrowLeft, Shield, Building2, Scale, FileCheck, Globe, MapPin, Ban, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function ComplianceDisclosures() {
  const navigate = useNavigate();

  const badges = [
    { icon: Building2, title: "Regulated Partners", desc: "Financial services provided through licensed and regulated banking partners in each jurisdiction" },
    { icon: Shield, title: "AML/CTF Compliant", desc: "Full compliance with anti-money laundering and counter-terrorism financing regulations globally" },
    { icon: Globe, title: "Multi-Jurisdiction", desc: "Operating across 90+ countries with country-specific regulatory compliance and feature availability" },
    { icon: Scale, title: "KYC Verified", desc: "All users undergo identity and geographic verification before accessing financial services" },
    { icon: MapPin, title: "Geo-Enforced", desc: "Continuous location verification prevents unauthorized access from restricted regions" },
    { icon: FileCheck, title: "SOC 2 Type II", desc: "Infrastructure meets SOC 2 Type II security, availability, and confidentiality standards" },
    { icon: Ban, title: "Sanctions Enforced", desc: "Full OFAC, EU, and UN sanctions screening on all users and transactions" },
    { icon: Eye, title: "Transaction Monitoring", desc: "Real-time monitoring of all transactions for suspicious activity and regulatory compliance" },
  ];

  const sections = [
    {
      title: "Geographic Compliance & Feature Restrictions",
      content: `Ξ╳oSky enforces strict geographic compliance. Feature availability is determined by your verified country of residence and local regulations. This includes but is not limited to: cryptocurrency trading restrictions, stock market access, foreign exchange limitations, money transfer corridors, card issuance eligibility, and savings product availability. Users may only access features authorized in their jurisdiction. Geographic verification is performed using IP geolocation, device location, and phone number validation. The use of VPNs, proxies, or any location-spoofing technology to bypass geographic restrictions is a violation of our Terms and applicable law, and will result in immediate account suspension.`,
    },
    {
      title: "Sanctioned Countries & Territories",
      content: `Ξ╳oSky services are not available in countries or territories subject to comprehensive sanctions by the United States (OFAC), European Union, United Nations, or other applicable bodies. This includes but is not limited to: North Korea (DPRK), Iran, Syria, Cuba, Afghanistan, and the Crimea, Donetsk, and Luhansk regions. Attempting to access Ξ╳oSky from a sanctioned jurisdiction will result in account blocking and may be reported to relevant authorities.`,
    },
    {
      title: "Banking Relationships",
      content: `Ξ╳oSky is a financial technology company, not a bank. Banking services are provided by licensed partner institutions in applicable jurisdictions. Deposit insurance coverage varies by country: FDIC insurance (up to $250,000) in the United States, FSCS protection (up to £85,000) in the United Kingdom, and equivalent protections where available. Not all jurisdictions offer deposit insurance. Please verify coverage applicable to your country in your account settings.`,
    },
    {
      title: "Anti-Money Laundering (AML)",
      content: `ExoSky maintains a comprehensive global AML compliance program aligned with FATF recommendations and local regulations including the US Bank Secrecy Act (BSA), EU Anti-Money Laundering Directives (AMLD), UK Money Laundering Regulations, and equivalent frameworks in all operating jurisdictions. Our program includes: Customer Identification Program (CIP), Customer Due Diligence (CDD) and Enhanced Due Diligence (EDD), ongoing transaction monitoring and screening, Suspicious Activity Report (SAR/STR) filing, and regular independent audits.`,
    },
    {
      title: "Know Your Customer (KYC) & Identity Verification",
      content: `All users must complete multi-layer verification: (1) Country selection and phone number verification matching the declared country code, (2) Government-issued identity document verification (passport, national ID, or driver's license), (3) Continuous geographic verification via IP and device location. Enhanced due diligence is required in jurisdictions flagged as higher risk. Users who fail verification or provide fraudulent documents will be denied access and reported to authorities where required by law.`,
    },
    {
      title: "OFAC & International Sanctions Compliance",
      content: `ExoSky screens all users and transactions against: the US OFAC Specially Designated Nationals (SDN) list, EU Consolidated Sanctions List, UN Security Council Consolidated List, UK HM Treasury Financial Sanctions List, and applicable national sanctions lists in operating jurisdictions. Transactions involving sanctioned entities, individuals, or jurisdictions are automatically blocked. False positives are reviewed by our compliance team within 24 hours.`,
    },
    {
      title: "Country-Specific Regulatory Notes",
      content: `United States: Services provided through FinCEN-registered MSB and state-licensed partners. Regulation E protections apply to electronic transfers. · European Union/EEA: Services comply with PSD2, AMLD6, and MiFID II where applicable. GDPR governs data processing. · United Kingdom: Compliant with FCA regulations and UK Money Laundering Regulations. · Other Jurisdictions: ExoSky complies with local financial regulations in each country of operation. Specific regulatory disclosures are available in your account based on your verified country.`,
    },
    {
      title: "Transaction Limits & Reporting",
      content: `Transaction limits vary by country and account tier to comply with local regulations. Currency Transaction Reports (CTRs) are filed for transactions exceeding applicable thresholds (e.g., $10,000 in the US). Cross-border transfers may be subject to additional reporting requirements. Your current limits are displayed in your account settings and may be increased through enhanced verification.`,
    },
    {
      title: "Interest Rate & Investment Disclosures",
      content: `Savings APY is variable and may differ by country. Displayed rates apply to qualifying balances and may change without notice. Cryptocurrency and stock trading involve significant risk of loss. Past performance is not indicative of future results. ExoSky does not provide investment advice. Trading features are only available in jurisdictions where such services are legally permitted and properly licensed.`,
    },
    {
      title: "Complaints & Dispute Resolution",
      content: `Contact compliance@exosky.app for compliance inquiries or complaints. US users may file complaints with the CFPB (consumerfinance.gov) or their state financial regulator. EU users may contact their national competent authority or use the EU Online Dispute Resolution platform. UK users may escalate unresolved complaints to the Financial Ombudsman Service. Response times comply with local regulatory requirements (typically 15–30 business days).`,
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
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Compliance & Disclosures</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-2">Regulatory information and financial disclosures · Global operations</p>
          </div>

          <Card className="p-4 bg-muted/30 border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Regulatory Notice:</strong> ExoSky operates in 90+ countries with strict compliance to local financial regulations. Feature availability, transaction limits, and reporting requirements vary by jurisdiction. Your verified country determines which services and protections apply to your account.
            </p>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {badges.map((item) => (
              <Card key={item.title} className="p-4 bg-card border-border">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

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
