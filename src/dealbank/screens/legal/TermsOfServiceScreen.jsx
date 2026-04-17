import LegalShell from "./LegalShell";

const TERMS_SECTIONS = [
  {
    id: "acceptance",
    title: "Acceptance and Scope",
    paragraphs: [
      "By using DealBank, you agree to these Terms of Service and all applicable laws. If you do not agree, do not use the platform.",
      "DealBank provides software workflows for real estate operators, including deal analysis, contractor coordination, listing collaboration, digital contracts, and payment operations.",
    ],
  },
  {
    id: "eligibility",
    title: "Account Eligibility and Security",
    bullets: [
      "You must provide accurate identity and business information.",
      "You are responsible for account credentials, API tokens, and any action taken using your account.",
      "You must notify DealBank immediately if unauthorized access is suspected.",
    ],
  },
  {
    id: "subscriptions",
    title: "Subscriptions and Billing",
    paragraphs: [
      "Paid plans renew automatically unless canceled before renewal. You authorize recurring charges under the selected plan.",
      "If a payment fails, DealBank may suspend premium features until payment is resolved.",
    ],
    bullets: [
      "Dealmaker plan: recurring monthly fee.",
      "Contractor plans: tiered recurring monthly fees.",
      "Credit packs: non-recurring payments with no guaranteed refund except where required by law.",
    ],
  },
  {
    id: "marketplace-fees",
    title: "Marketplace and Platform Fees",
    paragraphs: [
      "Marketplace transactions may include platform fees, such as the DealBank 1.5% close fee where stated in contracts and checkout workflows.",
      "You are responsible for confirming that all transaction terms, including assignment fees and closing obligations, are accurate before execution.",
    ],
  },
  {
    id: "escrow-connect",
    title: "Stripe Connect and Earnest Money Escrow",
    bullets: [
      "Certain flows require an active Stripe Connect account for payout recipients.",
      "Earnest money can be collected into a platform-controlled escrow transaction record.",
      "At release, DealBank may retain configured platform fee percentages and transfer the net amount to the connected payout account.",
      "You are responsible for verifying beneficiary details and close conditions before release.",
    ],
  },
  {
    id: "compliance",
    title: "Compliance, Licensing, and RESPA",
    paragraphs: [
      "You are solely responsible for complying with local, state, and federal real estate laws, including licensing and disclosure obligations.",
      "DealBank is a software platform and does not provide legal, tax, brokerage, escrow, or title agency advice.",
      "Where RESPA or similar laws apply, users must structure transactions and fee sharing in lawful forms and maintain required records.",
    ],
  },
  {
    id: "user-content",
    title: "User Data and Content",
    bullets: [
      "You retain ownership of your uploaded files and submitted data.",
      "You grant DealBank a limited license to host, process, and transmit data needed to operate the service.",
      "You must not upload unlawful, fraudulent, infringing, or malicious content.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    bullets: [
      "Do not reverse engineer, disrupt, or abuse the platform or integrated services.",
      "Do not attempt unauthorized access to other users, records, or storage buckets.",
      "Do not use DealBank for deceptive marketing, illegal lead generation, or discriminatory housing practices.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers and Liability Limits",
    paragraphs: [
      "The platform is provided as is and as available. DealBank does not guarantee uninterrupted operation, specific ROI, property outcomes, or transaction success.",
      "To the maximum extent allowed by law, DealBank is not liable for indirect or consequential losses, including lost profits, delays, failed closings, or third-party service interruptions.",
    ],
  },
  {
    id: "termination",
    title: "Suspension and Termination",
    paragraphs: [
      "DealBank may suspend or terminate access for violations of these Terms, security threats, legal requirements, or non-payment.",
      "Upon termination, provisions related to payment obligations, dispute resolution, and liability limitations survive.",
    ],
  },
  {
    id: "updates",
    title: "Changes to Terms",
    paragraphs: [
      "DealBank may update these Terms over time. Material updates will be posted with an updated effective date.",
      "Continued use of the platform after updates means you accept the revised Terms.",
    ],
  },
];

export default function TermsOfServiceScreen({ G, btnO, onBack, onOpenPrivacy }) {
  return (
    <LegalShell
      G={G}
      btnO={btnO}
      title="Terms of Service"
      subtitle="These terms govern use of DealBank services, billing, marketplace operations, and integrated payment flows."
      effectiveDate="April 17, 2026"
      sections={TERMS_SECTIONS}
      onBack={onBack}
      secondaryActionLabel="Open Privacy Policy"
      onSecondaryAction={onOpenPrivacy}
    />
  );
}
