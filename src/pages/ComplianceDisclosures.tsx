import { motion } from "framer-motion";
import { ArrowLeft, Shield, Building2, Scale, FileCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function ComplianceDisclosures() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance & Disclosures</h1>
            <p className="text-muted-foreground text-sm mt-2">Regulatory information and financial disclosures</p>
          </div>

          {/* Key Disclosures */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Building2, title: "FDIC Insured", desc: "Deposits held at FDIC-insured partner banks, covered up to $250,000 per depositor" },
              { icon: Shield, title: "FinCEN Registered", desc: "Registered Money Services Business with the Financial Crimes Enforcement Network" },
              { icon: Scale, title: "State Licensed", desc: "Licensed money transmitter in applicable U.S. states through banking partners" },
              { icon: FileCheck, title: "SOC 2 Compliant", desc: "Infrastructure meets SOC 2 Type II security and availability standards" },
            ].map((item) => (
              <Card key={item.title} className="p-4 bg-card border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Banking Relationship</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ExoSky is a financial technology company, not a bank. Banking services are provided by our partner institutions. Funds held in your ExoSky wallet are deposited in pooled accounts at FDIC-insured banks. Your deposits are eligible for pass-through FDIC insurance up to $250,000 per depositor per institution.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Anti-Money Laundering (AML)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ExoSky maintains a comprehensive AML compliance program in accordance with the Bank Secrecy Act (BSA) and USA PATRIOT Act. This includes Customer Identification Program (CIP), Customer Due Diligence (CDD), ongoing transaction monitoring, and Suspicious Activity Report (SAR) filing obligations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Know Your Customer (KYC)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All users must complete identity verification before accessing financial services. We collect and verify government-issued identification, proof of address, and Social Security Number to comply with federal regulations. Enhanced due diligence is applied to high-risk accounts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">OFAC Compliance</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ExoSky screens all users and transactions against the Office of Foreign Assets Control (OFAC) Specially Designated Nationals (SDN) list and other sanctions lists. Transactions involving sanctioned entities or jurisdictions are prohibited.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Electronic Fund Transfer Act (Regulation E)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your rights regarding electronic fund transfers are protected under Regulation E. In case of unauthorized transactions, contact us immediately at support@x.com. You may be entitled to provisional credit while we investigate.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Interest Rate Disclosure</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Annual Percentage Yield (APY) advertised is variable and subject to change. The current APY of 6.00% applies to qualifying balances with direct deposit. Interest is calculated daily and paid monthly. APY may change at any time without notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Complaints</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have a complaint, contact us at compliance@x.com. If we cannot resolve your issue, you may file a complaint with the Consumer Financial Protection Bureau (CFPB) at consumerfinance.gov or your state's financial regulator.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
