import { G } from "../core/theme";

export const PIPELINE_STAGES = ["Analyzing", "Under Contract", "Renovating", "Listing", "Selling", "Closed"];

export const RENO_KEYS = [
  { key: "roof", label: "Roof" },
  { key: "foundation", label: "Foundation" },
  { key: "hvac", label: "HVAC" },
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
  { key: "kitchen", label: "Kitchen" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "flooring", label: "Flooring" },
  { key: "paint", label: "Paint" },
  { key: "windows", label: "Windows" },
  { key: "landscaping", label: "Landscaping" },
  { key: "misc", label: "Misc" },
];

export const TRADES = [
  "General Contractor",
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Kitchen & Bath",
  "Flooring",
  "Painting",
  "Landscaping",
  "Handyman",
];

export const DEALMAKER_CONTENT = [
  {
    cat: "YouTube Channels",
    icon: "YT",
    color: G.red,
    items: [
      { title: "Flipping Mastery TV", sub: "Jerry Norton - #1 flip channel, 500K+ subs", url: "https://www.youtube.com/@FlippingMastery" },
      { title: "Max Maxwell", sub: "Wholesaling & flipping from $0", url: "https://www.youtube.com/@MaxMaxwell" },
      { title: "Ryan Pineda", sub: "Flipping, investing, building wealth", url: "https://www.youtube.com/@RyanPineda" },
      { title: "Tarek El Moussa", sub: "HGTV host, fix & flip expert", url: "https://www.youtube.com/@TarekElMoussa" },
      { title: "FortuneBuilders", sub: "Education platform, deal analysis walkthroughs", url: "https://www.youtube.com/@FortuneBuilders" },
    ],
  },
  {
    cat: "Podcasts",
    icon: "PD",
    color: G.purple,
    items: [
      { title: "Bigger Pockets Real Estate", sub: "#1 real estate investing podcast", url: "https://www.biggerpockets.com/podcasts" },
      { title: "The Flip Talk Podcast", sub: "Don Costa - systems for flipping at scale", url: "https://fliptalk.com/podcast" },
      { title: "House Flipping HQ", sub: "Justin Williams - operational flipping strategies", url: "https://houseflippinghq.com/podcast" },
      { title: "Real Estate Rookie", sub: "New investors, first deals, step by step", url: "https://www.biggerpockets.com/podcasts/rookie" },
      { title: "Wholesaling Inc", sub: "Tom Krol - finding off-market deals", url: "https://www.wholesalinginc.com/podcast" },
    ],
  },
  {
    cat: "Essential Tools",
    icon: "TL",
    color: G.gold,
    items: [
      { title: "PropStream", sub: "Best comps, skip tracing & lead lists - $99/mo", url: "https://propstream.com" },
      { title: "DealMachine", sub: "Driving for dollars app with skip tracing", url: "https://www.dealmachine.com" },
      { title: "REIPro", sub: "CRM + lead management for investors", url: "https://reipro.com" },
      { title: "Redfin", sub: "Free sold comps, best map interface", url: "https://www.redfin.com" },
      { title: "Zillow", sub: "Zestimate + off-market Zillow offers", url: "https://www.zillow.com" },
    ],
  },
  {
    cat: "Education & Books",
    icon: "BK",
    color: G.blue,
    items: [
      { title: "The Book on Flipping Houses", sub: "J Scott - the bible for new deal makers", url: "https://www.biggerpockets.com/store/the-book-on-flipping-houses" },
      { title: "Fix and Flip Your Way to Financial Freedom", sub: "Mark Ferguson - actionable systems", url: "https://investfourmore.com" },
      { title: "BiggerPockets Forums", sub: "Free Q&A community, 3M+ members", url: "https://www.biggerpockets.com/forums" },
      { title: "FortuneBuilders Mastery", sub: "Top coaching program for deal makers", url: "https://www.fortunebuilders.com" },
      { title: "HGTV Flip or Flop Archives", sub: "Watch real flip transformations", url: "https://www.hgtv.com/shows/flip-or-flop" },
    ],
  },
];

