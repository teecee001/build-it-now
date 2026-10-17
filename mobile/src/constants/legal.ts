// Copied verbatim from src/pages/TermsOfService.tsx and src/pages/PrivacyPolicy.tsx; keep in sync.

export const TERMS_SECTIONS: { title: string; content: string | null; list?: string[] }[] = [
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
      content: `You must provide accurate, current, and complete information during registration, including your country of residence and phone number matching your declared country. You are responsible for maintaining the confidentiality of your credentials. Ξ╳oSky performs continuous location verification. If your location is found inconsistent with your registered country, access may be restricted pending re-verification.`,
    },
    {
      title: "4. Country-Specific Feature Availability",
      content: `Feature availability varies by country due to local regulations. Features including cryptocurrency trading, stock trading, forex, money transfers, bill payments, cards, savings, and premium services may be enabled or disabled based on your verified country. Ξ╳oSky reserves the right to modify feature availability at any time to comply with changing regulations. You agree to use only features authorized in your jurisdiction.`,
    },
    {
      title: "5. Financial Services",
      content: `Ξ╳oSky is not a bank and does not currently provide insured deposits or banking services through a partner institution. Wallet balances are an internal ledger. Peer transfers move that ledger only.`,
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
      content: `You may not use Ξ╳oSky for: illegal activities; money laundering or terrorist financing; fraud or misrepresentation; circumventing geographic restrictions or sanctions; using VPNs or location-spoofing tools; creating accounts under false identities; exploiting the platform for unauthorized purposes; or any activity that violates applicable laws in your jurisdiction. We reserve the right to freeze, restrict, or close accounts suspected of prohibited activities and report to relevant authorities.`,
    },
    {
      title: "9. Intellectual Property",
      content: `All content, trademarks, logos, and intellectual property displayed on Ξ╳oSky are owned by Ξ╳oSky Inc. or its licensors. You may not copy, modify, distribute, or create derivative works from any Ξ╳oSky content without prior written consent. Your use of the Service does not grant you any ownership rights in our intellectual property.`,
    },
    {
      title: "10. Termination",
      content: `We may suspend or terminate your account at any time for violation of these Terms, regulatory requirements, or suspected fraudulent activity. Upon termination, you must cease all use of the Service. Any remaining balance will be handled according to applicable laws and our account closure procedures, which may include a holding period required by local regulations.`,
    },
    {
      title: "11. Limitation of Liability",
      content: `To the maximum extent permitted by applicable law, Ξ╳oSky Inc. and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the fees you paid in the 12 months preceding the claim. Some jurisdictions do not allow limitation of liability, so these limitations may not apply to you.`,
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
      content: `For questions about these Terms, contact us at legal@exosky.app or Ξ╳oSky Inc., 1355 Market Street, San Francisco, CA 94103, USA.`,
    },
  ];

export const PRIVACY_SECTIONS: { title: string; content: string | null; list?: string[] }[] = [
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

// Copied verbatim from src/pages/ComplianceDisclosures.tsx (icon = lucide name, mapped natively).
export const COMPLIANCE_BADGES = [
    { icon: 'Building2', title: "Regulated Partners", desc: "Financial services provided through licensed and regulated banking partners in each jurisdiction" },
    { icon: 'Shield', title: "AML/CTF Compliant", desc: "Full compliance with anti-money laundering and counter-terrorism financing regulations globally" },
    { icon: 'Globe', title: "Multi-Jurisdiction", desc: "Operating across 90+ countries with country-specific regulatory compliance and feature availability" },
    { icon: 'Scale', title: "Identity", desc: "Identity verification is not available yet. Completing a screen does not verify you." },
    { icon: 'MapPin', title: "Geo-Enforced", desc: "Continuous location verification prevents unauthorized access from restricted regions" },
    { icon: 'FileCheck', title: "SOC 2 Type II", desc: "Infrastructure meets SOC 2 Type II security, availability, and confidentiality standards" },
    { icon: 'Ban', title: "Sanctions Enforced", desc: "Full OFAC, EU, and UN sanctions screening on all users and transactions" },
    { icon: 'Eye', title: "Transaction Monitoring", desc: "Real-time monitoring of all transactions for suspicious activity and regulatory compliance" },
  ] as const;

export const COMPLIANCE_SECTIONS: { title: string; content: string | null; list?: string[] }[] = [
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
      content: `Ξ╳oSky is not a bank and does not currently provide banking services through a partner institution. Balances are an internal ledger. They are not FDIC, FSCS, or otherwise deposit-insured.`,
    },
    {
      title: "Anti-Money Laundering (AML)",
      content: `Ξ╳oSky maintains a comprehensive global AML compliance program aligned with FATF recommendations and local regulations including the US Bank Secrecy Act (BSA), EU Anti-Money Laundering Directives (AMLD), UK Money Laundering Regulations, and equivalent frameworks in all operating jurisdictions. Our program includes: Customer Identification Program (CIP), Customer Due Diligence (CDD) and Enhanced Due Diligence (EDD), ongoing transaction monitoring and screening, Suspicious Activity Report (SAR/STR) filing, and regular independent audits.`,
    },
    {
      title: "Know Your Customer (KYC) & Identity Verification",
      content: `Identity document collection and a KYC review are not available yet. ExoSky does not collect a Social Security number, a government ID, or a selfie, and an account is not identity-verified by completing a screen in the app.`,
    },
    {
      title: "OFAC & International Sanctions Compliance",
      content: `Ξ╳oSky screens all users and transactions against: the US OFAC Specially Designated Nationals (SDN) list, EU Consolidated Sanctions List, UN Security Council Consolidated List, UK HM Treasury Financial Sanctions List, and applicable national sanctions lists in operating jurisdictions. Transactions involving sanctioned entities, individuals, or jurisdictions are automatically blocked. False positives are reviewed by our compliance team within 24 hours.`,
    },
    {
      title: "Country-Specific Regulatory Notes",
      content: `United States: Services provided through FinCEN-registered MSB and state-licensed partners. Regulation E protections apply to electronic transfers. · European Union/EEA: Services comply with PSD2, AMLD6, and MiFID II where applicable. GDPR governs data processing. · United Kingdom: Compliant with FCA regulations and UK Money Laundering Regulations. · Other Jurisdictions: Ξ╳oSky complies with local financial regulations in each country of operation. Specific regulatory disclosures are available in your account based on your verified country.`,
    },
    {
      title: "Transaction Limits & Reporting",
      content: `Transaction limits vary by country and account tier to comply with local regulations. Currency Transaction Reports (CTRs) are filed for transactions exceeding applicable thresholds (e.g., $10,000 in the US). Cross-border transfers may be subject to additional reporting requirements. Your current limits are displayed in your account settings and may be increased through enhanced verification.`,
    },
    {
      title: "Interest Rate & Investment Disclosures",
      content: `Savings interest is not paid. Any percentage shown on a savings chart is an illustration, not a rate you earn. Cryptocurrency and stock features inside the app are simulated ledger trades, not a brokerage, and can show losses. Ξ╳oSky does not provide investment advice.`,
    },
    {
      title: "Complaints & Dispute Resolution",
      content: `Contact compliance@exosky.app for compliance inquiries or complaints. US users may file complaints with the CFPB (consumerfinance.gov) or their state financial regulator. EU users may contact their national competent authority or use the EU Online Dispute Resolution platform. UK users may escalate unresolved complaints to the Financial Ombudsman Service. Response times comply with local regulatory requirements (typically 15–30 business days).`,
    },
  ];
