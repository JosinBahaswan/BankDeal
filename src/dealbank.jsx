import { useCallback, useEffect, useRef, useState } from "react";
import {
  askClaude,
  calcOffer,
  extractJSON,
  fetchPropertyIntelligence,
  fmt,
  toNum,
} from "./dealbank/core/helpers";
import { bootstrapMobileRuntime } from "./dealbank/core/mobileRuntime";
import {
  cacheAndSyncPushToken,
  cachePushToken,
  syncCachedPushToken,
} from "./dealbank/core/mobilePushSync";
import {
  flushPipelineQueue,
  isLikelyOffline,
  isPipelineNetworkError,
  queuePipelineOperation,
  readCachedPipeline,
  writeCachedPipeline,
} from "./dealbank/core/pipelineOffline";
import { G, card, lbl, smIn, btnG, btnO } from "./dealbank/core/theme";
import {
  beginCheckout,
  confirmCheckoutSession,
  getContractorSubscriptionPriceId,
  getDealmakerSubscriptionPriceId,
} from "./dealbank/core/billing";
import {
  AD_SLOTS,
  DEALMAKER_CONTENT,
  INSURANCE_PARTNERS,
  MOCK_CONTRACTORS,
  MOCK_REALTORS,
  MORTGAGE_PARTNERS,
  PIPELINE_STAGES,
  RENO_KEYS,
  SOFTWARE_REVIEWS,
  STATE_LAWS,
  TRADES,
} from "./dealbank/data/appData";
import AdminDashboardScreen from "./dealbank/screens/AdminDashboardScreen";
import AuthScreen from "./dealbank/screens/AuthScreen";
import ContractorDashboardScreen from "./dealbank/screens/ContractorDashboardScreen";
import ContractorOnboardingScreen from "./dealbank/screens/ContractorOnboardingScreen";
import DealMakerDashboardScreen from "./dealbank/screens/DealMakerDashboardScreen";
import DealMakerSubscriptionGateScreen from "./dealbank/screens/DealMakerSubscriptionGateScreen";
import LandingScreen from "./dealbank/screens/LandingScreen";
import PrivacyPolicyScreen from "./dealbank/screens/legal/PrivacyPolicyScreen";
import TermsOfServiceScreen from "./dealbank/screens/legal/TermsOfServiceScreen";
import RealtorOnboardingScreen from "./dealbank/screens/RealtorOnboardingScreen";
import RealtorDashboardScreen from "./dealbank/screens/RealtorDashboardScreen";
import { supabase } from "./lib/supabaseClient";
import AlertModal from "./dealbank/components/AlertModal";

const USER_TYPES = new Set(["dealmaker", "contractor", "realtor", "admin"]);

function normalizeUserType(type) {
  const value = String(type || "").toLowerCase();
  return USER_TYPES.has(value) ? value : "dealmaker";
}

function isLikelyPropertyLookupInput(value) {
  const input = String(value || "").trim();
  if (!input) return false;

  if (/^https?:\/\/\S+/i.test(input)) return true;
  if (/^address:\d{6,}$/i.test(input)) return true;
  if (/^\d{6,}$/.test(input)) return true;

  const hasLetters = /[a-zA-Z]/.test(input);
  return hasLetters && input.length >= 3;
}

const ADMIN_EMAIL_ENV = String(import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD_ENV = String(import.meta.env.VITE_ADMIN_PASSWORD || "").trim();
const ADMIN_BYPASS_ENABLED = String(import.meta.env.VITE_ENABLE_ADMIN_BYPASS || "").toLowerCase() === "true";
const ADMIN_PASSWORD_ALIASES = new Set([ADMIN_PASSWORD_ENV].filter(Boolean));

function toOnboardingTradeLabel(trade) {
  if (trade === "General Contractor") return "GC";
  return trade;
}

function createContractorOnboardingState(initialTrade = "") {
  return {
    step: 1,
    trades: initialTrade ? [initialTrade] : [],
    yearsInBusiness: "",
    licenseNumber: "",
    city: "",
    serviceRadius: "",
    rateType: "hourly",
    rateAmount: "",
    bio: "",
    licensedAndInsured: false,
    bonded: false,
    plan: "basic",
    submitting: false,
    error: "",
  };
}

function createRealtorOnboardingState() {
  return {
    step: 1,
    dreLicense: "",
    brokerage: "",
    avgDaysToClose: "",
    dealsPerYear: "",
    bio: "",
    markets: [],
    specialties: [],
    submitting: false,
    error: "",
  };
}

function isActiveSubscriptionStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "active" || normalized === "trialing";
}

function errCode(error) {
  return String(error?.code || error?.error_code || "").toLowerCase();
}

function errMessage(error) {
  return String(error?.message || "").toLowerCase();
}

function isRateLimitError(error) {
  return errCode(error) === "over_email_send_rate_limit" || errMessage(error).includes("email rate limit exceeded");
}

function isInvalidCredentialError(error) {
  return errCode(error) === "invalid_credentials" || errMessage(error).includes("invalid login credentials");
}

function isEmailNotConfirmedError(error) {
  return errCode(error) === "email_not_confirmed" || errMessage(error).includes("email not confirmed");
}

function isUserExistsError(error) {
  return errCode(error) === "user_already_exists" || errMessage(error).includes("already registered") || errMessage(error).includes("already been registered");
}

function resolveAuthEmailRedirect() {
  const configuredSite = String(import.meta.env.VITE_SITE_URL || "").trim();
  if (configuredSite) {
    return `${configuredSite.replace(/\/$/, "")}/`;
  }

  if (typeof window === "undefined") return "";
  return `${window.location.origin}/`;
}

function mapDealRowToPipeline(row) {
  return {
    id: row.id,
    address: row.address,
    arvNum: Number(row.arv || 0),
    offer: Number(row.offer_price || 0),
    allIn: Number(row.all_in_cost || 0),
    projProfit: Number(row.net_profit || 0),
    roi: Number(row.roi || 0).toFixed(1),
    stage: row.stage || "Analyzing",
    notes: "",
    savedAt: row.saved_at ? new Date(row.saved_at).toLocaleDateString() : "",
    reno: {
      kitchen: String(row.reno_kitchen || 0),
      bathrooms: String(row.reno_bathrooms || 0),
      flooring: String(row.reno_flooring || 0),
      paint: String(row.reno_paint || 0),
      hvac: String(row.reno_hvac || 0),
      plumbing: String(row.reno_plumbing || 0),
      electrical: String(row.reno_electrical || 0),
      roof: String(row.reno_roof || 0),
      windows: String(row.reno_windows || 0),
      landscaping: String(row.reno_landscaping || 0),
      foundation: String(row.reno_foundation || 0),
      misc: String(row.reno_misc || 0),
    },
    offerPct: String(row.offer_pct || 60),
    softCosts: String((Number(row.total_holding || 0) + Number(row.total_selling || 0)) || 0),
    holdMonths: String(row.hold_months || 6),
    holdMonthly: String(row.hold_monthly || 0),
    insuranceAnnual: String(row.insurance_annual || 0),
    agentFeePct: String(row.agent_fee_pct || 5),
    closingCostPct: String(row.closing_cost_pct || 2),
    hardRate: String(row.hm_rate || ""),
    loanMo: String(row.hm_months || ""),
    loanPts: String(row.hm_points || ""),
  };
}

const DEALMAKER_TAB_LABELS = {
  analyze: "Deal Analysis",
  pipeline: "Pipeline",
  contracts: "Contracts",
  contractors: "Contractors",
  tools: "Tools",
  partners: "Partners",
  resources: "Resources",
  laws: "State Laws",
  marketplace: "Marketplace",
};

const ADMIN_TAB_LABELS = {
  overview: "Overview",
  users: "Users",
  revenue: "Revenue",
  deals: "Deals",
  titlePortal: "Title Portal",
  contractors: "Contractors",
};

const CONTRACTOR_TAB_LABELS = {
  leads: "Job Leads",
  jobs: "Active Jobs",
  profile: "Profile",
  earnings: "Earnings",
  reviews: "Reviews",
};

const REALTOR_TAB_LABELS = {
  referrals: "Referrals",
  listings: "Active Listings",
  closed: "Closed Deals",
  profile: "Profile",
  splits: "Earnings & Splits",
};

function upsertMetaTag(attrs, content) {
  if (typeof document === "undefined") return;
  const attrKey = attrs.name ? "name" : "property";
  const attrValue = attrs.name || attrs.property;
  if (!attrValue) return;

  const selector = `meta[${attrKey}="${attrValue}"]`;
  let node = document.head.querySelector(selector);

  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attrKey, attrValue);
    document.head.appendChild(node);
  }

  node.setAttribute("content", content);
}

