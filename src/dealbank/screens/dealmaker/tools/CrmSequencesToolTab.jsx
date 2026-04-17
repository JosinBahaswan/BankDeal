import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

const VARIABLE_TOKENS = ["{{first_name}}", "{{property_address}}", "{{equity_estimate}}", "{{city}}", "{{callback_time}}"];
const PIPELINE_STAGES = ["New", "Contacted", "Interested", "Offer Sent", "Closed"];
const SEND_SMS_ENDPOINT = String(import.meta.env.VITE_SEND_SMS_ENDPOINT || "/api/send-sms").trim();

function emptyPipeline() {
  return PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {});
}

function sequenceStatusLabel(status) {
  const value = String(status || "draft").toLowerCase();
  if (value === "active") return "Active";
  if (value === "paused") return "Paused";
  return "Draft";
}

function labelToStepType(label) {
  if (label === "Email") return "email";
  if (label === "Call Task") return "task";
  return "sms";
}

function normalizeLeadStage(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("offer")) return "Offer Sent";
  if (value.includes("close")) return "Closed";
  if (value.includes("interest")) return "Interested";
  if (value.includes("contact")) return "Contacted";
  return "New";
}

function shortBadge(status, G) {
  const color = status === "Active" ? G.green : status === "Paused" ? G.gold : G.muted;
  return {
    fontSize: 8,
    color,
    border: `1px solid ${color}55`,
    background: `${color}22`,
    borderRadius: 3,
    padding: "2px 7px",
    letterSpacing: 1,
  };
}

function newStepTemplate(index) {
  return {
    id: `step-${Date.now()}-${index}`,
    delay: index === 0 ? "0" : "2",
    channel: index % 2 ? "SMS" : "Email",
    message: index === 0
      ? "Hi {{first_name}}, wanted to ask if you would consider an as-is cash offer for {{property_address}}."
      : "Following up on {{property_address}}. We can close on your timeline and handle repairs.",
  };
}

