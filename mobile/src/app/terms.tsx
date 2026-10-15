import { LegalPage } from '@/components/LegalPage';
import { TERMS_SECTIONS } from '@/constants/legal';

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="Last updated: March 8, 2026 · Effective globally"
      lead="Important:"
      leadRest="Ξ╳oSky operates globally with country-specific feature availability. By using our services, you agree to comply with the regulations of your verified country of residence. Geographic verification is mandatory and continuous."
      sections={TERMS_SECTIONS}
    />
  );
}
