export const LEAD_LIST_TYPES = [
  "Absentee Owner",
  "Pre-Foreclosure",
  "Tax Delinquent",
  "Probate",
  "High Equity",
  "Vacant",
];

export const LEAD_FILTERS = [
  "All",
  "Absentee Owner",
  "Pre-Foreclosure",
  "Tax Delinquent",
  "Probate",
  "High Equity",
];

export const LEAD_SEED = [
  { id: "ld1", name: "Maria Ortega", address: "1842 Maple St, Sacramento", phone: "(916) 555-1002", equity: 182000, avm: 392000, status: "New", listType: "High Equity", tags: ["Owner Occupied", "Single Family"] },
  { id: "ld2", name: "Jason Kim", address: "908 Birchwood Dr, Stockton", phone: "(209) 555-9922", equity: 121000, avm: 314000, status: "Contacted", listType: "Absentee Owner", tags: ["Vacant", "3 bed"] },
  { id: "ld3", name: "Helen Fox", address: "4402 Elmwood Ct, Modesto", phone: "(209) 555-4411", equity: 96000, avm: 286000, status: "Follow Up", listType: "Tax Delinquent", tags: ["Needs Rehab"] },
  { id: "ld4", name: "Ramon Diaz", address: "3421 Poplar Ave, Fresno", phone: "(559) 555-0903", equity: 158000, avm: 351000, status: "New", listType: "Probate", tags: ["Motivated", "Inherited"] },
  { id: "ld5", name: "Lydia Shaw", address: "2891 Vista Canyon Rd, Bakersfield", phone: "(661) 555-7770", equity: 77000, avm: 246000, status: "Offer Sent", listType: "Pre-Foreclosure", tags: ["Timeline Sensitive"] },
  { id: "ld6", name: "Noah Brooks", address: "111 Oak Grove Blvd, Sacramento", phone: "(916) 555-1198", equity: 205000, avm: 433000, status: "New", listType: "Vacant", tags: ["Corner Lot"] },
];

export const DIALER_OUTCOMES = [
  { id: "Interested", color: "#22c55e" },
  { id: "Voicemail", color: "#eab308" },
  { id: "Not Interested", color: "#ef4444" },
  { id: "Call Back", color: "#60a5fa" },
  { id: "Offer Sent", color: "#10b981" },
  { id: "Wrong Number", color: "#f97316" },
];

export const DIALER_QUEUE_SEED = [
  { id: "dq1", name: "Maria Ortega", phone: "(916) 555-1002", address: "1842 Maple St, Sacramento", tags: ["High Equity", "Owner Occupied"] },
  { id: "dq2", name: "Jason Kim", phone: "(209) 555-9922", address: "908 Birchwood Dr, Stockton", tags: ["Absentee", "Vacant"] },
  { id: "dq3", name: "Helen Fox", phone: "(209) 555-4411", address: "4402 Elmwood Ct, Modesto", tags: ["Tax Delinquent"] },
  { id: "dq4", name: "Ramon Diaz", phone: "(559) 555-0903", address: "3421 Poplar Ave, Fresno", tags: ["Probate", "Motivated"] },
  { id: "dq5", name: "Lydia Shaw", phone: "(661) 555-7770", address: "2891 Vista Canyon Rd, Bakersfield", tags: ["Pre-Foreclosure"] },
];

export const CRM_PIPELINE = {
  New: [
    { id: "c1", name: "M. Ortega", address: "1842 Maple St" },
    { id: "c2", name: "R. Diaz", address: "3421 Poplar Ave" },
  ],
  Contacted: [
    { id: "c3", name: "J. Kim", address: "908 Birchwood Dr" },
  ],
  Interested: [
    { id: "c4", name: "L. Shaw", address: "2891 Vista Canyon Rd" },
  ],
  "Offer Sent": [
    { id: "c5", name: "H. Fox", address: "4402 Elmwood Ct" },
  ],
  Closed: [
    { id: "c6", name: "T. Warren", address: "615 Lakeview Ln" },
  ],
};

export const ACTIVE_SEQUENCES_SEED = [
  { id: "s1", name: "Vacant Follow-up", leadCount: 124, sent: 318, replies: 36, conversion: "11.3%", status: "Active" },
  { id: "s2", name: "Pre-Foreclosure Sprint", leadCount: 48, sent: 122, replies: 19, conversion: "15.6%", status: "Active" },
  { id: "s3", name: "Probate Warm-up", leadCount: 35, sent: 80, replies: 6, conversion: "7.5%", status: "Paused" },
];

export const INSURANCE_PRODUCTS = [
  {
    id: "flip",
    name: "Flip Coverage",
    price: "from $800/yr",
    bestFor: "Cosmetic or full rehab flips",
    description: "Includes property liability, vacant home risk, and renovation-phase protection for short hold periods.",
  },
  {
    id: "builders",
    name: "Builder's Risk",
    price: "1-4% of project",
    bestFor: "Heavy renovations and structural work",
    description: "Protects materials, structure-in-progress, and theft/vandalism during active construction windows.",
  },
  {
    id: "landlord",
    name: "Landlord Policy",
    price: "from $1,200/yr",
    bestFor: "BRRRR and long-term rentals",
    description: "Tailored for tenant-occupied or stabilized rental properties with liability and dwelling coverages.",
  },
];

export const ACTIVE_POLICIES = [
  { id: "p1", address: "1842 Maple St, Sacramento", type: "Flip Coverage", premium: "$1,120/yr", expiration: "2027-01-12", status: "Active" },
  { id: "p2", address: "4402 Elmwood Ct, Modesto", type: "Builder's Risk", premium: "$2,940/project", expiration: "2026-11-20", status: "Active" },
  { id: "p3", address: "2891 Vista Canyon Rd, Bakersfield", type: "Landlord Policy", premium: "$1,440/yr", expiration: "2026-08-10", status: "Review" },
];

export const HARD_MONEY_LENDERS = [
  {
    id: "kiavi",
    name: "Kiavi",
    rates: "9.5%-11.9%",
    points: "1.5-2.5",
    maxLtv: "Up to 90% LTC",
    closeTime: "7-10 days",
    features: ["Fastest approvals", "Rehab draw portal", "Track record with repeat flippers"],
    badge: "Fastest",
  },
  {
    id: "rcn",
    name: "RCN Capital",
    rates: "10.0%-12.5%",
    points: "1.5-3.0",
    maxLtv: "Up to 85% LTC",
    closeTime: "10-14 days",
    features: ["High-volume focus", "Bridge + rental products", "Works across multiple markets"],
    badge: "High Volume",
  },
  {
    id: "easystreet",
    name: "Easy Street Capital",
    rates: "9.9%-12.9%",
    points: "2.0-3.0",
    maxLtv: "Up to 85% LTC",
    closeTime: "10-15 days",
    features: ["New investor friendly", "Simple underwriting", "Clear docs and support"],
    badge: "Beginner Friendly",
  },
];
