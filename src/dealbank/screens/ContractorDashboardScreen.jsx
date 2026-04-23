import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { capturePhotoBlob } from "../core/mobileRuntime";
import DataSearchBar from "../components/DataSearchBar";
import TopBar from "../components/TopBar";
import AppActionModal from "../components/AppActionModal";
import DashboardWorkspace from "../components/DashboardWorkspace";
import { dashboardContainerStyle, pageShellStyle } from "../core/layout";
import useViewport from "../core/useViewport";

const CONTRACTOR_PHOTOS_BUCKET = String(import.meta.env.VITE_CONTRACTOR_PHOTOS_BUCKET || "contractor-photos").trim();

const TRADE_OPTIONS = [
  "General Contractor",
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Kitchen & Bath",
  "Flooring",
  "Painting",
  "Landscaping",
  "Windows",
  "Foundation",
  "Handyman",
];

const REVIEW_ROWS = [
  { id: "r1", flipper: "T. Williams", title: "Kitchen + bath remodel", date: "Apr 2026", stars: 5, text: "Communicated every day, hit timeline, and gave us clear change-order options." },
  { id: "r2", flipper: "M. Johnson", title: "HVAC replacement", date: "Mar 2026", stars: 5, text: "Fast response and clean workmanship. Great for investor projects." },
  { id: "r3", flipper: "D. Patel", title: "Electrical rewire", date: "Feb 2026", stars: 4, text: "Solid execution and passed city inspection first try." },
];