export const STATE_LAWS = {
  California: {
    transfer: "Documentary transfer tax applies at county + city level. Disclose-only state - seller must disclose all known material defects.",
    disclosure: "California requires full Transfer Disclosure Statement (TDS), Natural Hazard Disclosure (NHD), and Agent Visual Inspection Disclosure (AVID).",
    foreclosure: "Non-judicial foreclosure state. Trustee sales happen fast - 111-day minimum from Notice of Default.",
    contractor: "All contractors must be licensed with CSLB (Contractors State License Board). Unlicensed work over $500 is illegal.",
    tax: "No transfer tax exemption for investors. Capital gains taxed as ordinary income if held under 1 year. Prop 19 affects basis on inherited properties.",
    keyDocs: ["Transfer Disclosure Statement (TDS)", "Natural Hazard Disclosure", "Lead Paint Disclosure (pre-1978)", "Statewide Buyer/Seller Advisory", "Preliminary Title Report", "Seller Property Questionnaire (SPQ)"],
    resources: [
      { title: "CA DRE License Lookup", url: "https://www.dre.ca.gov/Licensees/GeneralInformation.html" },
      { title: "CSLB Contractor Lookup", url: "https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx" },
      { title: "CA Foreclosure Law", url: "https://leginfo.legislature.ca.gov" },
    ],
  },
  Texas: {
    transfer: "No state income tax and no documentary transfer tax. Buyer beware state - less seller disclosure required.",
    disclosure: "Texas requires Seller's Disclosure Notice but has many exemptions for investors selling as-is.",
    foreclosure: "Non-judicial foreclosure. Fastest in the nation - can complete in 41 days. First Tuesday of month sales.",
    contractor: "No statewide contractor licensing except plumbers, electricians, and HVAC. Check local municipality requirements.",
    tax: "No state income tax. Significant property tax - 1.6-2.5% of assessed value annually. Homestead exemption does not apply to flips.",
    keyDocs: ["Seller's Disclosure Notice", "As-Is Residential Contract for Sale", "Title Commitment", "Lead Paint Disclosure (pre-1978)", "Survey"],
    resources: [
      { title: "TX TREC License Lookup", url: "https://www.trec.texas.gov" },
      { title: "TX Foreclosure Laws", url: "https://statutes.capitol.texas.gov" },
      { title: "TX Property Tax Info", url: "https://comptroller.texas.gov/taxes/property-tax" },
    ],
  },
  Florida: {
    transfer: "Documentary stamp tax: $0.70 per $100 of sale price. Miami-Dade has additional surtax.",
    disclosure: "Johnson v. Davis requires disclosure of all known material defects. No formal disclosure form required but liability is high.",
    foreclosure: "Judicial foreclosure state - goes through courts. Can take 6-24 months depending on county backlog.",
    contractor: "All contractors must be licensed through DBPR (Dept of Business and Professional Regulation). CGC or CRC license required.",
    tax: "No state income tax. Homestead exemption reduces assessed value - doesn't apply to investor-owned flips. Intangibles tax repealed.",
    keyDocs: ["Seller's Property Disclosure", "As-Is Residential Contract (FAR/BAR)", "Lead Paint Disclosure", "Title Commitment", "Closing Disclosure"],
    resources: [
      { title: "FL DBPR Contractor Lookup", url: "https://www.myfloridalicense.com" },
      { title: "FL Real Estate Commission", url: "https://www.myfloridalicense.com/DBPR/real-estate-commission/" },
      { title: "FL Foreclosure Process", url: "https://www.floridabar.org" },
    ],
  },
  Arizona: {
    transfer: "No documentary transfer tax. Buyer beware state with minimal required disclosures.",
    disclosure: "Residential Seller's Property Disclosure Statement required. As-is sales common for investor flips.",
    foreclosure: "Non-judicial foreclosure, 90-day minimum. Very investor-friendly - trustee sales are active.",
    contractor: "ROC (Registrar of Contractors) license required. Check license before hiring any trade.",
    tax: "No state income tax on individuals. TPT (Transaction Privilege Tax) may apply on contractor work. Capital gains taxed federally.",
    keyDocs: ["Residential Seller's Property Disclosure Statement", "As-Is Addendum", "Lead Paint Disclosure", "Buyer Advisory", "Title Commitment"],
    resources: [
      { title: "AZ ROC Contractor Lookup", url: "https://roc.az.gov" },
      { title: "AZ Dept of RE", url: "https://azre.gov" },
      { title: "AZ Foreclosure Info", url: "https://azleg.gov" },
    ],
  },
  Georgia: {
    transfer: "Transfer tax: $1.00 per $1,000 of consideration, paid by seller.",
    disclosure: "No mandatory residential disclosure form - buyer beware. Attorney state - must use RE attorney for closing.",
    foreclosure: "Non-judicial foreclosure. 30-day notice to cure, then 45-day notice of sale. Fastest non-judicial process.",
    contractor: "No statewide GC license. Some counties require local license. Plumbers, electricians, HVAC must be licensed.",
    tax: "No estate or inheritance tax. 5.75% state income tax on short-term capital gains. Attorney required at closing adds cost.",
    keyDocs: ["Purchase and Sale Agreement", "Seller's Property Disclosure (voluntary)", "Lead Paint Disclosure", "HUD-1 or Closing Disclosure", "Warranty Deed or Limited Warranty Deed"],
    resources: [
      { title: "GA Real Estate Commission", url: "https://grec.state.ga.us" },
      { title: "GA Bar Attorney Lookup", url: "https://www.gabar.org" },
      { title: "GA Foreclosure Laws", url: "https://law.justia.com/codes/georgia" },
    ],
  },
  Nevada: {
    transfer: "Real Property Transfer Tax: $1.95 per $500. Some counties higher.",
    disclosure: "Seller's Real Property Disclosure Form required. Strong disclosure state.",
    foreclosure: "Non-judicial foreclosure. 111-day minimum from Notice of Default. Very active trustee sale market.",
    contractor: "NV State Contractors Board license required. Check before hiring.",
    tax: "No state income tax. No corporate income tax. Business-friendly for LLCs. Capital gains taxed at federal level only.",
    keyDocs: ["Seller's Real Property Disclosure Form", "Lead Paint Disclosure", "Residential Purchase Agreement", "Preliminary Title Report", "Grant Deed"],
    resources: [
      { title: "NV Contractors Board", url: "https://www.nvcontractorsboard.com" },
      { title: "NV Real Estate Division", url: "https://red.nv.gov" },
      { title: "NV Tax Info", url: "https://tax.nv.gov" },
    ],
  },
};