function upsertCanonical(href) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector("link[rel='canonical']");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function applySeoMeta({ title, description, robots }) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const baseUrl = String(import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
  const normalizedPath = window.location.pathname || "/";
  const canonicalUrl = `${baseUrl}${normalizedPath}`;
  const imageUrl = `${baseUrl}/image.png`;
  const pageTitle = title || "DealBank";
  const pageDescription = description || "DealBank helps real estate investors analyze, manage, and close deals faster.";
  const robotsValue = robots || "index, follow";
  const imageAlt = "DealBank real estate deal analysis dashboard";

  document.title = pageTitle;
  upsertCanonical(canonicalUrl);

  upsertMetaTag({ name: "description" }, pageDescription);
  upsertMetaTag({ name: "robots" }, robotsValue);
  upsertMetaTag({ name: "googlebot" }, robotsValue);

  upsertMetaTag({ property: "og:type" }, "website");
  upsertMetaTag({ property: "og:locale" }, "en_US");
  upsertMetaTag({ property: "og:site_name" }, "DealBank");
  upsertMetaTag({ property: "og:title" }, pageTitle);
  upsertMetaTag({ property: "og:description" }, pageDescription);
  upsertMetaTag({ property: "og:url" }, canonicalUrl);
  upsertMetaTag({ property: "og:image" }, imageUrl);
  upsertMetaTag({ property: "og:image:alt" }, imageAlt);
  upsertMetaTag({ property: "og:image:width" }, "1200");
  upsertMetaTag({ property: "og:image:height" }, "630");

  upsertMetaTag({ name: "twitter:card" }, "summary_large_image");
  upsertMetaTag({ name: "twitter:url" }, canonicalUrl);
  upsertMetaTag({ name: "twitter:title" }, pageTitle);
  upsertMetaTag({ name: "twitter:description" }, pageDescription);
  upsertMetaTag({ name: "twitter:image" }, imageUrl);
  upsertMetaTag({ name: "twitter:image:alt" }, imageAlt);
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [authMode, setAuthMode] = useState("signup");
  const [userType, setUserType] = useState("");
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    trade: "General Contractor",
    location: "",
    company: "",
    phone: "",
  });
  const [authError, setAuthError] = useState("");
  const [authNeedsVerification, setAuthNeedsVerification] = useState(false);
  const [authVerificationEmail, setAuthVerificationEmail] = useState("");

  const [flipTab, setFlipTab] = useState("properties");
  const [contractsPrefill, setContractsPrefill] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [savedMsg, setSavedMsg] = useState("");
  const [pipelineFocusDealId, setPipelineFocusDealId] = useState("");
  const [toast, setToast] = useState({ text: "", tone: "info" });
  const [activeDeal, setActiveDeal] = useState(null);
  const [showRealtor, setShowRealtor] = useState(false);

  const [mktView, setMktView] = useState("feed");
  const [wDeal, setWDeal] = useState({ assignFee: "", closeDate: "", contractPrice: "", daysLeft: "", earnest: "", notes: "", buyers: [] });
  const [wLive, setWLive] = useState(false);
  const [mktFilter, setMktFilter] = useState("All");
  const [mktSort, setMktSort] = useState("newest");
  const [activeListing, setActiveListing] = useState(null);
  const [submitStep, setSubmitStep] = useState(1);
  const [wForm, setWForm] = useState({
    address: "",
    city: "",
    state: "CA",
    zip: "",
    beds: "",
    baths: "",
    sqft: "",
    yearBuilt: "",
    arv: "",
    askPrice: "",
    renoEst: "",
    assignFee: "",
    earnest: "",
    closeDate: "",
    type: "Wholesale",
    description: "",
    highlights: "",
    condition: "Light Cosmetic",
    contactName: "",
    contactCompany: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [wSubmitted, setWSubmitted] = useState(false);
  const [savedDeals, setSavedDeals] = useState([]);

  const [address, setAddress] = useState("");
  const [propData, setPropData] = useState(null);
  const [compsData, setCompsData] = useState(null);
  const [avmData, setAvmData] = useState(null);
  const [mktNotes, setMktNotes] = useState("");
  const [propertyIntel, setPropertyIntel] = useState(null);
  const [reno, setReno] = useState(() => RENO_KEYS.reduce((acc, curr) => ({ ...acc, [curr.key]: "" }), {}));
  const [offerPct, setOfferPct] = useState("60");
  const [holdMonths, setHoldMonths] = useState("6");
  const [holdMonthly, setHoldMonthly] = useState("1200");
  const [insuranceAnnual, setInsuranceAnnual] = useState("1800");
  const [agentFeePct, setAgentFeePct] = useState("5");
  const [closingCostPct, setClosingCostPct] = useState("2");
  const [hardRate, setHardRate] = useState("12");
  const [loanMo, setLoanMo] = useState("6");
  const [loanPts, setLoanPts] = useState("2");
  const [arvOvr, setArvOvr] = useState("");
  const [lookLoad, setLookLoad] = useState(false);
  const [lookErr, setLookErr] = useState("");
  const [renoLoad, setRenoLoad] = useState(false);
  const [renoNote, setRenoNote] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [anlLoad, setAnlLoad] = useState(false);
  const [anlErr, setAnlErr] = useState("");
  const [anlTab, setAnlTab] = useState("offer-costs");
  const targetP = 75000;
  const [pitch, setPitch] = useState("");
  const [pitchLoad, setPitchLoad] = useState(false);
  const [showPitch, setShowPitch] = useState(false);

  const [selectedState, setSelectedState] = useState("California");
  const [lawSection, setLawSection] = useState("transfer");
  const [softwareFilter, setSoftwareFilter] = useState("All");
  const [activeSoftware, setActiveSoftware] = useState(null);
  const [partnerTab, setPartnerTab] = useState("software");

  const [adminTab, setAdminTab] = useState("overview");
  const [contractorTab, setContractorTab] = useState("leads");
  const [realtorTab, setRealtorTab] = useState("referrals");
  const [showDealmakerSubscriptionGate, setShowDealmakerSubscriptionGate] = useState(false);
  const [dealmakerGateState, setDealmakerGateState] = useState({
    checking: false,
    launching: false,
    message: "",
  });
  const [dealmakerBillingRefreshTick, setDealmakerBillingRefreshTick] = useState(0);
  const [showContractorOnboarding, setShowContractorOnboarding] = useState(false);
  const [contractorOnboarding, setContractorOnboarding] = useState(() => createContractorOnboardingState());
  const [contractorBillingRefreshTick, setContractorBillingRefreshTick] = useState(0);
  const [showRealtorOnboarding, setShowRealtorOnboarding] = useState(false);
  const [realtorOnboarding, setRealtorOnboarding] = useState(() => createRealtorOnboardingState());

  const [alert, setAlert] = useState({ show: false, title: "", message: "", type: "error" });

  const showAlert = useCallback((message, title = "", type = "error") => {
    let cleanMessage = message;
    let cleanTitle = title;

    // Map technical errors to non-technical Indonesian
    if (message.includes("401") || message.includes("Unauthorized") || message.includes("Session expired")) {
      cleanTitle = "Sesi Berakhir";
      cleanMessage = "Sesi login Anda telah berakhir demi keamanan. Silakan login kembali untuk melanjutkan analisis properti.";
    } else if (message.includes("429") || message.includes("Too many requests")) {
      cleanTitle = "Terlalu Banyak Permintaan";
      cleanMessage = "Sistem sedang sibuk memproses data. Mohon tunggu sebentar sebelum mencoba kembali.";
    } else if (message.includes("ANTHROPIC_API_KEY")) {
      cleanTitle = "Layanan AI Terbatas";
      cleanMessage = "Layanan AI sedang dalam mode demo karena kunci akses belum diatur. Silakan hubungi admin.";
    } else if (message.includes("Realty Base request failed") || message.includes("property intelligence unavailable")) {
      cleanTitle = "Data Market Terbatas";
      cleanMessage = "Kami kesulitan mengambil data pasar otomatis saat ini. Anda tetap bisa memasukkan angka secara manual di tab Analisis.";
    }

    setAlert({ show: true, title: cleanTitle, message: cleanMessage, type });
  }, []);

  const hideAlert = () => setAlert(prev => ({ ...prev, show: false }));

  const offerRef = useRef(null);
  const confirmedCheckoutSessionsRef = useRef(new Set());

  const pushToast = useCallback((text, tone = "info") => {
    if (!text) return;
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast.text) return;
    const timer = setTimeout(() => {
      setToast({ text: "", tone: "info" });
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.text]);

  useEffect(() => {
    let dispose = () => {};

    bootstrapMobileRuntime({
      onPushToken: (token) => {
        if (!token) return;

        cachePushToken(token);
        cacheAndSyncPushToken({
          supabaseClient: supabase,
          token,
        }).catch(() => {
          // no-op: token remains cached and will be retried on next authenticated session.
        });
      },
      onError: () => {
        // no-op: native push setup is optional in web and local development.
      },
    }).then((cleanup) => {
      if (typeof cleanup === "function") {
        dispose = cleanup;
      }
    }).catch(() => {
      // no-op
    });

    return () => {
      if (typeof dispose === "function") {
        dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    syncCachedPushToken({
      supabaseClient: supabase,
    }).catch(() => {
      // no-op: retry will happen on next app/session cycle.
    });
  }, [user?.id]);

  function clearPipelineFocusDeal() {
    setPipelineFocusDealId("");
  }

  const totalReno = RENO_KEYS.reduce((sum, key) => sum + toNum(reno[key.key]), 0);
  const offerPctNum = Math.min(100, Math.max(0, parseFloat(offerPct) || 60));
  const holdMonthsNum = Math.max(0, parseFloat(holdMonths) || 0);
  const holdMonthlyNum = Math.max(0, parseFloat(holdMonthly) || 0);
  const insuranceAnnualNum = Math.max(0, parseFloat(insuranceAnnual) || 0);
  const agentFeePctNum = Math.max(0, parseFloat(agentFeePct) || 0);
  const closingCostPctNum = Math.max(0, parseFloat(closingCostPct) || 0);
  const rateNum = parseFloat(hardRate) || 12;
  const moNum = parseFloat(loanMo) || 6;
  const ptsNum = parseFloat(loanPts) || 2;
  const arvNum = toNum(arvOvr) || avmData?.price || 0;
  const holdN = holdMonthsNum * holdMonthlyNum;
  const insN = holdMonthsNum * (insuranceAnnualNum / 12);
  const agentN = arvNum * (agentFeePctNum / 100);
  const closingN = arvNum * (closingCostPctNum / 100);
  const totalHolding = holdN + insN;
  const totalSelling = agentN + closingN;
  const softNum = totalHolding + totalSelling;
  const sixtyT = Math.round(arvNum * (offerPctNum / 100));
  const offer = arvNum > 0 ? calcOffer(arvNum, totalReno, softNum, rateNum, moNum, ptsNum, offerPctNum) : 0;
  const hmInt = offer * (rateNum / 100) * (moNum / 12);
  const hmPts = offer * (ptsNum / 100);
  const totalHM = hmInt + hmPts;
  const allIn = offer + totalReno + softNum + totalHM;
  const projProfit = arvNum > 0 ? arvNum - allIn : 0;
  const roi = allIn > 0 ? (projProfit / allIn) * 100 : 0;

  useEffect(() => {
    let title = "DealBank | AI Real Estate Deal Analyzer Platform";
    let description = "AI-powered real estate platform for deal analysis, pipeline tracking, contractor collaboration, and flip execution.";
    let robots = "index, follow";
    const isLegalScreen = screen === "terms" || screen === "privacy";

    if (screen === "terms") {
      title = "Terms of Service | DealBank";
      description = "Read DealBank terms for platform usage, billing, escrow handling, and marketplace compliance.";
      robots = "index, follow";
    }

    if (screen === "privacy") {
      title = "Privacy Policy | DealBank";
      description = "Learn how DealBank collects, uses, and protects user data across platform workflows.";
      robots = "index, follow";
    }

    if (screen === "auth") {
      title = "Login & Signup | DealBank";
      description = "Access your DealBank account to analyze deals, manage pipeline, and collaborate with your team.";
      robots = "noindex, nofollow";
    }

    if (!isLegalScreen && (user?.type === "dealmaker" || (screen === "app" && userType === "dealmaker"))) {
      const tabName = DEALMAKER_TAB_LABELS[flipTab] || "Dashboard";
      title = `${tabName} Dashboard | DealBank`;
      description = "Private workspace for deal makers to run analysis, manage pipeline, and execute real estate flips.";
      robots = "noindex, nofollow";
    }

    if (!isLegalScreen && showContractorOnboarding && user?.type === "contractor") {
      title = "Contractor Onboarding | DealBank";
      description = "Complete your contractor profile to start receiving project opportunities from deal makers.";
      robots = "noindex, nofollow";
    }

    if (!isLegalScreen && showRealtorOnboarding && user?.type === "realtor") {
      title = "Realtor Onboarding | DealBank";
      description = "Set up your realtor profile and connect with active deal makers in your market.";
      robots = "noindex, nofollow";
    }

    if (!isLegalScreen && (user?.type === "contractor" || (screen === "app" && userType === "contractor"))) {
      const tabName = CONTRACTOR_TAB_LABELS[contractorTab] || "Dashboard";
      title = `${tabName} | Contractor Dashboard | DealBank`;
      description = "Private contractor dashboard for job leads, profile optimization, and earnings tracking.";
      robots = "noindex, nofollow";
    }

    if (!isLegalScreen && (user?.type === "realtor" || (screen === "app" && userType === "realtor"))) {
      const tabName = REALTOR_TAB_LABELS[realtorTab] || "Dashboard";
      title = `${tabName} | Realtor Dashboard | DealBank`;
      description = "Private realtor workspace for referrals, active listings, closed deals, and earnings splits.";
      robots = "noindex, nofollow";
    }

    if (!isLegalScreen && user?.type === "admin") {
      const tabName = ADMIN_TAB_LABELS[adminTab] || "Admin";
      title = `${tabName} | Admin Dashboard | DealBank`;
      description = "Internal admin dashboard for user, deal, and revenue operations.";
      robots = "noindex, nofollow";
    }

    applySeoMeta({ title, description, robots });
  }, [screen, user?.type, userType, flipTab, contractorTab, realtorTab, adminTab, showContractorOnboarding, showRealtorOnboarding]);

  function normalizeProfile(profile, authUser, fallback = {}) {
    const nameFromEmail = authUser?.email ? authUser.email.split("@")[0] : "User";
    return {
      id: profile?.id || authUser?.id,
      email: profile?.email || authUser?.email || "",
      name: profile?.name || fallback.name || authUser?.user_metadata?.name || nameFromEmail,
      type: normalizeUserType(profile?.type || fallback.type || authUser?.user_metadata?.type || userType || "dealmaker"),
      company: profile?.company ?? fallback.company ?? authUser?.user_metadata?.company ?? null,
      phone: profile?.phone ?? fallback.phone ?? authUser?.user_metadata?.phone ?? null,
    };
  }

  function buildFallbackProfile(authUser, fallback = {}) {
    return normalizeProfile(null, authUser, fallback);
  }

  async function resolveUserProfile(authUser, fallback = {}) {
    try {
      const profile = await upsertUserProfile(authUser, fallback);
      return normalizeProfile(profile, authUser, fallback);
    } catch {
      try {
        const { data: existingProfile, error } = await supabase
          .from("users")
          .select("id, email, name, type, company, phone")
          .eq("id", authUser.id)
          .maybeSingle();

        if (!error && existingProfile) return normalizeProfile(existingProfile, authUser, fallback);
      } catch {
        // no-op
      }

      return buildFallbackProfile(authUser, fallback);
    }
  }

  function applyAuthenticatedProfile(profile) {
    const normalized = normalizeProfile(profile, profile, { type: profile?.type, name: profile?.name });
    setUser(normalized);
    setUserType(normalized.type);
    setScreen("app");
    if (normalized.id) {
      loadPipeline(normalized.id);
    } else {
      setPipeline([]);
    }
  }

  function hydrateAuthenticatedProfile(authUser, fallback = {}) {
    const optimisticProfile = buildFallbackProfile(authUser, fallback);
    applyAuthenticatedProfile(optimisticProfile);

    resolveUserProfile(authUser, fallback)
      .then((resolvedProfile) => {
        applyAuthenticatedProfile(resolvedProfile);
      })
      .catch(() => {
        // Keep optimistic profile if DB/profile sync fails.
      });
  }

  async function upsertUserProfile(authUser, fallback = {}) {
    const nameFromEmail = authUser.email ? authUser.email.split("@")[0] : "User";
    const desiredType = normalizeUserType(fallback.type || authUser.user_metadata?.type || userType || "dealmaker");

    const profilePayload = {
      id: authUser.id,
      email: String(authUser.email || "").toLowerCase(),
      name: fallback.name || authUser.user_metadata?.name || nameFromEmail,
      type: desiredType,
      company: fallback.company || authUser.user_metadata?.company || null,
      phone: fallback.phone || authUser.user_metadata?.phone || null,
      email_verified: Boolean(authUser.email_confirmed_at),
      last_login: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from("users").upsert(profilePayload, { onConflict: "id" });
    if (upsertError) throw upsertError;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, name, type, company, phone")
      .eq("id", authUser.id)
      .single();

    if (profileError) throw profileError;
    return profile;
  }

  useEffect(() => {
    let alive = true;

    async function hydrateSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user || !alive) return;

      hydrateAuthenticatedProfile(data.session.user, {
        name: data.session.user.user_metadata?.name,
        type: data.session.user.user_metadata?.type,
      });
    }

    hydrateSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return;

      if (!session?.user) {
        setUser(null);
        setUserType("");
        setAuthNeedsVerification(false);
        setAuthVerificationEmail("");
        setPipeline([]);
        setShowDealmakerSubscriptionGate(false);
        setDealmakerGateState({ checking: false, launching: false, message: "" });
        setContractorTab("leads");
        setRealtorTab("referrals");
        setShowContractorOnboarding(false);
        setContractorOnboarding(createContractorOnboardingState());
        setContractorBillingRefreshTick(0);
        setShowRealtorOnboarding(false);
        setRealtorOnboarding(createRealtorOnboardingState());
        return;
      }

      hydrateAuthenticatedProfile(session.user, {
        name: session.user.user_metadata?.name,
        type: session.user.user_metadata?.type,
      });
    });

    return () => {
      alive = false;
      authSubscription.subscription.unsubscribe();
    };
    // hydrateAuthenticatedProfile is intentionally called from this one-time auth bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    let billingRefreshTimer;

    async function syncDealmakerSubscriptionState() {
      if (!user?.id || user?.type !== "dealmaker") {
        if (active) {
          setShowDealmakerSubscriptionGate(false);
          setDealmakerGateState({ checking: false, launching: false, message: "" });
        }
        return;
      }

      setDealmakerGateState((prev) => ({ ...prev, checking: true, message: "" }));

      const checkoutParams = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
      const checkoutKind = checkoutParams?.get("kind") || "";
      const checkoutStatus = checkoutParams?.get("checkout") || "";
      const checkoutSessionId = checkoutParams?.get("session_id") || "";

      if (checkoutKind === "subscription" && checkoutStatus === "success" && checkoutSessionId) {
        const alreadyConfirmed = confirmedCheckoutSessionsRef.current.has(checkoutSessionId);
        if (!alreadyConfirmed) {
          confirmedCheckoutSessionsRef.current.add(checkoutSessionId);
          try {
            await confirmCheckoutSession({
              sessionId: checkoutSessionId,
              userId: user.id,
            });
          } catch (error) {
            confirmedCheckoutSessionsRef.current.delete(checkoutSessionId);
            pushToast(error?.message || "Subscription payment received. Waiting for activation sync...", "info");
          }
        }
      }

      const { data: activeSubscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("id, status, plan")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (subscriptionError) {
        setShowDealmakerSubscriptionGate(true);
        setDealmakerGateState((prev) => ({
          ...prev,
          checking: false,
          message: `Unable to verify subscription: ${subscriptionError.message}`,
        }));
        return;
      }

      const normalizedPlan = String(activeSubscription?.plan || "").toLowerCase();
      const hasPaidAccess = isActiveSubscriptionStatus(activeSubscription?.status) && normalizedPlan === "dealmaker";

      if (hasPaidAccess) {
        setShowDealmakerSubscriptionGate(false);
        setDealmakerGateState((prev) => ({ ...prev, checking: false, launching: false, message: "" }));
      } else {
        const checkoutMessage = checkoutKind === "subscription" && checkoutStatus === "cancel"
          ? "Stripe checkout canceled. Complete your DealMaker subscription to unlock dashboard access."
          : checkoutKind === "subscription" && checkoutStatus === "success"
            ? "Payment received. Finalizing your DealMaker subscription..."
            : normalizedPlan && normalizedPlan !== "dealmaker"
              ? "Existing subscription plan does not include DealMaker access."
              : "DealMaker subscription required before dashboard access.";

        setShowDealmakerSubscriptionGate(true);
        setDealmakerGateState((prev) => ({ ...prev, checking: false, message: checkoutMessage }));

        if (checkoutKind === "subscription" && checkoutStatus === "success") {
          billingRefreshTimer = setTimeout(() => {
            if (!active) return;
            setDealmakerBillingRefreshTick((prev) => prev + 1);
          }, 3500);
        }
      }

      if (checkoutKind === "subscription" && (checkoutStatus === "success" || checkoutStatus === "cancel") && typeof window !== "undefined") {
        const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    syncDealmakerSubscriptionState();

    return () => {
      active = false;
      if (billingRefreshTimer) clearTimeout(billingRefreshTimer);
    };
  }, [user?.id, user?.type, dealmakerBillingRefreshTick, pushToast]);

  async function startDealmakerSubscriptionCheckout() {
    if (!user?.id) return;

    const checkoutEmail = String(user?.email || authForm.email || "").trim();
    if (!checkoutEmail) {
      setDealmakerGateState((prev) => ({ ...prev, launching: false, message: "User email missing. Sign out and sign back in, then retry." }));
      return;
    }

    const checkoutPriceId = getDealmakerSubscriptionPriceId();
    if (!checkoutPriceId) {
      setDealmakerGateState((prev) => ({ ...prev, launching: false, message: "Missing VITE_STRIPE_PRICE_DEALMAKER_MONTHLY in frontend env." }));
      return;
    }

    setDealmakerGateState((prev) => ({ ...prev, launching: true, message: "Redirecting to Stripe checkout..." }));

    try {
      await beginCheckout({
        priceId: checkoutPriceId,
        userId: user.id,
        email: checkoutEmail,
        mode: "subscription",
        source: "dealmaker_gate",
        successPath: "/",
      });
    } catch (error) {
      setDealmakerGateState((prev) => ({
        ...prev,
        launching: false,
        message: error?.message || "Failed to start DealMaker subscription checkout.",
      }));
    }
  }

  useEffect(() => {
    let active = true;
    let billingRefreshTimer;

    async function syncContractorOnboardingState() {
      if (!user?.id || user?.type !== "contractor") {
        if (active) setShowContractorOnboarding(false);
        return;
      }

      const checkoutParams = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
      const checkoutKind = checkoutParams?.get("kind") || "";
      const checkoutStatus = checkoutParams?.get("checkout") || "";
      const checkoutSessionId = checkoutParams?.get("session_id") || "";

      if (checkoutKind === "subscription" && checkoutStatus === "success" && checkoutSessionId) {
        const alreadyConfirmed = confirmedCheckoutSessionsRef.current.has(checkoutSessionId);
        if (!alreadyConfirmed) {
          confirmedCheckoutSessionsRef.current.add(checkoutSessionId);
          try {
            await confirmCheckoutSession({
              sessionId: checkoutSessionId,
              userId: user.id,
            });
          } catch (error) {
            confirmedCheckoutSessionsRef.current.delete(checkoutSessionId);
            pushToast(error?.message || "Subscription payment received. Waiting for activation sync...", "info");
          }
        }
      }

      const { data: contractorProfile, error: profileError } = await supabase
        .from("contractor_profiles")
        .select("id, city, years_experience, license_number, service_radius, rate_type, rate_amount, bio, is_licensed, is_insured, is_bonded, subscription_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active || profileError) return;

      const { data: activeSubscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("id, status, plan")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active || subscriptionError) return;

      const hasBillingAccess = isActiveSubscriptionStatus(activeSubscription?.status);

      if (!contractorProfile) {
        setShowContractorOnboarding(true);
        setContractorOnboarding((prev) => {
          if (prev.trades.length > 0) return prev;
          return createContractorOnboardingState(toOnboardingTradeLabel(authForm.trade));
        });
        return;
      }

      const { data: tradeRows, error: tradesError } = await supabase
        .from("contractor_trades")
        .select("trade")
        .eq("contractor_id", contractorProfile.id);

      if (!active || tradesError) return;

      const normalizedTrades = (tradeRows || [])
        .map((row) => (row.trade === "General Contractor" ? "GC" : row.trade))
        .filter(Boolean);
      const tradeText = normalizedTrades.join(", ");

      if (!hasBillingAccess) {
        setShowContractorOnboarding(true);
        setContractorOnboarding((prev) => {
          const checkoutMessage = checkoutKind === "subscription" && checkoutStatus === "cancel"
            ? "Stripe checkout canceled. Complete subscription to unlock dashboard access."
            : checkoutKind === "subscription" && checkoutStatus === "success"
              ? "Payment received. Finalizing your subscription..."
              : "Subscription required before dashboard access.";

          return {
            ...prev,
            step: 3,
            trades: normalizedTrades.length > 0 ? normalizedTrades : prev.trades,
            yearsInBusiness: String(contractorProfile.years_experience || prev.yearsInBusiness || ""),
            licenseNumber: contractorProfile.license_number || prev.licenseNumber || "",
            city: contractorProfile.city || prev.city || "",
            serviceRadius: String(contractorProfile.service_radius || prev.serviceRadius || ""),
            rateType: contractorProfile.rate_type || prev.rateType || "hourly",
            rateAmount: String(contractorProfile.rate_amount || prev.rateAmount || ""),
            bio: contractorProfile.bio || prev.bio || "",
            licensedAndInsured: Boolean(contractorProfile.is_licensed || contractorProfile.is_insured || prev.licensedAndInsured),
            bonded: Boolean(contractorProfile.is_bonded || prev.bonded),
            plan: contractorProfile.subscription_tier || activeSubscription?.plan || prev.plan || "basic",
            submitting: false,
            error: checkoutMessage,
          };
        });

        if (checkoutKind === "subscription" && checkoutStatus === "success") {
          billingRefreshTimer = setTimeout(() => {
            if (!active) return;
            setContractorBillingRefreshTick((prev) => prev + 1);
          }, 3500);
        }

        if (checkoutKind === "subscription" && checkoutStatus === "cancel" && typeof window !== "undefined") {
          const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        return;
      }

      setShowContractorOnboarding(false);
      setContractorOnboarding(createContractorOnboardingState());
      setUser((prev) => {
        if (!prev || prev.id !== user.id) return prev;
        const nextTrade = tradeText || prev.trade || "";
        const nextLocation = contractorProfile.city || prev.location || "";
        if (prev.trade === nextTrade && prev.location === nextLocation) return prev;
        return { ...prev, trade: nextTrade, location: nextLocation };
      });

      if (checkoutKind === "subscription" && (checkoutStatus === "success" || checkoutStatus === "cancel") && typeof window !== "undefined") {
        const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    syncContractorOnboardingState();

    return () => {
      active = false;
      if (billingRefreshTimer) clearTimeout(billingRefreshTimer);
    };
  }, [user?.id, user?.type, authForm.trade, contractorBillingRefreshTick, pushToast]);

  async function completeContractorOnboarding() {
    if (!user?.id) return;

    const required = [
      contractorOnboarding.yearsInBusiness,
      contractorOnboarding.licenseNumber,
      contractorOnboarding.city,
      contractorOnboarding.serviceRadius,
      contractorOnboarding.rateType,
      contractorOnboarding.rateAmount,
      contractorOnboarding.bio,
    ];

    if (contractorOnboarding.trades.length === 0) {
      setContractorOnboarding((prev) => ({ ...prev, error: "Select at least one trade before subscribing." }));
      return;
    }

    if (required.some((value) => String(value || "").trim() === "")) {
      setContractorOnboarding((prev) => ({ ...prev, error: "Complete all contractor details before subscribing." }));
      return;
    }

    setContractorOnboarding((prev) => ({ ...prev, submitting: true, error: "" }));

    try {
      const profilePayload = {
        user_id: user.id,
        years_experience: Number(contractorOnboarding.yearsInBusiness),
        license_number: contractorOnboarding.licenseNumber,
        city: contractorOnboarding.city,
        service_radius: Number(contractorOnboarding.serviceRadius),
        rate_type: contractorOnboarding.rateType,
        rate_amount: Number(contractorOnboarding.rateAmount),
        bio: contractorOnboarding.bio,
        is_licensed: contractorOnboarding.licensedAndInsured,
        is_insured: contractorOnboarding.licensedAndInsured,
        is_bonded: contractorOnboarding.bonded,
        subscription_tier: contractorOnboarding.plan,
        verified_badge: contractorOnboarding.plan === "pro",
      };

      const { data: contractorProfile, error: upsertProfileError } = await supabase
        .from("contractor_profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select("id, city")
        .single();

      if (upsertProfileError) throw upsertProfileError;

      const { error: clearTradesError } = await supabase
        .from("contractor_trades")
        .delete()
        .eq("contractor_id", contractorProfile.id);
      if (clearTradesError) throw clearTradesError;

      const tradesPayload = contractorOnboarding.trades.map((trade) => ({
        contractor_id: contractorProfile.id,
        trade: trade === "GC" ? "General Contractor" : trade,
      }));

      const { error: insertTradesError } = await supabase
        .from("contractor_trades")
        .insert(tradesPayload);
      if (insertTradesError) throw insertTradesError;

      const checkoutEmail = String(user.email || authForm.email || "").trim();
      if (!checkoutEmail) {
        throw new Error("User email is missing. Please sign in again before subscribing.");
      }

      const checkoutPriceId = getContractorSubscriptionPriceId(contractorOnboarding.plan);
      if (!checkoutPriceId) {
        throw new Error("Unable to resolve contractor Stripe price id.");
      }

      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          trade: contractorOnboarding.trades.join(", "),
          location: contractorOnboarding.city,
        };
      });

      await beginCheckout({
        priceId: checkoutPriceId,
        userId: user.id,
        email: checkoutEmail,
        mode: "subscription",
        source: "contractor_onboarding",
        successPath: "/",
      });

      setContractorOnboarding((prev) => ({
        ...prev,
        submitting: false,
        error: "Redirecting to Stripe checkout...",
      }));
    } catch (error) {
      setContractorOnboarding((prev) => ({
        ...prev,
        submitting: false,
        error: error?.message || "Failed to save contractor onboarding.",
      }));
      showAlert(error?.message || "Gagal menyimpan data pendaftaran.", "Pendaftaran Gagal", "error");
    }
  }

  useEffect(() => {
    let active = true;

    async function syncRealtorOnboardingState() {
      if (!user?.id || user?.type !== "realtor") {
        if (active) setShowRealtorOnboarding(false);
        return;
      }

      const { data: realtorProfile, error: profileError } = await supabase
        .from("realtor_profiles")
        .select("id, dre_license, brokerage, avg_days_to_close, deals_per_year, bio")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active || profileError) return;

      if (!realtorProfile) {
        setShowRealtorOnboarding(true);
        setRealtorOnboarding((prev) => {
          if (prev.step !== 1 || prev.dreLicense || prev.brokerage || prev.bio) return prev;
          return {
            ...createRealtorOnboardingState(),
            error: "",
          };
        });
        return;
      }

      const { data: marketRows, error: marketsError } = await supabase
        .from("realtor_markets")
        .select("city")
        .eq("realtor_id", realtorProfile.id);
      if (!active || marketsError) return;

      const { data: specialtyRows, error: specialtiesError } = await supabase
        .from("realtor_specialties")
        .select("specialty")
        .eq("realtor_id", realtorProfile.id);
      if (!active || specialtiesError) return;

      const markets = (marketRows || []).map((row) => row.city).filter(Boolean);
      const specialties = (specialtyRows || []).map((row) => row.specialty).filter(Boolean);
      const profileCompleted = markets.length > 0 && specialties.length > 0;

      if (profileCompleted) {
        setShowRealtorOnboarding(false);
        setRealtorOnboarding(createRealtorOnboardingState());
        setUser((prev) => {
          if (!prev || prev.id !== user.id) return prev;
          return { ...prev, location: markets[0] || prev.location || "" };
        });
        return;
      }

      setShowRealtorOnboarding(true);
      setRealtorOnboarding((prev) => ({
        ...prev,
        step: prev.step > 1 ? prev.step : 2,
        dreLicense: prev.dreLicense || realtorProfile.dre_license || "",
        brokerage: prev.brokerage || realtorProfile.brokerage || "",
        avgDaysToClose: prev.avgDaysToClose || String(realtorProfile.avg_days_to_close || ""),
        dealsPerYear: prev.dealsPerYear || String(realtorProfile.deals_per_year || ""),
        bio: prev.bio || realtorProfile.bio || "",
        markets: prev.markets.length > 0 ? prev.markets : markets,
        specialties: prev.specialties.length > 0 ? prev.specialties : specialties,
        submitting: false,
        error: "Select at least one market and one specialty to activate your realtor dashboard.",
      }));
    }

    syncRealtorOnboardingState();

    return () => {
      active = false;
    };
  }, [user?.id, user?.type]);

  async function completeRealtorOnboarding() {
    if (!user?.id) return;

    const required = [
      realtorOnboarding.dreLicense,
      realtorOnboarding.brokerage,
      realtorOnboarding.avgDaysToClose,
      realtorOnboarding.dealsPerYear,
      realtorOnboarding.bio,
    ];

    if (required.some((value) => String(value || "").trim() === "")) {
      const msg = "Mohon lengkapi semua data profil sebelum melanjutkan.";
      setRealtorOnboarding((prev) => ({ ...prev, error: msg }));
      showAlert(msg, "Data Belum Lengkap", "warning");
      return;
    }

    if (realtorOnboarding.markets.length === 0 || realtorOnboarding.specialties.length === 0) {
      setRealtorOnboarding((prev) => ({ ...prev, error: "Select at least one market and one specialty." }));
      return;
    }

    setRealtorOnboarding((prev) => ({ ...prev, submitting: true, error: "" }));

    try {
      const profilePayload = {
        user_id: user.id,
        dre_license: realtorOnboarding.dreLicense,
        brokerage: realtorOnboarding.brokerage,
        avg_days_to_close: Number(realtorOnboarding.avgDaysToClose),
        deals_per_year: Number(realtorOnboarding.dealsPerYear),
        bio: realtorOnboarding.bio,
      };

      const { data: realtorProfile, error: upsertProfileError } = await supabase
        .from("realtor_profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select("id")
        .single();
      if (upsertProfileError) throw upsertProfileError;

      const { error: clearMarketsError } = await supabase
        .from("realtor_markets")
        .delete()
        .eq("realtor_id", realtorProfile.id);
      if (clearMarketsError) throw clearMarketsError;

      const marketsPayload = realtorOnboarding.markets.map((city) => ({
        realtor_id: realtorProfile.id,
        city,
      }));

      const { error: insertMarketsError } = await supabase
        .from("realtor_markets")
        .insert(marketsPayload);
      if (insertMarketsError) throw insertMarketsError;

      const { error: clearSpecialtiesError } = await supabase
        .from("realtor_specialties")
        .delete()
        .eq("realtor_id", realtorProfile.id);
      if (clearSpecialtiesError) throw clearSpecialtiesError;

      const specialtiesPayload = realtorOnboarding.specialties.map((specialty) => ({
        realtor_id: realtorProfile.id,
        specialty,
      }));

      const { error: insertSpecialtiesError } = await supabase
        .from("realtor_specialties")
        .insert(specialtiesPayload);
      if (insertSpecialtiesError) throw insertSpecialtiesError;

      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          location: realtorOnboarding.markets[0] || prev.location || "",
        };
      });

      setShowRealtorOnboarding(false);
      setRealtorOnboarding(createRealtorOnboardingState());
      pushToast("Realtor profile activated. Dashboard unlocked.", "success");
    } catch (error) {
      setRealtorOnboarding((prev) => ({
        ...prev,
        submitting: false,
        error: error?.message || "Failed to save realtor onboarding.",
      }));
      showAlert(error?.message || "Gagal mengaktifkan profil realtor.", "Gagal Aktivasi", "error");
    }
  }

  async function handleAuth() {
    setAuthError("");
    setAuthNeedsVerification(false);
    setAuthVerificationEmail("");

      // Ensure AI responds without emoji/tables and uses paragraphs/lists only
      // (the server-side Claude proxy also sanitizes output as a safeguard)
    if (!authForm.email || !authForm.password) {
      setAuthError("Fill in all fields.");
      return;
    }

    const normalizedAuthEmail = String(authForm.email || "").trim().toLowerCase();
    const isLocalHost = typeof window !== "undefined"
      && ["localhost", "127.0.0.1"].includes(String(window.location?.hostname || "").toLowerCase());
    const canUseAdminBypass = ADMIN_BYPASS_ENABLED && isLocalHost;

    if (ADMIN_BYPASS_ENABLED && !isLocalHost) {
      // Production hardening: bypass can never activate outside local development.
      console.warn("Admin bypass env is enabled but blocked because host is not localhost.");
    }

    if (canUseAdminBypass && ADMIN_EMAIL_ENV && normalizedAuthEmail === ADMIN_EMAIL_ENV && ADMIN_PASSWORD_ALIASES.has(authForm.password)) {
      const adminUser = { name: "Admin", email: ADMIN_EMAIL_ENV, type: "admin" };
      setUser(adminUser);
      setUserType("admin");
      setScreen("admin");
      return;
    }

    if (authMode === "signup" && !authForm.name) {
      setAuthError("Enter your name.");
      return;
    }

    if (authMode === "signup" && normalizeUserType(userType || "dealmaker") === "dealmaker") {
      if (!String(authForm.company || "").trim()) {
        setAuthError("Enter your company.");
        return;
      }
      if (!String(authForm.phone || "").trim()) {
        setAuthError("Enter your phone number.");
        return;
      }
    }

    try {
      if (authMode === "signup") {
        const desiredType = normalizeUserType(userType || "dealmaker");

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedAuthEmail,
          password: authForm.password,
          options: {
            emailRedirectTo: resolveAuthEmailRedirect(),
            data: {
              name: authForm.name,
              type: desiredType,
              trade: authForm.trade,
              location: authForm.location,
              company: authForm.company,
              phone: authForm.phone,
            },
          },
        });

        if (signUpError) {
          if (isRateLimitError(signUpError)) {
            setAuthNeedsVerification(true);
            setAuthVerificationEmail(normalizedAuthEmail);
            setAuthError("Verification email rate limit reached. Wait a few minutes, then resend verification email.");
            return;
          }

          if (isUserExistsError(signUpError)) {
            setAuthError("This email is already registered. Try login mode or reset your password.");
            setAuthMode("login");
            return;
          }

          const errMsg = signUpError.message || "Unable to create account.";
          setAuthError(errMsg);
          showAlert(errMsg, "Gagal Daftar", "error");
          return;
        }

        const authUser = signUpData?.user;
        if (!authUser) {
          const errMsg = "Unable to complete signup. Please try login.";
          setAuthError(errMsg);
          showAlert(errMsg, "Gagal Daftar", "error");
          return;
        }

        if (!signUpData?.session) {
          setAuthMode("login");
          setAuthNeedsVerification(true);
          setAuthVerificationEmail(normalizedAuthEmail);
          setAuthError("Signup success. Check inbox/spam, confirm your email, then login.");
          return;
        }

        hydrateAuthenticatedProfile(authUser, {
          name: authForm.name,
          type: desiredType,
          company: authForm.company,
          phone: authForm.phone,
        });
        return;
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedAuthEmail,
        password: authForm.password,
      });

      if (loginError || !loginData?.user) {
        if (isInvalidCredentialError(loginError) && normalizedAuthEmail.endsWith("@dealbank.local")) {
          const msg = "Email atau password salah. Pastikan data login Anda benar.";
          setAuthError(msg);
          showAlert(msg, "Login Gagal", "error");
          return;
        }

        if (isEmailNotConfirmedError(loginError)) {
          setAuthNeedsVerification(true);
          setAuthVerificationEmail(normalizedAuthEmail);
          setAuthError("Email is not confirmed yet. Check inbox/spam, then click Resend verification email if you have not received the link.");
          return;
        }

        const errMsg = loginError?.message || "Invalid email or password.";
        setAuthError(errMsg);
        showAlert(errMsg, "Login Gagal", "error");
        return;
      }

      hydrateAuthenticatedProfile(loginData.user, {
        name: loginData.user.user_metadata?.name,
        type: loginData.user.user_metadata?.type,
        company: loginData.user.user_metadata?.company,
        phone: loginData.user.user_metadata?.phone,
      });
    } catch (error) {
      setAuthError(error?.message || "Authentication failed.");
      showAlert(error?.message || "Gagal melakukan autentikasi.", "Error Autentikasi", "error");
    }
  }

  async function resendVerificationEmail() {
    const targetEmail = String(authVerificationEmail || authForm.email || "").trim().toLowerCase();
    if (!targetEmail) {
      setAuthError("Enter your email first.");
      return;
    }

    setAuthError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: resolveAuthEmailRedirect(),
        },
      });

      if (error) {
        setAuthError(error.message || "Unable to resend verification email.");
        return;
      }

      setAuthNeedsVerification(true);
      setAuthVerificationEmail(targetEmail);
      setAuthError(`Verification email sent to ${targetEmail}. Check inbox and spam.`);
    } catch (error) {
      setAuthError(error?.message || "Unable to resend verification email.");
    }
  }

  const loadPipeline = useCallback(async (userId, options = {}) => {
    const { focusDealId = "" } = options;

    if (!userId) {
      setPipeline([]);
      return;
    }

    const cachedPipeline = readCachedPipeline(userId);
    if (cachedPipeline.length > 0) {
      setPipeline(cachedPipeline);
      if (focusDealId) {
        setPipelineFocusDealId(focusDealId);
      }
    }

    if (isLikelyOffline()) {
      if (cachedPipeline.length === 0) {
        pushToast("Offline mode: no cached pipeline found yet.", "error");
      }
      return;
    }

    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false });

    if (error) {
      if (cachedPipeline.length > 0 && isPipelineNetworkError(error)) {
        pushToast("Offline mode: showing cached pipeline. Changes will sync on reconnect.", "info");
        return;
      }

      pushToast(`Pipeline sync failed: ${error.message}`, "error");
      return;
    }

    const mappedPipeline = (data || []).map(mapDealRowToPipeline);
    setPipeline(mappedPipeline);
    writeCachedPipeline(userId, mappedPipeline);

    if (focusDealId) {
      setPipelineFocusDealId(focusDealId);
    }
  }, [pushToast]);

  async function saveDeal() {
    if (!user?.id) {
      setSavedMsg("Please login first.");
      return;
    }

    const trimmedAddress = String(address || "").trim();
    if (!trimmedAddress) {
      setSavedMsg("Address is required before saving.");
      return;
    }

    if (arvNum <= 0) {
      setSavedMsg("ARV must be greater than 0 before saving.");
      return;
    }

    const payload = {
      user_id: user.id,
      address: trimmedAddress,
      arv: arvNum,
      offer_pct: offerPctNum,
      offer_price: offer,
      stage: "Analyzing",
      saved_at: new Date().toISOString(),
      reno_kitchen: toNum(reno.kitchen),
      reno_bathrooms: toNum(reno.bathrooms),
      reno_flooring: toNum(reno.flooring),
      reno_paint: toNum(reno.paint),
      reno_hvac: toNum(reno.hvac),
      reno_plumbing: toNum(reno.plumbing),
      reno_electrical: toNum(reno.electrical),
      reno_roof: toNum(reno.roof),
      reno_windows: toNum(reno.windows),
      reno_landscaping: toNum(reno.landscaping),
      reno_foundation: toNum(reno.foundation),
      reno_misc: toNum(reno.misc),
      hm_rate: rateNum,
      hm_months: moNum,
      hm_points: ptsNum,
      hold_months: holdMonthsNum,
      hold_monthly: holdMonthlyNum,
      insurance_annual: insuranceAnnualNum,
      agent_fee_pct: agentFeePctNum,
      closing_cost_pct: closingCostPctNum,
      total_reno: totalReno,
      total_hm: totalHM,
      total_holding: totalHolding,
      total_selling: totalSelling,
      all_in_cost: allIn,
      net_profit: projProfit,
      roi: Number(roi.toFixed(2)),
    };

    const queueDealInsert = () => {
      const localDealId = `local-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const localPipelineDeal = mapDealRowToPipeline({
        id: localDealId,
        ...payload,
      });

      queuePipelineOperation(user.id, {
        type: "insert",
        localId: localDealId,
        payload: {
          localId: localDealId,
          dbRow: payload,
        },
      });

      setPipeline((prev) => [localPipelineDeal, ...prev]);
      setPipelineFocusDealId(localDealId);
      setFlipTab("pipeline");
      setSavedMsg("Offline mode: deal queued and will sync automatically.");
      pushToast("Offline mode: deal queued for sync.", "info");
      setTimeout(() => setSavedMsg(""), 3000);
    };

    if (isLikelyOffline()) {
      queueDealInsert();
      return;
    }

    const { data: insertedDeal, error } = await supabase
      .from("deals")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      if (isPipelineNetworkError(error)) {
        queueDealInsert();
        return;
      }

      setSavedMsg(`Save failed: ${error.message}`);
      pushToast(`Deal save failed: ${error.message}`, "error");
      return;
    }

    await loadPipeline(user.id, { focusDealId: insertedDeal?.id || "" });
    setFlipTab("pipeline");
    setSavedMsg("Saved to pipeline! Opening Pipeline tab...");
    pushToast("Deal saved to pipeline.", "success");
    setTimeout(() => setSavedMsg(""), 3000);
  }

  async function updateDealStage(deal, stage) {
    if (!user?.id) return;

    const updated = { ...deal, stage };
    const prevPipeline = pipeline;
    const prevActiveDeal = activeDeal;
    const prevShowRealtor = showRealtor;

    setPipeline((prev) => prev.map((item) => (item.id === deal.id ? { ...item, stage } : item)));
    setActiveDeal((prev) => (prev?.id === deal.id ? updated : prev));
    if (stage === "Selling") setShowRealtor(true);

    if (isLikelyOffline()) {
      queuePipelineOperation(user.id, {
        type: "update-stage",
        dealId: deal.id,
        stage,
      });
      pushToast("Offline mode: stage change queued for sync.", "info");
      return;
    }

    const { error } = await supabase
      .from("deals")
      .update({ stage })
      .eq("id", deal.id)
      .eq("user_id", user.id);

    if (error) {
      if (isPipelineNetworkError(error)) {
        queuePipelineOperation(user.id, {
          type: "update-stage",
          dealId: deal.id,
          stage,
        });
        pushToast("Network issue detected. Stage change queued for sync.", "info");
        return;
      }

      setPipeline(prevPipeline);
      setActiveDeal(prevActiveDeal);
      setShowRealtor(prevShowRealtor);
      pushToast(`Failed to update stage: ${error.message}`, "error");
      return;
    }

    await loadPipeline(user.id, { focusDealId: deal.id });
    setActiveDeal(updated);
    if (stage === "Selling") setShowRealtor(true);
  }

  async function deleteDeal(dealId) {
    if (!user?.id || !dealId) return;

    const prevPipeline = pipeline;
    const prevActiveDeal = activeDeal;
    const prevShowRealtor = showRealtor;

    setPipeline((prev) => prev.filter((deal) => deal.id !== dealId));
    if (activeDeal?.id === dealId) {
      setActiveDeal(null);
      setShowRealtor(false);
    }

    if (isLikelyOffline()) {
      queuePipelineOperation(user.id, {
        type: "delete",
        dealId,
      });
      pushToast("Offline mode: delete queued for sync.", "info");
      return;
    }

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId)
      .eq("user_id", user.id);

    if (error) {
      if (isPipelineNetworkError(error)) {
        queuePipelineOperation(user.id, {
          type: "delete",
          dealId,
        });
        pushToast("Network issue detected. Delete queued for sync.", "info");
        return;
      }

      setPipeline(prevPipeline);
      setActiveDeal(prevActiveDeal);
      setShowRealtor(prevShowRealtor);
      pushToast(`Failed to delete deal: ${error.message}`, "error");
      return;
    }

    await loadPipeline(user.id);
    pushToast("Deal deleted.", "success");
  }

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`deals-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deals",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadPipeline(user.id);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          pushToast("Realtime pipeline sync disconnected. Refresh page if changes stop appearing.", "error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadPipeline, pushToast]);

  useEffect(() => {
    if (!user?.id) return;
    writeCachedPipeline(user.id, pipeline);
  }, [user?.id, pipeline]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return undefined;

    let syncing = false;

    const syncQueuedPipeline = async () => {
      if (syncing) return;
      if (isLikelyOffline()) return;

      syncing = true;
      try {
        const syncResult = await flushPipelineQueue({
          userId: user.id,
          supabase,
        });

        if (syncResult.processed > 0) {
          pushToast(`Synced ${syncResult.processed} offline pipeline change(s).`, "success");
        }

        if (syncResult.failed > 0) {
          pushToast(`Some queued pipeline changes failed (${syncResult.failed}).`, "error");
        }

        if (syncResult.processed > 0 || syncResult.failed > 0) {
          await loadPipeline(user.id);
        }
      } finally {
        syncing = false;
      }
    };

    syncQueuedPipeline();
    window.addEventListener("online", syncQueuedPipeline);

    return () => {
      window.removeEventListener("online", syncQueuedPipeline);
    };
  }, [user?.id, loadPipeline, pushToast]);

  const lookupProperty = useCallback(async () => {
    const lookupInput = address.trim();

    if (!lookupInput) {
      setLookErr("Enter an address first.");
      return;
    }

    if (!isLikelyPropertyLookupInput(lookupInput)) {
      setLookErr("Use a full address, propertyId, id format address:<propertyId>, or a property URL.");
      return;
    }

    setLookErr("");
    setLookLoad(true);
    setPropData(null);
    setCompsData(null);
    setAvmData(null);
    setMktNotes("");
    setPropertyIntel(null);
    setAnalysis("");

    const warnings = [];
    let hasStructuredData = false;

    try {
      const intelligence = await fetchPropertyIntelligence(lookupInput);
      if (intelligence) {
        setPropertyIntel(intelligence);
      }

      const normalized = intelligence?.normalized;
      const propertyHasCoreFields = Number(normalized?.property?.squareFootage || 0) > 0
        || Number(normalized?.property?.bedrooms || 0) > 0
        || Number(normalized?.property?.bathrooms || 0) > 0
        || Number(normalized?.property?.yearBuilt || 0) > 0;
      const avmHasCoreFields = Number(normalized?.avm?.price || 0) > 0
        || Number(normalized?.avm?.priceRangeHigh || 0) > 0;

      if (normalized?.property && typeof normalized.property === "object") {
        setPropData(normalized.property);
        hasStructuredData = hasStructuredData || propertyHasCoreFields;
      }

      if (normalized?.avm && typeof normalized.avm === "object") {
        setAvmData(normalized.avm);
        hasStructuredData = hasStructuredData || avmHasCoreFields;
      }

      if (Array.isArray(normalized?.comps) && normalized.comps.length > 0) {
        setCompsData(normalized.comps);
        hasStructuredData = true;
      }

      if (normalized?.marketNotes) {
        setMktNotes(normalized.marketNotes);
      }

      if (intelligence?.warning) {
        warnings.push(intelligence.warning);
      }
    } catch (error) {
      warnings.push(`Realty Base: ${error?.message || "property intelligence unavailable"}`);
    }

    if (!hasStructuredData) {
      try {
        const raw = await askClaude(
          `Real estate analyst. Return property data for "${lookupInput}".
Return ONLY raw JSON no markdown:
{"property":{"bedrooms":3,"bathrooms":2,"squareFootage":1450,"yearBuilt":1985,"propertyType":"Single Family","lotSize":6500,"lastSalePrice":310000,"lastSaleDate":"2021-03-10"},"avm":{"price":420000,"priceRangeLow":395000,"priceRangeHigh":448000},"comps":[{"address":"nearby st","price":415000,"squareFootage":1380,"bedrooms":3,"bathrooms":2,"daysOld":42,"distance":0.4},{"address":"nearby ave","price":432000,"squareFootage":1510,"bedrooms":3,"bathrooms":2,"daysOld":28,"distance":0.7},{"address":"nearby blvd","price":408000,"squareFootage":1420,"bedrooms":3,"bathrooms":2,"daysOld":65,"distance":1.2}],"marketNotes":"2 sentences about this market."}
Use real data for "${lookupInput}". avm.price = ARV after full renovation.`,
          1200,
        );

        const parsed = extractJSON(raw);

        if (parsed.property) {
          setPropData(parsed.property);
          hasStructuredData = true;
        }
        if (parsed.avm) {
          setAvmData(parsed.avm);
          hasStructuredData = true;
        }
        if (parsed.comps?.length) {
          setCompsData(parsed.comps);
          hasStructuredData = true;
        }
        if (parsed.marketNotes) {
          setMktNotes(parsed.marketNotes);
        }
      } catch (error) {
        warnings.push(`Claude fallback: ${error?.message || "lookup failed"}`);
      }
    }

    if (!hasStructuredData) {
      const errMsg = warnings.join(" | ") || "unable to load property data";
      setLookErr(`Failed: ${errMsg}`);
      showAlert(errMsg, "Gagal Memuat Data", "error");
    } else if (warnings.length > 0) {
      const warnMsg = warnings.join(" | ");
      setLookErr(`Warning: ${warnMsg}`);
      showAlert(warnMsg, "Peringatan Data", "warning");
    }

    if (hasStructuredData) {
      setTimeout(() => offerRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }

    setLookLoad(false);
  }, [address]);

  async function estimateReno() {
    if (!address.trim()) return;
    setRenoLoad(true);
    try {
      const raw = await askClaude(
        `Fix-and-flip cost estimator. Estimate rehab for: ${address} | ${propData?.squareFootage || "?"}sqft | ${propData?.bedrooms || "?"}bd/${propData?.bathrooms || "?"}ba | Built ${propData?.yearBuilt || "?"}
Return ONLY raw JSON:
{"roof":0,"foundation":0,"hvac":5000,"plumbing":3000,"electrical":4000,"kitchen":18000,"bathrooms":12000,"flooring":8000,"paint":6000,"windows":4000,"landscaping":2500,"misc":7000,"notes":"local cost context"}
Fill in real numbers for this market.`,
        700,
      );
      const parsed = extractJSON(raw);
      const updated = {};
      RENO_KEYS.forEach((c) => {
        updated[c.key] = parsed[c.key] ? String(parsed[c.key]) : "0";
      });
      setReno(updated);
      if (parsed.notes) setRenoNote(parsed.notes);
    } catch {
      // no-op
    }
    setRenoLoad(false);
  }

  async function runAnalysis() {
    if (!arvNum) {
      setAnlErr("Look up a property first.");
      return;
    }
    setAnlErr("");
    setAnlLoad(true);
    setAnalysis("");
    const compsText = (compsData || []).map((c) => `${c.address} - ${fmt(c.price)}, ${c.squareFootage}sqft, ${c.bedrooms}bd/${c.bathrooms}ba, ${c.daysOld}d ago`).join("\n");
    const rawPropertyContext = propertyIntel?.promptContext
      ? JSON.stringify(propertyIntel.promptContext)
      : "";
    const propertyGrounding = rawPropertyContext.length > 7000
      ? `${rawPropertyContext.slice(0, 7000)}...[truncated]`
      : rawPropertyContext;

    try {
      const text = await askClaude(
        `Senior fix-and-flip analyst. Direct deal review.
PRIMARY MARKET DATA SOURCE: ${propertyIntel?.provider || "not available"}${propertyIntel?.endpoint ? ` (${propertyIntel.endpoint})` : ""}
PRIMARY MARKET DATA JSON (use this as MANDATORY factual grounding for property characteristics, historical sales, and AVM when available): ${propertyGrounding || "No external market JSON provided"}
PROPERTY: ${address} | ARV: ${fmt(arvNum)} | ${offerPctNum}%: ${fmt(sixtyT)} | OFFER: ${fmt(offer)}
COSTS: Rehab ${fmt(Math.round(totalReno))} | Holding ${fmt(Math.round(totalHolding))} | Selling ${fmt(Math.round(totalSelling))} | Soft Total ${fmt(Math.round(softNum))} | HM ${fmt(Math.round(totalHM))} | ALL-IN ${fmt(Math.round(allIn))}
PROFIT: ${fmt(Math.round(projProfit))} | ROI: ${roi.toFixed(1)}% | TARGET: ${fmt(targetP)}
COMPS:\n${compsText}
RENO: ${RENO_KEYS.map((c) => `${c.label}: ${fmt(toNum(reno[c.key]))}`).join(" | ")}
HOLDING INPUTS: ${holdMonthsNum} mo @ ${fmt(holdMonthlyNum)}/mo + insurance ${fmt(insuranceAnnualNum)}/yr
SELLING INPUTS: agent ${agentFeePctNum}% | closing ${closingCostPctNum}%

UNDERWRITING RULES:
1. If PRIMARY MARKET DATA JSON is provided, treat it as the "Golden Source".
2. Cross-reference manual inputs (RENO, ARV) against the JSON facts. 
3. If the JSON suggests a lower ARV than the manual input, provide a WARNING.
4. Calculate 'Maximum Allowable Offer' based strictly on the math provided.

Response format:
**1. DEAL VERDICT (Pass/Fail/Caution)** 
**2. GOLDEN DATA CHECK (Did JSON match inputs?)**
**3. OFFER ANALYSIS** 
**4. RENO FLAGS** 
**5. TOP 3 RISKS** 
**6. BOTTOM LINE**

OUTPUT GUIDELINES: Reply using plain paragraphs and numbered or lettered lists only. Do NOT include emoji, markdown tables, or other decorative characters.`,
      );
  // Instruct model to avoid emoji/tables; server proxy will further sanitize output
  // OUTPUT GUIDELINES: Reply using plain paragraphs and numbered or lettered lists only. Do NOT include emoji, markdown tables, or other decorative characters.
      setAnalysis(text);
    } catch (err) {
      setAnlErr(`Failed: ${err.message}`);
      showAlert(err.message, "Analisis Gagal", "error");
    }
    setAnlLoad(false);
  }

  async function generatePitch() {
    if (!address.trim() || !arvNum) {
      setAnlErr("Look up a property first.");
      return;
    }
    setPitchLoad(true);
    setPitch("");
    setShowPitch(true);

    const compsLines = (compsData || []).slice(0, 3).map((c) => `- ${c.address}: ${fmt(c.price)}, sold ${c.daysOld}d ago`).join(" | ");
    const msgParts = [
      "Write a warm professional 4-paragraph cash offer letter from a real estate investor to a homeowner.",
      "Tone: honest, respectful, data-driven. Not pushy.",
      `PROPERTY: ${address}${propData ? ` | ${propData.bedrooms || "?"}bd/${propData.bathrooms || "?"}ba | ${propData.squareFootage || "?"}sqft | Built ${propData.yearBuilt || "?"}` : ""}`,
      `CASH OFFER: ${fmt(offer)} (${Math.round((offer / arvNum) * 100)}% of renovated market value)`,
      `ARV (after full renovation): ${fmt(arvNum)}`,
      compsLines ? `RECENT COMPARABLE SALES (2-mile radius): ${compsLines}` : "",
      "COST BREAKDOWN why investor cannot pay more:",
      `- Renovation: ${fmt(Math.round(totalReno))}`,
      `- Hard money loan cost: ${fmt(Math.round(totalHM))}`,
      `- Holding costs (carry + insurance): ${fmt(Math.round(totalHolding))}`,
      `- Selling costs (agent + closing): ${fmt(Math.round(totalSelling))}`,
      `- Soft costs total: ${fmt(Math.round(softNum))}`,
      `- Total costs above purchase: ${fmt(Math.round(allIn - offer))}`,
      `- Required investor profit margin: ${fmt(Math.round(projProfit))} (${roi.toFixed(1)}% ROI)`,
      "Paragraph 1: Who the investor is, local cash buyer, respects homeowner time.",
      "Paragraph 2: What renovated homes nearby sell for and what that means for as-is value.",
      "Paragraph 3: Cost breakdown showing the offer is math not a lowball.",
      "Paragraph 4: Cash offer benefits - speed, certainty, as-is, no repairs, no seller agent fees, flexible close.",
      "Sign off with [Investor Name], Cash Offers LLC, [Phone], [Email].",
      "OUTPUT GUIDELINES: Return the letter as plain paragraphs. Do not include emoji or markdown tables.",
    ].filter(Boolean).join(" ");

    try {
      const response = await askClaude(msgParts, 1000);
      setPitch(response || "No response - try again.");
    } catch (err) {
      setPitch(`Error: ${err.message}`);
    }
    setPitchLoad(false);
  }

  const onSignOut = () => {
    setUser(null);
    setUserType("");
    setScreen("landing");
    setPipeline([]);
    setPipelineFocusDealId("");
    setToast({ text: "", tone: "info" });
    setShowDealmakerSubscriptionGate(false);
    setDealmakerGateState({ checking: false, launching: false, message: "" });
    setContractorTab("leads");
    setRealtorTab("referrals");
    setActiveDeal(null);
    setShowContractorOnboarding(false);
    setContractorOnboarding(createContractorOnboardingState());
    setContractorBillingRefreshTick(0);
    setShowRealtorOnboarding(false);
    setRealtorOnboarding(createRealtorOnboardingState());

    // Local scope clears persisted session instantly and avoids blocking UI on network calls.
    supabase.auth.signOut({ scope: "local" }).catch(() => {
      // no-op
    });
  };

  const dealMakerCtx = {
    G,
    card,
    lbl,
    smIn,
    btnG,
    btnO,
    fmt,
    toNum,
    flipTab,
    setFlipTab,
    user,
    onSignOut,
    RENO_KEYS,
    PIPELINE_STAGES,
    DEALMAKER_CONTENT,
    STATE_LAWS,
    SOFTWARE_REVIEWS,
    INSURANCE_PARTNERS,
    MORTGAGE_PARTNERS,
    AD_SLOTS,
    MOCK_CONTRACTORS,
    MOCK_REALTORS,
    address,
    setAddress,
    lookupProperty,
    lookLoad,
    lookErr,
    arvNum,
    offerRef,
    offer,
    offerPct,
    setOfferPct,
    sixtyT,
    totalReno,
    softNum,
    holdMonths,
    setHoldMonths,
    holdMonthly,
    setHoldMonthly,
    insuranceAnnual,
    setInsuranceAnnual,
    agentFeePct,
    setAgentFeePct,
    closingCostPct,
    setClosingCostPct,
    holdN,
    insN,
    agentN,
    closingN,
    totalHolding,
    totalSelling,
    totalHM,
    arvOvr,
    setArvOvr,
    allIn,
    projProfit,
    roi,
    anlTab,
    setAnlTab,
    estimateReno,
    renoLoad,
    renoNote,
    reno,
    setReno,
    hardRate,
    setHardRate,
    loanMo,
    setLoanMo,
    loanPts,
    setLoanPts,
    compsData,
    propertyIntel,
    mktNotes,
    saveDeal,
    runAnalysis,
    anlLoad,
    generatePitch,
    pitchLoad,
    savedMsg,
    anlErr,
    showPitch,
    pitch,
    setPitch,
    setShowPitch,
    analysis,
    activeDeal,
    setActiveDeal,
    showRealtor,
    setShowRealtor,
    updateDealStage,
    deleteDeal,
    wDeal,
    setWDeal,
    wLive,
    setWLive,
    pipeline,
    pipelineFocusDealId,
    clearPipelineFocusDeal,
    toast,
    pushToast,
    selectedState,
    setSelectedState,
    lawSection,
    setLawSection,
    partnerTab,
    setPartnerTab,
    activeSoftware,
    setActiveSoftware,
    softwareFilter,
    setSoftwareFilter,
    mktFilter,
    setMktFilter,
    mktSort,
    setMktSort,
    mktView,
    setMktView,
    activeListing,
    setActiveListing,
    savedDeals,
    setSavedDeals,
    submitStep,
    setSubmitStep,
    wForm,
    setWForm,
    wSubmitted,
    setWSubmitted,
    contractsPrefill,
    setContractsPrefill,
    showAlert,
  };

  if (screen === "landing" && !user) {
    return (
      <LandingScreen
        G={G}
        card={card}
        btnG={btnG}
        btnO={btnO}
        setAuthMode={setAuthMode}
        setScreen={setScreen}
        setUserType={setUserType}
        setAuthForm={setAuthForm}
        onOpenLegal={setScreen}
      />
    );
  }

  if (screen === "terms") {
    return (
      <TermsOfServiceScreen
        G={G}
        btnO={btnO}
        onBack={() => setScreen("landing")}
        onOpenPrivacy={() => setScreen("privacy")}
      />
    );
  }

  if (screen === "privacy") {
    return (
      <PrivacyPolicyScreen
        G={G}
        btnO={btnO}
        onBack={() => setScreen("landing")}
        onOpenTerms={() => setScreen("terms")}
      />
    );
  }

  if (screen === "auth" && !user) {
    return (
      <AuthScreen
        G={G}
        card={card}
        lbl={lbl}
        smIn={smIn}
        btnG={btnG}
        btnO={btnO}
        TRADES={TRADES}
        authMode={authMode}
        userType={userType}
        authForm={authForm}
        authError={authError}
        authNeedsVerification={authNeedsVerification}
        setAuthMode={setAuthMode}
        setUserType={setUserType}
        setAuthForm={setAuthForm}
        setAuthError={setAuthError}
        setScreen={setScreen}
        handleAuth={handleAuth}
        resendVerificationEmail={resendVerificationEmail}
      />
    );
  }

  if (user?.type === "admin") {
    return (
      <AdminDashboardScreen
        G={G}
        card={card}
        lbl={lbl}
        btnO={btnO}
        MOCK_CONTRACTORS={MOCK_CONTRACTORS}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        userName={user?.name}
        user={user}
        onSignOut={onSignOut}
      />
    );
  }

  if (showDealmakerSubscriptionGate && user?.type === "dealmaker") {
    return (
      <DealMakerSubscriptionGateScreen
        G={G}
        card={card}
        btnG={btnG}
        btnO={btnO}
        userName={user?.name}
        checking={dealmakerGateState.checking}
        launching={dealmakerGateState.launching}
        message={dealmakerGateState.message}
        onSubscribe={startDealmakerSubscriptionCheckout}
        onSignOut={onSignOut}
      />
    );
  }

  if (user?.type === "dealmaker") {
    return <DealMakerDashboardScreen ctx={dealMakerCtx} />;
  }

  if (showContractorOnboarding && user?.type === "contractor") {
    return (
      <ContractorOnboardingScreen
        G={G}
        card={card}
        lbl={lbl}
        smIn={smIn}
        btnG={btnG}
        btnO={btnO}
        onboarding={contractorOnboarding}
        setOnboarding={setContractorOnboarding}
        onComplete={completeContractorOnboarding}
        onSignOut={onSignOut}
        userName={user?.name}
      />
    );
  }

  if (showRealtorOnboarding && user?.type === "realtor") {
    return (
      <RealtorOnboardingScreen
        G={G}
        card={card}
        lbl={lbl}
        smIn={smIn}
        btnG={btnG}
        btnO={btnO}
        onboarding={realtorOnboarding}
        setOnboarding={setRealtorOnboarding}
        onComplete={completeRealtorOnboarding}
        onSignOut={onSignOut}
        userName={user?.name}
      />
    );
  }

  if (user?.type === "contractor") {
    return (
      <ContractorDashboardScreen
        G={G}
        card={card}
        lbl={lbl}
        btnG={btnG}
        btnO={btnO}
        contractorTab={contractorTab}
        setContractorTab={setContractorTab}
        user={user}
        onSignOut={onSignOut}
      />
    );
  }

  if (user?.type === "realtor") {
    return (
      <RealtorDashboardScreen
        G={G}
        card={card}
        lbl={lbl}
        btnG={btnG}
        btnO={btnO}
        userName={user?.name}
        user={user}
        realtorTab={realtorTab}
        setRealtorTab={setRealtorTab}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div style={{ background: G.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: G.text, fontFamily: G.mono }}>
      <button onClick={() => setScreen("landing")} style={btnG}>Go to DealBank</button>
      
      <AlertModal 
        show={alert.show} 
        title={alert.title} 
        message={alert.message} 
        type={alert.type} 
        onClose={hideAlert} 
        G={G} 
      />
    </div>
  );
}
