import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm mt-2">Last updated: March 8, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect information you provide directly: name, email, phone number, date of birth, Social Security Number (for identity verification), government-issued ID, and financial information. We also collect device information, IP addresses, and usage data automatically.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc pl-5">
              <li>To provide and maintain the X Money service</li>
              <li>To verify your identity and comply with KYC/AML regulations</li>
              <li>To process transactions and send related notifications</li>
              <li>To detect and prevent fraud and unauthorized access</li>
              <li>To comply with legal obligations and regulatory requirements</li>
              <li>To improve our services and develop new features</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Information Sharing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We share information with: our banking partners to provide financial services; identity verification providers for KYC compliance; law enforcement when legally required; and service providers who assist in operating our platform. We never sell your personal information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Data Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS 1.3) and at rest (AES-256), multi-factor authentication, and regular security audits. Financial data is stored in SOC 2 Type II certified facilities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active and for a minimum of 5 years after account closure, as required by federal financial regulations (Bank Secrecy Act).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the right to: access your personal data, correct inaccurate data, request deletion (subject to legal retention requirements), opt out of marketing communications, and data portability. Contact privacy@x.com to exercise these rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Cookies and Tracking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and security, and analytics cookies to improve our service. You can manage cookie preferences in your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Children's Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              X Money is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For privacy inquiries: privacy@x.com | Data Protection Officer, X Corp, 1355 Market Street, San Francisco, CA 94103.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