export const SOFTWARE_REVIEWS = [
  { id: "propstream", name: "PropStream", category: "Comps & Leads", logo: "PS", logoColor: "#3b82f6", rating: 4.8, reviews: 1284, price: "$99/mo", verdict: "BEST OVERALL", verdictColor: "#22c55e", tagline: "The gold standard for investor comps, lead lists, and skip tracing.", pros: ["Best comps data in the industry", "Skip tracing built-in", "Driving for dollars map", "Nationwide MLS + public records", "Great mobile app"], cons: ["Can feel overwhelming at first", "Skip trace credits cost extra", "No CRM built-in"], flipperQuotes: [{ quote: "PropStream is the first thing I open every morning. Comps are accurate and skip tracing saves me hours.", user: "Jerry M., Sacramento CA", deals: 34 }, { quote: "Switched from 3 different tools to just PropStream. Pays for itself on one deal.", user: "Tasha R., Dallas TX", deals: 18 }], bestFor: "Active deal makers doing 3+ deals/month who need reliable comps and lead generation.", url: "https://propstream.com", affiliate: true },
  { id: "dealmachine", name: "DealMachine", category: "Driving for Dollars", logo: "DM", logoColor: "#f97316", rating: 4.6, reviews: 892, price: "$49-$149/mo", verdict: "BEST FOR DRIVING", verdictColor: "#f97316", tagline: "The #1 app for driving for dollars and finding off-market properties.", pros: ["Best driving-for-dollars UI", "Auto-mailer built-in", "Skip tracing included", "Route tracking", "CRM integrations"], cons: ["Comps not as deep as PropStream", "Mailer costs add up", "Desktop experience limited"], flipperQuotes: [{ quote: "Found my best deal ever driving a neighborhood with DealMachine. Owner called me 3 days after the mailer.", user: "Marcus B., Phoenix AZ", deals: 12 }, { quote: "The auto-mailer pays for itself. Set it and forget it.", user: "Kim L., Orlando FL", deals: 8 }], bestFor: "Investors who drive neighborhoods or want automated direct mail campaigns.", url: "https://www.dealmachine.com", affiliate: true },
  { id: "reipro", name: "REIPro", category: "CRM & Lead Management", logo: "RP", logoColor: "#a855f7", rating: 4.5, reviews: 634, price: "$97/mo", verdict: "BEST CRM", verdictColor: "#a855f7", tagline: "Purpose-built CRM for real estate investors with deal tracking and follow-up automation.", pros: ["Built for investors not agents", "Automated follow-up sequences", "Deal analyzer built-in", "Lead scoring", "Solid mobile app"], cons: ["Comps not great", "UI feels dated in spots", "Limited integrations"], flipperQuotes: [{ quote: "REIPro keeps me from losing leads. The follow-up sequences closed 2 deals I would have dropped.", user: "Dave T., Atlanta GA", deals: 22 }, { quote: "Best investor CRM I've tried. Nothing else is built specifically for us.", user: "Rosa H., Las Vegas NV", deals: 15 }], bestFor: "Deal Makers managing 50+ leads who need a system to follow up and close more deals.", url: "https://reipro.com", affiliate: true },
  { id: "batchleads", name: "BatchLeads", category: "Lead Generation", logo: "BL", logoColor: "#22c55e", rating: 4.4, reviews: 521, price: "$77-$197/mo", verdict: "BEST FOR LISTS", verdictColor: "#22c55e", tagline: "Massive skip-traced lead lists with the best filtering for distressed properties.", pros: ["Huge database 150M+ records", "Excellent list filtering", "Batch skip tracing is cheap", "SMS marketing built-in", "Good comps"], cons: ["Can overwhelm with data", "SMS features cost extra", "Learning curve on filters"], flipperQuotes: [{ quote: "BatchLeads has the most accurate absentee owner data I found. My list quality went way up.", user: "Chris P., Tampa FL", deals: 19 }, { quote: "The SMS campaigns are a game changer. Response rates are 3x better than mail.", user: "Angela W., Houston TX", deals: 27 }], bestFor: "Investors focused on direct-to-seller outreach who need large filtered lead lists.", url: "https://batchleads.io", affiliate: true },
  { id: "investorfuse", name: "InvestorFuse", category: "CRM & Automation", logo: "IF", logoColor: "#eab308", rating: 4.3, reviews: 387, price: "$197/mo", verdict: "MOST AUTOMATED", verdictColor: "#eab308", tagline: "The most automated investor CRM - built to handle high lead volume without dropping balls.", pros: ["Incredible automation", "Built on Podio - flexible", "Great for teams", "Best lead routing system", "Training library included"], cons: ["Most expensive option", "Complex setup", "Overkill for new investors"], flipperQuotes: [{ quote: "InvestorFuse runs our entire operation. 3-person team handles 200 leads a month without chaos.", user: "Brandon K., Denver CO", deals: 48 }, { quote: "Steep learning curve but worth every penny at scale.", user: "Priya S., Seattle WA", deals: 31 }], bestFor: "Scaling investors and teams doing 5+ deals/month who want maximum automation.", url: "https://investorfuse.com", affiliate: true },
  { id: "flipperforce", name: "FlipperForce", category: "Project Management", logo: "FF", logoColor: "#ef4444", rating: 4.2, reviews: 298, price: "$39-$99/mo", verdict: "BEST REHAB TRACKER", verdictColor: "#ef4444", tagline: "Purpose-built project management for rehab budgets, contractor scheduling, and flip tracking.", pros: ["Built for rehab projects", "Budget tracking is excellent", "Contractor scheduling tools", "Photo documentation", "Simple and focused"], cons: ["Not a CRM or lead tool", "Limited comps features", "Small user community"], flipperQuotes: [{ quote: "FlipperForce tracks my rehab budget against actuals in real time. Saved me from going over budget twice.", user: "Tom A., Nashville TN", deals: 14 }, { quote: "Simple, focused, does what it says. Perfect for managing contractors.", user: "Sarah J., Raleigh NC", deals: 9 }], bestFor: "Active rehabbers who struggle with contractor management and staying on budget.", url: "https://flipperforce.com", affiliate: true },
];

