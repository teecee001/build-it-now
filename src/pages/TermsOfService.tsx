import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground text-sm mt-2">Last updated: March 8, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using ExoSky ("Service"), you agree to be bound by these Terms of Service. ExoSky is a financial technology platform operated by ExoSky Inc. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Eligibility</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must be at least 18 years old and a resident of a jurisdiction where our services are available. You must complete identity verification (KYC) before accessing financial features. By using ExoSky, you represent that you meet these requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Account Registration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Financial Services</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ExoSky provides digital wallet, payment, and money transfer services through licensed banking partners. Deposits are held at FDIC-insured partner banks. ExoSky is not a bank. Banking services are provided by our partner financial institutions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Fees and Charges</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Most basic services are free. Premium features, currency conversions, and certain transactions may incur fees. All applicable fees will be disclosed before you authorize a transaction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Prohibited Activities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may not use ExoSky for illegal activities, money laundering, terrorist financing, fraud, or any activity that violates applicable laws and regulations. We reserve the right to freeze or close accounts suspected of prohibited activities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your use of ExoSky is also governed by our Privacy Policy. By using the Service, you consent to the collection, use, and sharing of your information as described in the Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, ExoSky Inc. and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Dispute Resolution</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, conducted in San Francisco, California.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at legal@x.com or X Corp, 1355 Market Street, San Francisco, CA 94103.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
