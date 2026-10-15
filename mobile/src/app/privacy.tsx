import { LegalPage } from '@/components/LegalPage';
import { PRIVACY_SECTIONS } from '@/constants/legal';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="Last updated: March 8, 2026 · Applies to all jurisdictions"
      lead="Your privacy matters."
      leadRest="Ξ╳oSky collects location and identity data to comply with international financial regulations. This policy explains what we collect, why, and your rights. We comply with GDPR, CCPA, LGPD, POPIA, and other applicable data protection laws."
      sections={PRIVACY_SECTIONS}
    />
  );
}