export const INSURANCE_PARTNERS = [
  { id: "ins1", name: "Steadily", logo: "ST", logoColor: "#22c55e", type: "Landlord & Flip Insurance", rating: 4.8, badge: "RECOMMENDED", tagline: "Purpose-built insurance for real estate investors. Fast quotes, investor-friendly terms.", coverage: ["Vacant property coverage", "Rehab/renovation coverage", "Landlord insurance", "Short-term rental coverage", "Liability protection"], avgPremium: "$800-$2,400/yr per property", url: "https://www.steadily.com" },
  { id: "ins2", name: "Foremost Insurance", logo: "FI", logoColor: "#f97316", type: "Vacant Property Insurance", rating: 4.5, badge: "VACANT PROPERTY", tagline: "Specialists in vacant and hard-to-insure properties. Perfect for distressed acquisitions.", coverage: ["Vacant/unoccupied homes", "Fire, lightning, wind coverage", "Vandalism & malicious mischief", "Extended vacancy periods", "Quick bind process"], avgPremium: "$1,200-$3,500/yr", url: "https://www.foremost.com" },
  { id: "ins3", name: "American Family", logo: "AF", logoColor: "#3b82f6", type: "Builder's Risk Insurance", rating: 4.4, badge: "BUILDER'S RISK", tagline: "Top-rated builder's risk policies for fix-and-flip rehabs. Covers materials and liability during construction.", coverage: ["Materials & supplies coverage", "Contractor liability", "Fire & theft during rehab", "Vandalism protection", "Flood add-on available"], avgPremium: "1-4% of project cost", url: "https://www.amfam.com" },
];