export default function CrmSequencesToolTab({ ctx }) {
  const { G, card, btnG, btnO, user } = ctx;

  const [sequences, setSequences] = useState([]);
  const [pipeline, setPipeline] = useState(() => emptyPipeline());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [dispatchBusyId, setDispatchBusyId] = useState("");
  const [builderName, setBuilderName] = useState("Motivated Seller Follow-up");
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [builderSteps, setBuilderSteps] = useState([
    {
      id: "s-1",
      delay: "0",
      channel: "SMS",
      message: "Hi {{first_name}}, are you open to discussing an as-is offer on {{property_address}}?",
    },
    {
      id: "s-2",
      delay: "1",
      channel: "SMS",
      message: "Quick follow up from yesterday. I can share a number with no obligation.",
    },
    {
      id: "s-3",
      delay: "3",
      channel: "Email",
      message: "If now is not ideal, we can reconnect at {{callback_time}}.",
    },
  ]);

  useEffect(() => {
    let active = true;

    async function loadCrmData() {
      if (!user?.id) {
        if (!active) return;
        setSequences([]);
        setPipeline(emptyPipeline());
        setError("Sign in to load CRM sequences.");
        return;
      }

      setLoading(true);
      setError("");

      const { data: sequenceRows, error: sequenceError } = await supabase
        .from("sms_sequences")
        .select("id, name, status, lead_count")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (sequenceError) {
        setLoading(false);
        setError(`Failed to load sequences: ${sequenceError.message}`);
        return;
      }

      const sequenceIds = (sequenceRows || []).map((row) => row.id);
      let stepRows = [];

      if (sequenceIds.length > 0) {
        const { data, error: stepError } = await supabase
          .from("sequence_steps")
          .select("sequence_id")
          .in("sequence_id", sequenceIds);

        if (!active) return;

        if (stepError) {
          setLoading(false);
          setError(`Failed to load sequence steps: ${stepError.message}`);
          return;
        }

        stepRows = data || [];
      }

      const stepCountBySequence = stepRows.reduce((acc, row) => {
        acc[row.sequence_id] = (acc[row.sequence_id] || 0) + 1;
        return acc;
      }, {});

      const mappedSequences = (sequenceRows || []).map((row) => {
        const stepCount = stepCountBySequence[row.id] || 0;
        const leadCount = Number(row.lead_count || 0);
        const sent = leadCount * Math.max(stepCount, 1);
        const replies = Math.round(sent * 0.08);
        const conversion = sent > 0 ? `${((replies / sent) * 100).toFixed(1)}%` : "0.0%";

        return {
          id: row.id,
          name: row.name,
          leadCount,
          sent,
          replies,
          conversion,
          status: sequenceStatusLabel(row.status),
        };
      });

      const { data: leadRows, error: leadError } = await supabase
        .from("leads")
        .select("id, name, address, status")
        .eq("owner_id", user.id)
        .order("added_at", { ascending: false })
        .limit(200);

      if (!active) return;

      if (leadError) {
        setLoading(false);
        setError(`Failed to load lead pipeline: ${leadError.message}`);
        return;
      }

      const nextPipeline = emptyPipeline();
      (leadRows || []).forEach((leadRow) => {
        const stage = normalizeLeadStage(leadRow.status);
        nextPipeline[stage].push({
          id: leadRow.id,
          name: leadRow.name || "Unknown Lead",
          address: leadRow.address || "Address not provided",
        });
      });

      setSequences(mappedSequences);
      setPipeline(nextPipeline);
      setLoading(false);
    }

    loadCrmData();

    return () => {
      active = false;
    };
  }, [user?.id, refreshTick]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const sequenceChannel = supabase
      .channel(`sms-sequences-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sms_sequences",
          filter: `owner_id=eq.${user.id}`,
        },
        () => setRefreshTick((prev) => prev + 1),
      )
      .subscribe();

    const leadChannel = supabase
      .channel(`crm-leads-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `owner_id=eq.${user.id}`,
        },
        () => setRefreshTick((prev) => prev + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sequenceChannel);
      supabase.removeChannel(leadChannel);
    };
  }, [user?.id]);

  const pipelineStages = useMemo(() => Object.keys(pipeline), [pipeline]);

  const updateStep = (stepId, key, value) => {
    setBuilderSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, [key]: value } : step)));
  };

  const removeStep = (stepId) => {
    setBuilderSteps((prev) => prev.filter((step) => step.id !== stepId));
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const addStep = () => {
    setBuilderSteps((prev) => [...prev, newStepTemplate(prev.length)]);
  };

  const injectToken = (token) => {
    if (!selectedStepId) return;
    setBuilderSteps((prev) => prev.map((step) => (step.id === selectedStepId ? { ...step, message: `${step.message} ${token}`.trim() } : step)));
  };

  const dispatchSequenceSms = async (sequenceId, options = {}) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = String(sessionData?.session?.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Session expired. Please sign in again.");
    }

    const response = await fetch(SEND_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sequenceId,
        allowPaused: Boolean(options.allowPaused),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `SMS dispatch request failed (${response.status})`);
    }

    return payload;
  };

  const createSequence = async () => {
    if (!user?.id) {
      setError("Login required before creating a sequence.");
      return;
    }

    if (!builderName.trim() || builderSteps.length === 0) return;

    setError("");
  setNotice("");

    const leadCount = Object.values(pipeline).reduce((sum, stageRows) => sum + stageRows.length, 0);
    const { data: insertedSequence, error: sequenceInsertError } = await supabase
      .from("sms_sequences")
      .insert({
        owner_id: user.id,
        name: builderName.trim(),
        status: "active",
        lead_count: leadCount,
      })
      .select("id")
      .single();

    if (sequenceInsertError) {
      setError(`Failed to create sequence: ${sequenceInsertError.message}`);
      return;
    }

    const stepsPayload = builderSteps.map((step, index) => ({
      sequence_id: insertedSequence.id,
      step_order: index + 1,
      day_offset: Number(step.delay || 0),
      type: labelToStepType(step.channel),
      message: step.message || null,
    }));

    const { error: stepsInsertError } = await supabase
      .from("sequence_steps")
      .insert(stepsPayload);

    if (stepsInsertError) {
      setError(`Sequence created, but steps failed: ${stepsInsertError.message}`);
      return;
    }

    try {
      const dispatchSummary = await dispatchSequenceSms(insertedSequence.id, { allowPaused: true });
      const providerSuffix = dispatchSummary.providerConfigured
        ? ""
        : " SMS provider not configured, so messages remain queued.";
      setNotice(`Sequence launched. Sent: ${dispatchSummary.sentCount || 0}, failed: ${dispatchSummary.failedCount || 0}, queued due: ${dispatchSummary.queuedCount || 0}.${providerSuffix}`);
    } catch (dispatchError) {
      setError(`Sequence created, but SMS dispatch failed: ${dispatchError.message}`);
    }

    setBuilderName("New Sequence");
    setBuilderSteps([newStepTemplate(0), newStepTemplate(1)]);
    setSelectedStepId(null);
    setRefreshTick((prev) => prev + 1);
  };

  const runDueSmsDispatch = async (sequenceId) => {
    if (!sequenceId) return;

    setDispatchBusyId(sequenceId);
    setError("");
    setNotice("");

    try {
      const dispatchSummary = await dispatchSequenceSms(sequenceId);
      const providerSuffix = dispatchSummary.providerConfigured
        ? ""
        : " SMS provider not configured, so messages remain queued.";
      setNotice(`Dispatch complete. Sent: ${dispatchSummary.sentCount || 0}, failed: ${dispatchSummary.failedCount || 0}, queued due: ${dispatchSummary.queuedCount || 0}.${providerSuffix}`);
      setRefreshTick((prev) => prev + 1);
    } catch (dispatchError) {
      setError(dispatchError?.message || "Failed to dispatch due SMS messages.");
    } finally {
      setDispatchBusyId("");
    }
  };

  const toggleSequenceStatus = async (id) => {
    const row = sequences.find((item) => item.id === id);
    if (!row) return;

    const nextStatus = row.status === "Active" ? "paused" : "active";
    const { error: updateError } = await supabase
      .from("sms_sequences")
      .update({ status: nextStatus })
      .eq("id", id);

    if (updateError) {
      setError(`Failed to update status: ${updateError.message}`);
      return;
    }

    setSequences((prev) => prev.map((item) => (item.id === id ? { ...item, status: sequenceStatusLabel(nextStatus) } : item)));
  };

  const movePipelineCard = async (fromStage, toStage, cardId) => {
    if (fromStage === toStage) return;

    const previousPipeline = pipeline;

    setPipeline((prev) => {
      const cardList = prev[fromStage] || [];
      const selectedCard = cardList.find((cardItem) => cardItem.id === cardId);
      if (!selectedCard) return prev;

      return {
        ...prev,
        [fromStage]: cardList.filter((cardItem) => cardItem.id !== cardId),
        [toStage]: [{ ...selectedCard, movedAt: Date.now() }, ...(prev[toStage] || [])],
      };
    });

    if (!user?.id) return;

    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: toStage })
      .eq("id", cardId)
      .eq("owner_id", user.id);

    if (updateError) {
      setPipeline(previousPipeline);
      setError(`Failed to update lead stage: ${updateError.message}`);
    }
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>CRM & Sequences</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Track your pipeline and automate personalized follow-up with variable-based templates.</div>
      {error && <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55`, color: G.red, fontSize: 10 }}>{error}</div>}
      {notice && <div style={{ ...card, marginBottom: 10, borderColor: `${G.green}55`, color: G.green, fontSize: 10 }}>{notice}</div>}
      {loading && <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>Loading CRM data from Supabase...</div>}

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Active Sequences</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Sequence</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Leads</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Sent</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Replies</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Conversion</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Status</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                  <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.name}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.leadCount}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.sent}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.replies}</td>
                  <td style={{ fontSize: 10, color: G.green, padding: "8px 6px" }}>{row.conversion}</td>
                  <td style={{ padding: "8px 6px" }}><span style={shortBadge(row.status, G)}>{row.status}</span></td>
                  <td style={{ padding: "8px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => toggleSequenceStatus(row.id)} style={{ ...btnO, fontSize: 8, padding: "3px 8px" }}>
                      {row.status === "Active" ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => runDueSmsDispatch(row.id)}
                      disabled={dispatchBusyId === row.id}
                      style={{ ...btnG, fontSize: 8, padding: "3px 8px", opacity: dispatchBusyId === row.id ? 0.75 : 1 }}
                    >
                      {dispatchBusyId === row.id ? "Sending..." : "Send Due SMS"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Inline Sequence Builder</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
          <input
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
            placeholder="Sequence name"
            style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }}
          />
          <button onClick={createSequence} style={{ ...btnG, fontSize: 9, padding: "8px 11px" }}>Launch Sequence</button>
        </div>

        <div style={{ fontSize: 8, color: G.muted, marginBottom: 5 }}>Variables</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {VARIABLE_TOKENS.map((token) => (
            <button key={token} onClick={() => injectToken(token)} style={{ ...btnO, fontSize: 8, padding: "4px 8px", color: G.green, borderColor: `${G.green}66` }}>
              {token}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {builderSteps.map((step, idx) => (
            <div key={step.id} style={{ background: G.surface, border: `1px solid ${selectedStepId === step.id ? G.green : G.border}`, borderRadius: 7, padding: 10 }} onClick={() => setSelectedStepId(step.id)}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: G.green }}>STEP {idx + 1}</div>
                <input value={step.delay} onChange={(e) => updateStep(step.id, "delay", e.target.value.replace(/[^0-9]/g, ""))} style={{ width: 62, background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 6px", fontSize: 9, fontFamily: G.mono }} />
                <div style={{ fontSize: 8, color: G.muted, display: "flex", alignItems: "center" }}>days later</div>
                <select value={step.channel} onChange={(e) => updateStep(step.id, "channel", e.target.value)} style={{ background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 6px", fontSize: 9, fontFamily: G.mono }}>
                  {["SMS", "Email", "Call Task"].map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                </select>
                {builderSteps.length > 1 && (
                  <button onClick={() => removeStep(step.id)} style={{ ...btnO, fontSize: 8, padding: "3px 7px", color: G.red }}>
                    Remove
                  </button>
                )}
              </div>
              <textarea value={step.message} onChange={(e) => updateStep(step.id, "message", e.target.value)} rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, fontFamily: G.mono, fontSize: 10, padding: "7px 8px" }} />
            </div>
          ))}
        </div>

        <button onClick={addStep} style={{ ...btnO, fontSize: 8, padding: "5px 9px", marginTop: 8 }}>+ Add Step</button>
      </div>

      <div style={{ ...card }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Pipeline Board</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pipelineStages.length},minmax(170px,1fr))`, gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {pipelineStages.map((stage) => (
            <div key={stage} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: 8, minHeight: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ fontSize: 9, color: G.text, letterSpacing: 1 }}>{stage}</div>
                <div style={{ fontSize: 8, color: G.muted }}>{(pipeline[stage] || []).length}</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {(pipeline[stage] || []).map((cardItem) => (
                  <div key={cardItem.id} style={{ background: "#0d0d0d", border: `1px solid ${G.border}`, borderRadius: 6, padding: "7px 8px" }}>
                    <div style={{ fontSize: 10, color: G.text, marginBottom: 3 }}>{cardItem.name}</div>
                    <div style={{ fontSize: 8, color: G.muted, marginBottom: 5 }}>{cardItem.address}</div>
                    <select onChange={(e) => movePipelineCard(stage, e.target.value, cardItem.id)} value={stage} style={{ width: "100%", background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 5px", fontSize: 8, fontFamily: G.mono }}>
                      {pipelineStages.map((target) => <option key={target} value={target}>{target}</option>)}
                    </select>
                  </div>
                ))}
                {(pipeline[stage] || []).length === 0 && <div style={{ fontSize: 8, color: G.muted }}>No records</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
