import LegalShell from "./LegalShell";

const PRIVACY_SECTIONS = [
  {
    id: "scope",
    title: "Scope of this Policy",
    paragraphs: [
      "This Privacy Policy describes how DealBank collects, uses, stores, and shares personal and business information when you use the platform.",
      "It applies to web and mobile experiences, including integrated analytics, communication, contract, and payment workflows.",
    ],
  },
  {
    id: "data-collected",
    title: "Information We Collect",
    bullets: [
      "Account data: name, email, phone, company, user role, and authentication identifiers.",
      "Operational data: deal pipeline records, contracts, signatures, call logs, CRM entries, and onboarding profile details.",
      "Payment data: Stripe customer and transaction metadata, including subscription, credit purchase, and escrow references.",
      "Device and usage data: app diagnostics, request logs, and security telemetry needed for fraud prevention and reliability.",
    ],
  },
  {
    id: "how-used",
    title: "How We Use Information",
    bullets: [
      "Deliver core platform functionality and account authentication.",
      "Process billing, escrow tracking, payout releases, and fee accounting.",
      "Support collaboration features between dealmakers, contractors, and realtors.",
      "Detect abuse, enforce security controls, and investigate suspected fraud.",
      "Comply with legal obligations, audits, and lawful requests.",
    ],
  },
  {
    id: "legal-basis",
    title: "Legal Basis and Consent",
    paragraphs: [
      "Where applicable, DealBank processes personal data under contract necessity, legitimate interests, legal compliance, and user consent for optional workflows.",
      "You may withdraw consent for optional processing where available, but core service operations may still require baseline account and transaction data.",
    ],
  },
  {
    id: "sharing",
    title: "Data Sharing and Processors",
    paragraphs: [
      "DealBank uses trusted service providers to operate platform functions.",
    ],
    bullets: [
      "Supabase for database, authentication, and storage.",
      "Stripe for subscriptions, payments, escrow transactions, and payouts.",
      "Twilio and email providers for communications when enabled.",
      "Infrastructure and monitoring providers for hosting and reliability.",
    ],
  },
  {
    id: "storage-security",
    title: "Storage and Security Controls",
    bullets: [
      "Data is protected through role-based access controls and row-level security where configured.",
      "Sensitive actions require bearer-authenticated requests and server-side verification.",
      "Contract and photo uploads are controlled via bucket policies and signed URL access patterns.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "DealBank retains data for as long as needed to deliver services, satisfy legal obligations, resolve disputes, and enforce agreements.",
      "Retention windows may vary by record type, such as payment logs, contract execution records, and compliance audit trails.",
    ],
  },
  {
    id: "user-rights",
    title: "User Rights",
    bullets: [
      "Request access to your personal data.",
      "Request correction of inaccurate records.",
      "Request deletion where legally permissible.",
      "Request export of selected account data where supported.",
    ],
  },
  {
    id: "cross-border",
    title: "International Transfers",
    paragraphs: [
      "If data is transferred across regions, DealBank applies contractual and technical safeguards intended to maintain equivalent protections.",
    ],
  },
  {
    id: "children",
    title: "Children's Privacy",
    paragraphs: [
      "DealBank services are intended for business users and are not directed to children under 13.",
      "If you believe a child submitted personal data, contact us so we can investigate and remove it when required.",
    ],
  },
  {
    id: "updates",
    title: "Policy Updates",
    paragraphs: [
      "DealBank may revise this Privacy Policy from time to time. Material updates will include a revised effective date.",
      "Continued use of the platform after updates indicates acceptance of the revised policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "For privacy requests, contact support through official DealBank channels and include your account email for verification.",
    ],
  },
];

export default function PrivacyPolicyScreen({ G, btnO, onBack, onOpenTerms }) {
  return (
    <LegalShell
      G={G}
      btnO={btnO}
      title="Privacy Policy"
      subtitle="This policy explains what data DealBank handles, why it is processed, and how users can exercise privacy rights."
      effectiveDate="April 17, 2026"
      sections={PRIVACY_SECTIONS}
      onBack={onBack}
      secondaryActionLabel="Open Terms of Service"
      onSecondaryAction={onOpenTerms}
    />
  );
}