export const MORTGAGE_PARTNERS = [
  { id: "hm1", name: "Kiavi", logo: "KV", logoColor: "#22c55e", type: "Hard Money Lender", badge: "TOP RATED", rates: "10.5-13.5%", points: "1.5-2.5", ltv: "Up to 90% LTC", minLoan: "$75K", maxLoan: "$3M", closingTime: "5-10 days", tagline: "The #1 rated hard money lender for fix-and-flip investors. Fast, transparent, scalable.", features: ["Online application - no broker", "Pre-approval in 24 hours", "90% of purchase + 100% of rehab", "No income verification", "Repeat borrower discounts"], flipperNote: "Most popular hard money lender among DealBank users. Best for investors doing 2+ deals/year.", url: "https://www.kiavi.com" },
  { id: "hm2", name: "RCN Capital", logo: "RC", logoColor: "#3b82f6", type: "Hard Money / Bridge Loans", badge: "FAST CLOSE", rates: "9.99-13%", points: "1-3", ltv: "Up to 85% LTV", minLoan: "$50K", maxLoan: "$5M", closingTime: "3-7 days", tagline: "Institutional hard money with fast closings and flexible underwriting. Great for experienced deal makers.", features: ["Bridge loans & fix-and-flip", "Multifamily available", "Ground-up construction", "DSCR rental loans", "White-glove service"], flipperNote: "Best for investors doing larger deals or scaling a portfolio. Excellent service team.", url: "https://www.rcncapital.com" },
  { id: "hm3", name: "Easy Street Capital", logo: "ES", logoColor: "#eab308", type: "New Investor Friendly", badge: "NEW INVESTOR OK", rates: "11-14%", points: "2-3", ltv: "Up to 85% LTC", minLoan: "$75K", maxLoan: "$2M", closingTime: "7-14 days", tagline: "One of the few hard money lenders that works with first-time investors.", features: ["First-time investor friendly", "No prior experience required", "Will fund with 1 flip on record", "Great coaching resources", "BRRRR loans available"], flipperNote: "Best option for new deal makers who cannot get approved elsewhere.", url: "https://easystreetcap.com" },
  { id: "hm4", name: "Lima One Capital", logo: "LO", logoColor: "#a855f7", type: "DSCR & Rental Loans", badge: "BRRRR STRATEGY", rates: "7.5-10.5%", points: "1-2", ltv: "Up to 80% LTV", minLoan: "$75K", maxLoan: "$10M", closingTime: "14-21 days", tagline: "Best for the BRRRR strategy - flip it, then refi into a long-term rental loan.", features: ["Fix-to-rent refinancing", "DSCR rental loans", "Portfolio blanket loans", "No personal income needed", "30-year fixed available"], flipperNote: "If you plan to BRRRR any deals, Lima One is the best one-stop shop from rehab to refi.", url: "https://www.limaone.com" },
];