function postedLabel(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function budgetLabel(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (minValue > 0 && maxValue > 0) {
    return `$${minValue.toLocaleString()}-$${maxValue.toLocaleString()}`;
  }
  if (maxValue > 0) return `Up to $${maxValue.toLocaleString()}`;
  if (minValue > 0) return `From $${minValue.toLocaleString()}`;
  return "Budget TBD";
}

function statusLabel(status) {
  const normalized = String(status || "open").toLowerCase();
  if (normalized === "in_progress") return "In Progress";
  if (normalized === "under_review") return "Under Review";
  if (normalized === "under_contract") return "Under Contract";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isOpenLeadStatus(status) {
  const normalized = String(status || "open").toLowerCase();
  return normalized === "open" || normalized === "new";
}

function isClosedLeadStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "completed" || normalized === "paid" || normalized === "closed";
}

function progressFromLeadStatus(status) {
  const normalized = String(status || "open").toLowerCase();
  if (normalized === "quoted") return 35;
  if (normalized === "accepted") return 52;
  if (normalized === "in_progress") return 70;
  if (normalized === "under_review") return 86;
  if (normalized === "completed" || normalized === "paid" || normalized === "closed") return 100;
  return 20;
}

function nextLeadStatus(status) {
  const normalized = String(status || "open").toLowerCase();
  if (normalized === "quoted") return "accepted";
  if (normalized === "accepted") return "in_progress";
  if (normalized === "in_progress") return "under_review";
  if (normalized === "under_review") return "completed";
  return normalized;
}

function shortDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function extensionFromName(fileName, fallback = "jpg") {
  const name = String(fileName || "").toLowerCase();
  if (!name.includes(".")) return fallback;
  const ext = name.split(".").pop();
  if (!ext) return fallback;
  if (ext === "jpeg") return "jpg";
  return ext.replace(/[^a-z0-9]/g, "") || fallback;
}

export default function ContractorDashboardScreen({ G, card, lbl, btnG, contractorTab, setContractorTab, user, onSignOut, btnO, showAlert }) {
  const { isMobile, mode } = useViewport();

  const CTABS = [
    { id: "leads", icon: "LD", label: "Job Leads" },
    { id: "jobs", icon: "JB", label: "Active Jobs" },
    { id: "profile", icon: "PR", label: "My Profile" },
    { id: "earnings", icon: "ER", label: "Earnings" },
    { id: "reviews", icon: "RV", label: "Reviews" },
  ];

  const [bio, setBio] = useState("Licensed contractor focused on fast turn rehab scopes and clean punch-list execution.");
  const [rate, setRate] = useState("95");
  const [showTradeEditor, setShowTradeEditor] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState(() => {
    if (!user?.trade) return ["General Contractor"];
    const normalized = String(user.trade)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length ? normalized : ["General Contractor"];
  });

  const [activeJobs, setActiveJobs] = useState([]);
  const [jobHistoryRows, setJobHistoryRows] = useState([]);
  const [leadRows, setLeadRows] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [contractorProfileId, setContractorProfileId] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [photoSignedUrl, setPhotoSignedUrl] = useState("");
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
  const [jobsRefreshTick, setJobsRefreshTick] = useState(0);
  const [openQuoteLeadId, setOpenQuoteLeadId] = useState("");
  const [quoteDraft, setQuoteDraft] = useState({ amount: "", notes: "" });
  const [leadSearch, setLeadSearch] = useState("");
  const [activeJobsSearch, setActiveJobsSearch] = useState("");
  const [jobHistorySearch, setJobHistorySearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [actionModal, setActionModal] = useState({ open: false, title: "", message: "", tone: "info" });

  function showActionModal(title, message, tone = "info") {
    setActionModal({ open: true, title, message, tone });
  }

  function closeActionModal() {
    setActionModal({ open: false, title: "", message: "", tone: "info" });
  }
  const photoInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadLeadsAndJobs() {
      if (!user?.id) {
        if (!active) return;
        setLeadRows([]);
        setActiveJobs([]);
        setJobHistoryRows([]);
        setContractorProfileId("");
        setLeadsLoading(false);
        setLeadsError("");
        return;
      }

      setLeadsError("");

      let resolvedContractorProfileId = "";
      const { data: contractorProfile, error: contractorProfileError } = await supabase
        .from("contractor_profiles")
        .select("id, photo_path, bio, rate_amount")
        .eq("user_id", user.id)
        .maybeSingle();

      if (contractorProfileError) {
        showAlert(`Unable to resolve contractor profile: ${contractorProfileError.message}`);
      } else {
        resolvedContractorProfileId = String(contractorProfile?.id || "");
        setPhotoPath(String(contractorProfile?.photo_path || ""));

        if (String(contractorProfile?.bio || "").trim()) {
          setBio(contractorProfile.bio);
        }

        if (Number.isFinite(Number(contractorProfile?.rate_amount)) && Number(contractorProfile.rate_amount) > 0) {
          setRate(String(Math.round(Number(contractorProfile.rate_amount))));
        }
      }

      const { data: leadRowsFromDb, error: leadsLoadError } = await supabase
        .from("contractor_job_leads")
        .select("id, contractor_id, listing_id, created_by, trade_required, budget_min, budget_max, notes, status, created_at")
        .order("created_at", { ascending: false })
        .limit(60);

      if (!active) return;

      if (leadsLoadError) {
        setLeadRows([]);
        setActiveJobs([]);
        setJobHistoryRows([]);
        setLeadsLoading(false);
        showAlert(`Unable to load job leads: ${leadsLoadError.message}`);
        return;
      }

      const listingIds = (leadRowsFromDb || []).map((row) => row.listing_id).filter(Boolean);
      let listingMap = {};

      if (listingIds.length > 0) {
        const { data: listingRows, error: listingError } = await supabase
          .from("marketplace_listings")
          .select("id, address, city")
          .in("id", listingIds);

        if (!active) return;

        if (listingError) {
          setLeadsLoading(false);
          showAlert(`Unable to load listing details: ${listingError.message}`);
          return;
        }

        listingMap = (listingRows || []).reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {});
      }

      const mappedLeads = [];
      const mappedActiveJobs = [];
      const mappedHistory = [];

      (leadRowsFromDb || []).forEach((row) => {
        const listing = row.listing_id ? listingMap[row.listing_id] : null;
        const created = new Date(row.created_at || Date.now()).getTime();
        const normalizedStatus = String(row.status || "open").toLowerCase();
        const amountValue = Number(row.budget_max || row.budget_min || 0);
        const addr = listing?.address ? `${listing.address}${listing?.city ? `, ${listing.city}` : ""}` : "Address pending";
        const flipper = row.created_by === user.id ? "You" : `DealMaker ${String(row.created_by || "").slice(0, 6).toUpperCase()}`;

        if (isOpenLeadStatus(normalizedStatus)) {
          mappedLeads.push({
            id: `lead-${row.id}`,
            dbId: row.id,
            addr,
            trade: row.trade_required || "General Contractor",
            budget: budgetLabel(row.budget_min, row.budget_max),
            flipper,
            posted: postedLabel(row.created_at),
            urgent: (Date.now() - created) < (24 * 60 * 60 * 1000),
            quoteSentAt: "",
            quoteAmount: "",
            quoteNotes: "",
          });
          return;
        }

        const assignedToOtherContractor = resolvedContractorProfileId
          && row.contractor_id
          && row.contractor_id !== resolvedContractorProfileId;

        if (assignedToOtherContractor) {
          return;
        }

        if (isClosedLeadStatus(normalizedStatus)) {
          mappedHistory.push({
            id: `history-${row.id}`,
            address: addr,
            trade: row.trade_required || "General Contractor",
            amount: `$${Math.round(amountValue).toLocaleString()}`,
            amountValue,
            status: statusLabel(normalizedStatus),
            date: shortDateLabel(row.created_at),
            createdAt: row.created_at,
            flipper,
          });
          return;
        }

        mappedActiveJobs.push({
          id: `job-${row.id}`,
          dbId: row.id,
          address: addr,
          flipper,
          value: amountValue,
          statusRaw: normalizedStatus,
          statusLabel: statusLabel(normalizedStatus),
          statusNote: row.notes || `Current stage: ${statusLabel(normalizedStatus)}`,
          progress: progressFromLeadStatus(normalizedStatus),
        });
      });

      setLeadRows(mappedLeads);
      setActiveJobs(mappedActiveJobs);
      setJobHistoryRows(mappedHistory);
      setContractorProfileId(resolvedContractorProfileId);
      setLeadsLoading(false);
    }

    loadLeadsAndJobs();

    return () => {
      active = false;
    };
  }, [user?.id, jobsRefreshTick]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const leadsChannel = supabase
      .channel(`contractor-job-leads-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contractor_job_leads",
        },
        () => setJobsRefreshTick((prev) => prev + 1),
      )
      .subscribe();

    const listingsChannel = supabase
      .channel(`contractor-listings-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_listings",
        },
        () => setJobsRefreshTick((prev) => prev + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    async function loadSignedPhoto() {
      if (!photoPath || !CONTRACTOR_PHOTOS_BUCKET) {
        if (active) setPhotoSignedUrl("");
        return;
      }

      const { data, error } = await supabase
        .storage
        .from(CONTRACTOR_PHOTOS_BUCKET)
        .createSignedUrl(photoPath, 60 * 60);

      if (!active) return;
      if (error) {
        setPhotoSignedUrl("");
        return;
      }

      setPhotoSignedUrl(String(data?.signedUrl || ""));
    }

    loadSignedPhoto();

    return () => {
      active = false;
    };
  }, [photoPath]);

  async function uploadContractorPhoto(uploadBlob, extension = "jpg", contentType = "image/jpeg") {
    if (!user?.id) return;
    if (!contractorProfileId) {
      showAlert("Complete contractor onboarding before uploading profile photos.");
      return;
    }

    if (!CONTRACTOR_PHOTOS_BUCKET) {
      setLeadsError("VITE_CONTRACTOR_PHOTOS_BUCKET is not configured.");
      return;
    }

    setPhotoUploadBusy(true);
    setLeadsError("");

    const safeExt = String(extension || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const objectPath = `profiles/${user.id}/avatar-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase
      .storage
      .from(CONTRACTOR_PHOTOS_BUCKET)
      .upload(objectPath, uploadBlob, {
        upsert: true,
        contentType: contentType || "image/jpeg",
      });

    if (uploadError) {
      setPhotoUploadBusy(false);
      showAlert(`Unable to upload contractor photo: ${uploadError.message}`);
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from("contractor_profiles")
      .update({ photo_path: objectPath })
      .eq("id", contractorProfileId);

    if (profileUpdateError) {
      setPhotoUploadBusy(false);
      showAlert(`Photo uploaded, but profile update failed: ${profileUpdateError.message}`);
      return;
    }

    setPhotoPath(objectPath);
    setPhotoUploadBusy(false);
  }

  async function handleCaptureFromCamera() {
    try {
      const capture = await capturePhotoBlob();
      if (!capture?.blob) {
        setLeadsError("Camera capture is available in the DealBank mobile app (Capacitor runtime).");
        return;
      }
      await uploadContractorPhoto(capture.blob, capture.extension, capture.contentType);
    } catch (error) {
      setLeadsError(`Camera capture failed: ${error?.message || "unknown error"}`);
    }
  }

  async function handlePhotoFileSelection(event) {
    const selectedFile = event?.target?.files?.[0];
    if (!selectedFile) return;

    await uploadContractorPhoto(
      selectedFile,
      extensionFromName(selectedFile.name, "jpg"),
      selectedFile.type || "image/jpeg",
    );

    event.target.value = "";
  }

  const stats = useMemo(() => {
    const totalValue = activeJobs.reduce((sum, job) => sum + job.value, 0);
    const avgProgress = activeJobs.length ? Math.round(activeJobs.reduce((sum, job) => sum + job.progress, 0) / activeJobs.length) : 0;
    return {
      activeCount: activeJobs.length,
      totalValue,
      avgProgress,
    };
  }, [activeJobs]);

  const leadStats = useMemo(() => {
    const urgentCount = leadRows.filter((row) => row.urgent).length;
    const quotedCount = leadRows.filter((row) => row.quoteSentAt).length;
    const totalPotential = leadRows.reduce((sum, row) => {
      const numbers = (String(row.budget || "").match(/\d[\d,]*/g) || [])
        .map((value) => Number(value.replace(/,/g, "")))
        .filter((value) => Number.isFinite(value));
      if (numbers.length === 0) return sum;
      return sum + Math.max(...numbers);
    }, 0);

    return {
      total: leadRows.length,
      urgentCount,
      quotedCount,
      totalPotential,
    };
  }, [leadRows]);

  const filteredLeadRows = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();
    if (!query) return leadRows;

    return leadRows.filter((lead) => {
      const searchable = [lead.addr, lead.trade, lead.budget, lead.flipper, lead.posted].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [leadRows, leadSearch]);

  const filteredActiveJobs = useMemo(() => {
    const query = activeJobsSearch.trim().toLowerCase();
    if (!query) return activeJobs;

    return activeJobs.filter((job) => {
      const searchable = [job.address, job.flipper, job.statusLabel, job.statusNote, String(job.value || "")].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [activeJobs, activeJobsSearch]);

  const filteredJobHistoryRows = useMemo(() => {
    const query = jobHistorySearch.trim().toLowerCase();
    if (!query) return jobHistoryRows;

    return jobHistoryRows.filter((row) => {
      const searchable = [row.address, row.trade, row.status, row.date, row.flipper, row.amount].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [jobHistoryRows, jobHistorySearch]);

  const filteredReviewRows = useMemo(() => {
    const query = reviewSearch.trim().toLowerCase();
    if (!query) return REVIEW_ROWS;

    return REVIEW_ROWS.filter((review) => {
      const searchable = [review.title, review.flipper, review.date, review.text, String(review.stars || "")].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [reviewSearch]);

  const earningsSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();

    let thisMonth = 0;
    let lastMonth = 0;
    let thisYear = 0;

    jobHistoryRows.forEach((row) => {
      const amount = Number(row.amountValue || 0);
      const createdAt = row.createdAt ? new Date(row.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return;

      const rowYear = createdAt.getFullYear();
      const rowMonth = createdAt.getMonth();

      if (rowYear === currentYear) thisYear += amount;
      if (rowYear === currentYear && rowMonth === currentMonth) thisMonth += amount;
      if (rowYear === previousYear && rowMonth === previousMonth) lastMonth += amount;
    });

    const pending = activeJobs.reduce((sum, row) => sum + Number(row.value || 0), 0);

    return {
      thisMonth,
      lastMonth,
      thisYear,
      pending,
    };
  }, [jobHistoryRows, activeJobs]);

  const contractorDisplayName = user?.name || "Contractor";
  const contractorFirstName = contractorDisplayName.split(" ").filter(Boolean)[0] || "Contractor";
  const monthValueDisplay = `$${Math.round(earningsSummary.thisMonth || stats.totalValue || 0).toLocaleString()}`;
  const activeTab = CTABS.find((tab) => tab.id === contractorTab);
  const activeTabLabel = activeTab?.label || "Job Leads";
  const activeTabSummaryMap = {
    leads: "Respond to quality leads quickly to keep your quote win-rate high.",
    jobs: "Advance every active job daily so payouts do not stall.",
    profile: "Maintain a strong profile so deal makers trust your scope and speed.",
    earnings: "Track month-over-month performance and protect gross margin.",
    reviews: "Turn project outcomes into reviews that lift conversion.",
  };
  const workspaceMetrics = [
    { label: "Focus", value: activeTabLabel, color: G.green },
    { label: "New leads", value: leadStats.total, color: G.text },
    { label: "This month", value: monthValueDisplay, color: G.green },
  ];
  const contractorRailSections = [
    {
      title: "Priority",
      tone: "green",
      items: [
        `Now: ${activeTabLabel}`,
        leadStats.urgentCount > 0 ? `${leadStats.urgentCount} urgent leads need bids.` : "No urgent leads right now.",
        leadStats.quotedCount > 0 ? `${leadStats.quotedCount} quotes already sent.` : "Send first quote to start momentum.",
      ],
    },
    {
      title: "Weekly Targets",
      tone: "blue",
      items: [
        "Reply to new leads in under 2 hours.",
        "Keep in-progress jobs moving every day.",
        "Request review after completion and payout.",
      ],
    },
    {
      title: "Field Notes",
      tone: "gold",
      items: [
        "Confirm scope assumptions before final quote.",
        "Photograph milestones for transparent updates.",
        "Flag permit risks before schedule commitments.",
      ],
    },
  ];

  async function bumpProgress(jobId) {
    const selectedJob = activeJobs.find((row) => row.id === jobId);
    if (!selectedJob?.dbId) return;

    const nextStatus = nextLeadStatus(selectedJob.statusRaw);
    if (!nextStatus || nextStatus === selectedJob.statusRaw) return;

    setActiveJobs((prev) => prev.map((job) => (
      job.id === jobId
        ? {
          ...job,
          statusRaw: nextStatus,
          statusLabel: statusLabel(nextStatus),
          statusNote: `Current stage: ${statusLabel(nextStatus)}`,
          progress: progressFromLeadStatus(nextStatus),
        }
        : job
    )));

    const updatePayload = {
      status: nextStatus,
      notes: `Current stage: ${statusLabel(nextStatus)}`,
    };

    if (contractorProfileId) {
      updatePayload.contractor_id = contractorProfileId;
    }

    const { error } = await supabase
      .from("contractor_job_leads")
      .update(updatePayload)
      .eq("id", selectedJob.dbId);

    if (error) {
      setLeadsError(`Unable to update job status: ${error.message}`);
      setJobsRefreshTick((prev) => prev + 1);
      return;
    }

    setJobsRefreshTick((prev) => prev + 1);
  }

  function toggleTrade(trade) {
    setSelectedTrades((prev) => (prev.includes(trade) ? prev.filter((item) => item !== trade) : [...prev, trade]));
  }

  function openQuoteForm(lead) {
    if (lead.quoteSentAt) return;
    setOpenQuoteLeadId(lead.id);
    setQuoteDraft({ amount: "", notes: "" });
  }

  async function submitQuote(lead) {
    if (!quoteDraft.amount) return;

    setLeadRows((prev) => prev.map((row) => (row.id === lead.id
      ? {
        ...row,
        quoteSentAt: new Date().toLocaleString(),
        quoteAmount: quoteDraft.amount,
        quoteNotes: quoteDraft.notes,
      }
      : row)));
    setOpenQuoteLeadId("");
    setQuoteDraft({ amount: "", notes: "" });

    if (!lead.dbId) return;

    const updatePayload = {
      status: "quoted",
      notes: [
        `Quote $${Number(quoteDraft.amount || 0).toLocaleString()} sent ${new Date().toLocaleString()}`,
        quoteDraft.notes,
      ].filter(Boolean).join(" | "),
    };

    if (contractorProfileId) {
      updatePayload.contractor_id = contractorProfileId;
    }

    const { error } = await supabase
      .from("contractor_job_leads")
      .update(updatePayload)
      .eq("id", lead.dbId);

    if (error) {
      setLeadsError(`Quote saved locally, but database update failed: ${error.message}`);
      return;
    }

    setJobsRefreshTick((prev) => prev + 1);
  }

  return (
    <div className="db-dashboard-root" style={pageShellStyle(G)}>
      <TopBar title="CONTRACTOR" tabs={CTABS} active={contractorTab} onTab={setContractorTab} userName={user?.name} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={dashboardContainerStyle(mode)}>
        <DashboardWorkspace
          G={G}
          mode={mode}
          headline={`Crew Board for ${contractorFirstName}`}
          subhead={activeTabSummaryMap[contractorTab] || activeTabSummaryMap.leads}
          metrics={workspaceMetrics}
          railSections={contractorRailSections}
        >

        {contractorTab === "leads" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 22, color: G.text, marginBottom: 4 }}>Job Leads</div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 14 }}>Deal makers nearby are requesting bids in your selected trades.</div>
            <DataSearchBar
              G={G}
              value={leadSearch}
              onChange={setLeadSearch}
              placeholder="Search leads by address, trade, budget, or deal maker"
              resultCount={filteredLeadRows.length}
              totalCount={leadRows.length}
            />
            {leadsLoading && <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>Loading fresh job leads...</div>}
            {!leadsLoading && leadRows.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
                No leads are available yet for your trade profile.
              </div>
            )}
            {!leadsLoading && leadRows.length > 0 && filteredLeadRows.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
                No job leads match your search.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.35fr) minmax(300px,0.65fr)", gap: 12 }}>
              <div>
                {filteredLeadRows.map((lead) => (
                  <div key={lead.id} style={{ ...card, marginBottom: 10, borderColor: lead.urgent ? `${G.gold}66` : G.border }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, fontWeight: "bold" }}>{lead.addr}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {lead.urgent && <div style={{ fontSize: 10, color: G.gold, background: `${G.gold}1a`, border: `1px solid ${G.gold}55`, borderRadius: 999, padding: "3px 9px", letterSpacing: 1 }}>URGENT</div>}
                        <div style={{ fontSize: 12, color: G.muted }}>{lead.posted}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: G.muted, marginBottom: 8, lineHeight: 1.6 }}>
                      Trade: <span style={{ color: G.green }}>{lead.trade}</span> · Budget: <span style={{ color: G.text }}>{lead.budget}</span> · Deal Maker: <span style={{ color: G.text }}>{lead.flipper}</span>
                    </div>

                    {lead.quoteSentAt && (
                      <div style={{ background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: G.green, letterSpacing: 1, marginBottom: 3 }}>QUOTE SENT</div>
                        <div style={{ fontSize: 13, color: G.text, marginBottom: 2 }}>Amount: ${Number(lead.quoteAmount || 0).toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: G.muted }}>Sent: {lead.quoteSentAt}</div>
                      </div>
                    )}

                    {!lead.quoteSentAt && openQuoteLeadId === lead.id && (
                      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px", marginBottom: 8 }}>
                        <div style={lbl}>Quote Amount</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                          <span style={{ color: G.muted, fontSize: 12 }}>$</span>
                          <input
                            value={quoteDraft.amount}
                            onChange={(event) => setQuoteDraft((prev) => ({ ...prev, amount: event.target.value.replace(/[^0-9]/g, "") }))}
                            placeholder="18500"
                            style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${G.border}`, color: G.text, fontSize: 14, fontFamily: G.mono, outline: "none" }}
                          />
                        </div>
                        <div style={lbl}>Notes (optional)</div>
                        <textarea
                          value={quoteDraft.notes}
                          onChange={(event) => setQuoteDraft((prev) => ({ ...prev, notes: event.target.value }))}
                          rows={2}
                          placeholder="Scope assumptions, materials, timeline..."
                          style={{ width: "100%", boxSizing: "border-box", background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text, fontSize: 12, fontFamily: G.mono, padding: "8px", marginBottom: 8, resize: "vertical", outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setOpenQuoteLeadId("")} style={{ ...btnO, flex: 1, fontSize: 12, padding: "8px 10px" }}>Cancel</button>
                          <button onClick={() => submitQuote(lead)} disabled={!quoteDraft.amount} style={{ ...btnG, flex: 2, fontSize: 12, padding: "8px 10px", opacity: quoteDraft.amount ? 1 : 0.55, cursor: quoteDraft.amount ? "pointer" : "not-allowed" }}>
                            Confirm Quote Sent
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => openQuoteForm(lead)}
                      disabled={Boolean(lead.quoteSentAt)}
                      style={lead.quoteSentAt ? { ...btnO, width: "100%", fontSize: 12, padding: "10px" } : { ...btnG, width: "100%", fontSize: 12, padding: "10px" }}
                    >
                      {lead.quoteSentAt ? "Quote Sent" : openQuoteLeadId === lead.id ? "Editing Quote" : "Send Quote"}
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <div style={{ ...card }}>
                  <div style={{ ...lbl, marginBottom: 8 }}>Lead Snapshot</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                    {[
                      ["Open Leads", leadStats.total],
                      ["Urgent", leadStats.urgentCount],
                      ["Quoted", leadStats.quotedCount],
                      ["Pipeline $", `$${Math.round(leadStats.totalPotential).toLocaleString()}`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ border: `1px solid ${G.border}`, borderRadius: 8, background: G.surface, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: G.muted, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontFamily: G.serif, fontSize: 18, color: G.green }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...card }}>
                  <div style={{ ...lbl, marginBottom: 8 }}>Action Plan</div>
                  {[
                    "Respond to urgent leads first.",
                    "Include scope assumptions in quote notes.",
                    "Move accepted jobs to progress updates daily.",
                  ].map((tip) => (
                    <div key={tip} style={{ fontSize: 12, color: G.text, lineHeight: 1.7, marginBottom: 6 }}>
                      • {tip}
                    </div>
                  ))}
                </div>

                <div style={{ ...card }}>
                  <div style={{ ...lbl, marginBottom: 8 }}>Current Profile Fit</div>
                  <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.7, marginBottom: 6 }}>Trades: <span style={{ color: G.text }}>{selectedTrades.join(", ") || "Not selected"}</span></div>
                  <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.7 }}>Base rate: <span style={{ color: G.text }}>${rate || "0"}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {contractorTab === "jobs" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Active Jobs</div>
            <DataSearchBar
              G={G}
              value={activeJobsSearch}
              onChange={setActiveJobsSearch}
              placeholder="Search jobs by address, deal maker, status, or value"
              resultCount={filteredActiveJobs.length}
              totalCount={activeJobs.length}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Active Jobs", v: stats.activeCount, c: G.green },
                { l: "In-Progress Value", v: `$${stats.totalValue.toLocaleString()}`, c: G.text },
                { l: "Avg Completion", v: `${stats.avgProgress}%`, c: stats.avgProgress >= 80 ? G.green : G.gold },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 18, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            {leadsLoading && <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>Loading active jobs...</div>}
            {!leadsLoading && activeJobs.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
                No active jobs yet. Send quotes from Job Leads to move opportunities into this pipeline.
              </div>
            )}
            {!leadsLoading && activeJobs.length > 0 && filteredActiveJobs.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
                No active jobs match your search.
              </div>
            )}

            {filteredActiveJobs.map((job) => (
              <div key={job.id} style={{ ...card, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{job.address}</div>
                  <div style={{ fontSize: 10, color: G.green }}>${job.value.toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 5 }}>Deal Maker: {job.flipper}</div>
                <div style={{ fontSize: 8, color: G.gold, letterSpacing: 1, marginBottom: 5 }}>Stage: {job.statusLabel}</div>
                <div style={{ fontSize: 10, color: G.muted, marginBottom: 7 }}>{job.statusNote}</div>

                <div style={{ height: 7, borderRadius: 999, background: G.faint, marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${job.progress}%`, borderRadius: 999, background: job.progress >= 80 ? G.green : G.gold }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 0 }}>
                  <div style={{ fontSize: 9, color: G.muted }}>Progress: {job.progress}%</div>
                  <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
                    <button onClick={() => bumpProgress(job.id)} style={{ ...btnG, fontSize: 8, padding: "6px 10px", flex: isMobile ? "1 1 120px" : "initial" }}>Update Progress</button>
                    <button
                      onClick={() => showActionModal("Message Sent", `Update sent to ${job.flipper} for ${job.address}.`, "success")}
                      style={{ ...btnO, fontSize: 8, padding: "6px 10px", flex: isMobile ? "1 1 100px" : "initial" }}
                    >
                      Message
                    </button>
                    <button
                      onClick={() => {
                        setContractorTab("profile");
                        setTimeout(() => {
                          photoInputRef.current?.click();
                        }, 0);
                      }}
                      style={{ ...btnO, fontSize: 8, padding: "6px 10px", flex: isMobile ? "1 1 100px" : "initial" }}
                    >
                      Photos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contractorTab === "profile" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>My Profile</div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: G.greenGlow, border: `2px solid ${G.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: G.green, fontWeight: "bold", overflow: "hidden" }}>
                  {photoSignedUrl ? (
                    <img src={photoSignedUrl} alt="Contractor profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    (user?.name || "U").split(" ").map((name) => name[0]).join("")
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold" }}>{user?.name}</div>
                  <div style={{ fontSize: 9, color: G.green }}>{selectedTrades.join(", ")}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{user?.location || "California"}</div>
                </div>
                <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 8, color: G.green, border: `1px solid ${G.green}44`, background: G.greenGlow, borderRadius: 3, padding: "2px 6px" }}>Verified</div>
                  <div style={{ fontSize: 8, color: G.gold, border: `1px solid ${G.gold}44`, background: `${G.gold}22`, borderRadius: 3, padding: "2px 6px" }}>Top Rated</div>
                </div>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic"
                style={{ display: "none" }}
                onChange={handlePhotoFileSelection}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploadBusy}
                  style={{ ...btnO, fontSize: 8, padding: "6px 10px", opacity: photoUploadBusy ? 0.7 : 1 }}
                >
                  {photoUploadBusy ? "Uploading..." : "Upload Profile Photo"}
                </button>
                <button
                  onClick={handleCaptureFromCamera}
                  disabled={photoUploadBusy}
                  style={{ ...btnO, fontSize: 8, padding: "6px 10px", opacity: photoUploadBusy ? 0.7 : 1 }}
                >
                  Use Camera
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 12 }}>
                {[
                  { l: "Jobs Won", v: "24" },
                  { l: "Avg Rating", v: "4.8/5" },
                  { l: "Response Rate", v: "96%" },
                  { l: "On-Time", v: "91%" },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 15, color: G.green, fontWeight: "bold" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={lbl}>Bio</div>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} style={{ width: "100%", boxSizing: "border-box", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 10, padding: "8px 10px", resize: "vertical", outline: "none" }} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={lbl}>Base Rate</div>
                <div style={{ position: "relative", maxWidth: isMobile ? "100%" : 180 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: G.muted, fontSize: 10 }}>$</span>
                  <input value={rate} onChange={(event) => setRate(event.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px 8px 20px", boxSizing: "border-box", outline: "none" }} />
                </div>
              </div>

              <button onClick={() => setShowTradeEditor((prev) => !prev)} style={{ ...btnO, fontSize: 8, padding: "6px 10px", marginBottom: 8 }}>
                {showTradeEditor ? "Hide Trades" : "Edit Trades"}
              </button>

              {showTradeEditor && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
                  {TRADE_OPTIONS.map((trade) => (
                    <button
                      key={trade}
                      onClick={() => toggleTrade(trade)}
                      style={{ ...btnO, fontSize: 8, padding: "6px 7px", borderColor: selectedTrades.includes(trade) ? G.green : G.border, color: selectedTrades.includes(trade) ? G.green : G.muted, background: selectedTrades.includes(trade) ? G.greenGlow : "transparent" }}
                    >
                      {trade}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...card, borderColor: `${G.gold}44` }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 4 }}>Subscription</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 3 }}>Pro Plan · $79/mo</div>
              <div style={{ fontSize: 10, color: G.muted }}>Unlimited quotes, verified badge, and priority placement in contractor search.</div>
            </div>
          </div>
        )}

        {contractorTab === "earnings" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Earnings</div>
            <DataSearchBar
              G={G}
              value={jobHistorySearch}
              onChange={setJobHistorySearch}
              placeholder="Search job history by address, trade, status, date, or deal maker"
              resultCount={filteredJobHistoryRows.length}
              totalCount={jobHistoryRows.length}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "This Month", v: `$${Math.round(earningsSummary.thisMonth).toLocaleString()}`, c: G.green },
                { l: "Last Month", v: `$${Math.round(earningsSummary.lastMonth).toLocaleString()}`, c: G.text },
                { l: "This Year", v: `$${Math.round(earningsSummary.thisYear).toLocaleString()}`, c: G.green },
                { l: "Pending", v: `$${Math.round(earningsSummary.pending).toLocaleString()}`, c: G.gold },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 5 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 20, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Job History</div>
              {jobHistoryRows.length === 0 ? (
                <div style={{ fontSize: 10, color: G.muted }}>No completed or paid jobs yet.</div>
              ) : filteredJobHistoryRows.length === 0 ? (
                <div style={{ fontSize: 10, color: G.muted }}>No job history rows match your search.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                        {["Address", "Trade", "Amount", "Status", "Date", "Deal Maker"].map((head) => (
                          <th key={head} style={{ fontSize: 8, color: G.muted, letterSpacing: 1, fontWeight: "normal", padding: "8px 6px" }}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobHistoryRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                          <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.address}</td>
                          <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.trade}</td>
                          <td style={{ fontSize: 10, color: G.green, padding: "8px 6px" }}>{row.amount}</td>
                          <td style={{ padding: "8px 6px" }}>
                            <span style={{ fontSize: 8, color: row.status === "Paid" ? G.green : G.gold, border: `1px solid ${row.status === "Paid" ? G.green : G.gold}55`, background: row.status === "Paid" ? G.greenGlow : `${G.gold}22`, borderRadius: 3, padding: "2px 7px" }}>{row.status}</span>
                          </td>
                          <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.date}</td>
                          <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.flipper}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {contractorTab === "reviews" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Reviews</div>
            <DataSearchBar
              G={G}
              value={reviewSearch}
              onChange={setReviewSearch}
              placeholder="Search reviews by project, reviewer, date, rating, or text"
              resultCount={filteredReviewRows.length}
              totalCount={REVIEW_ROWS.length}
            />

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 20, alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 30, color: G.green, lineHeight: 1 }}>4.8</div>
                  <div style={{ fontSize: 9, color: G.muted }}>Based on 42 reviews</div>
                </div>
                <div style={{ flex: 1 }}>
                  {[
                    ["5.0", 30],
                    ["4.0", 9],
                    ["3.0", 2],
                    ["1.0-2.0", 1],
                  ].map(([label, count]) => (
                    <div key={label} style={{ display: "grid", gridTemplateColumns: isMobile ? "38px 1fr 24px" : "44px 1fr 30px", gap: 8, alignItems: "center", marginBottom: 5 }}>
                      <div style={{ fontSize: 8, color: G.muted }}>{label}</div>
                      <div style={{ height: 6, borderRadius: 999, background: G.faint }}>
                        <div style={{ height: "100%", width: `${(count / 30) * 100}%`, borderRadius: 999, background: G.green }} />
                      </div>
                      <div style={{ fontSize: 8, color: G.muted, textAlign: "right" }}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {filteredReviewRows.length === 0 && (
              <div style={{ ...card, marginBottom: 8, fontSize: 10, color: G.muted }}>
                No reviews match your search.
              </div>
            )}

            {filteredReviewRows.map((review) => (
              <div key={review.id} style={{ ...card, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text }}>{review.title}</div>
                  <div style={{ fontSize: 8, color: G.muted }}>{review.date}</div>
                </div>
                <div style={{ fontSize: 9, color: G.gold, marginBottom: 5 }}>Rating {review.stars}/5 <span style={{ color: G.muted }}>({review.flipper})</span></div>
                <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7 }}>{review.text}</div>
              </div>
            ))}
          </div>
        )}
        </DashboardWorkspace>
      </div>

      <AppActionModal
        G={G}
        open={actionModal.open}
        title={actionModal.title}
        message={actionModal.message}
        tone={actionModal.tone}
        onConfirm={closeActionModal}
        onClose={closeActionModal}
      />
    </div>
  );
}