export const AD_SLOTS = [
  { id: "ad1", company: "PropStream", headline: "Close More Deals With Better Data", sub: "500K+ investors trust PropStream for comps, skip tracing & lead lists.", cta: "Start Free Trial", url: "https://propstream.com", color: "#3b82f6" },
  { id: "ad2", company: "Kiavi", headline: "Fund Your Next Flip in 5 Days", sub: "Pre-approval in 24 hours. Up to 90% of purchase. No income docs required.", cta: "Get Pre-Approved", url: "https://www.kiavi.com", color: "#22c55e" },
  { id: "ad3", company: "Steadily Insurance", headline: "Flip Insurance Built for Investors", sub: "Vacant, rehab, and landlord policies. Get a quote in 2 minutes.", cta: "Get a Quote", url: "https://www.steadily.com", color: "#f97316" },
];

export const MOCK_CONTRACTORS = [
  { id: "c1", name: "Ray Dominguez", trade: "General Contractor", rating: 4.9, jobs: 47, location: "Sacramento, CA", bio: "20 years full rehab. Fix-and-flip specialist.", rate: "$85/hr", verified: true, avatar: "RD" },
  { id: "c2", name: "Mike Torres", trade: "HVAC", rating: 4.8, jobs: 31, location: "Stockton, CA", bio: "Licensed HVAC, same-day quotes, investor pricing.", rate: "$75/hr", verified: true, avatar: "MT" },
  { id: "c3", name: "Lisa Chen", trade: "Kitchen & Bath", rating: 5.0, jobs: 22, location: "Modesto, CA", bio: "High-end finishes at investor prices.", rate: "$90/hr", verified: true, avatar: "LC" },
  { id: "c4", name: "James Webb", trade: "Roofing", rating: 4.7, jobs: 58, location: "Fresno, CA", bio: "Full roof replacements and repairs.", rate: "$70/hr", verified: false, avatar: "JW" },
  { id: "c5", name: "Carlos Reyes", trade: "Plumbing", rating: 4.9, jobs: 39, location: "Modesto, CA", bio: "Licensed plumber. Repiping specialist.", rate: "$80/hr", verified: true, avatar: "CR" },
  { id: "c6", name: "Tom Bradley", trade: "Electrical", rating: 4.8, jobs: 26, location: "Sacramento, CA", bio: "Panel upgrades, full rewires, EV charger installs.", rate: "$85/hr", verified: true, avatar: "TB" },
];

export const MOCK_REALTORS = [
  { id: "r1", name: "Sandra Okafor", brokerage: "Keller Williams", rating: 4.9, deals: 84, location: "Sacramento, CA", split: "2.5%", avatar: "SO", specialty: "Investor flips" },
  { id: "r2", name: "David Park", brokerage: "Coldwell Banker", rating: 4.8, deals: 61, location: "Modesto, CA", split: "2.5%", avatar: "DP", specialty: "Fast closings" },
  { id: "r3", name: "Maria Gutierrez", brokerage: "RE/MAX", rating: 5.0, deals: 102, location: "Stockton, CA", split: "2.5%", avatar: "MG", specialty: "Fix & flip exits" },
];
