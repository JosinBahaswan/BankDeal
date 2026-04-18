function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function leadLifecycleTier(status) {
  const normalized = asText(status).toLowerCase();
  if (!normalized) return "new";
  if (normalized.includes("close")) return "closed";
  if (normalized.includes("offer")) return "offer_sent";
  if (normalized.includes("interest")) return "engaged";
  if (normalized.includes("contact")) return "contacted";
  return "new";
}

export function buildSequenceMetrics({
  sequenceRows,
  stepRows,
  dispatchRows,
  leadRows,
  sequenceStatusLabel,
}) {
  const steps = Array.isArray(stepRows) ? stepRows : [];
  const sequences = Array.isArray(sequenceRows) ? sequenceRows : [];
  const dispatches = Array.isArray(dispatchRows) ? dispatchRows : [];
  const leads = Array.isArray(leadRows) ? leadRows : [];

  const stepCountBySequence = steps.reduce((acc, row) => {
    const sequenceId = asText(row?.sequence_id);
    if (!sequenceId) return acc;
    acc[sequenceId] = (acc[sequenceId] || 0) + 1;
    return acc;
  }, {});

  const dispatchesBySequence = dispatches.reduce((acc, row) => {
    const sequenceId = asText(row?.sequence_id);
    if (!sequenceId) return acc;
    if (!acc[sequenceId]) acc[sequenceId] = [];
    acc[sequenceId].push(row);
    return acc;
  }, {});

  const leadStatusById = leads.reduce((acc, row) => {
    const id = asText(row?.id);
    if (!id) return acc;
    acc[id] = leadLifecycleTier(row?.status);
    return acc;
  }, {});

  return sequences.map((row) => {
    const id = asText(row?.id);
    const sequenceDispatches = dispatchesBySequence[id] || [];
    const targetedLeadIds = new Set(
      sequenceDispatches
        .map((entry) => asText(entry?.lead_id))
        .filter(Boolean),
    );

    const sentCount = sequenceDispatches.filter((entry) => asText(entry?.status).toLowerCase() === "sent").length;
    const failedCount = sequenceDispatches.filter((entry) => asText(entry?.status).toLowerCase() === "failed").length;
    const queuedCount = sequenceDispatches.filter((entry) => asText(entry?.status).toLowerCase() === "queued").length;

    const engagedCount = Array.from(targetedLeadIds).reduce((sum, leadId) => {
      const tier = leadStatusById[leadId] || "new";
      return tier === "engaged" || tier === "offer_sent" || tier === "closed"
        ? sum + 1
        : sum;
    }, 0);

    const closedCount = Array.from(targetedLeadIds).reduce((sum, leadId) => {
      return leadStatusById[leadId] === "closed" ? sum + 1 : sum;
    }, 0);

    const leadCount = Math.max(
      asNumber(row?.lead_count, 0),
      targetedLeadIds.size,
    );

    const conversionBase = targetedLeadIds.size > 0 ? targetedLeadIds.size : leadCount;
    const conversionRatio = conversionBase > 0 ? engagedCount / conversionBase : 0;

    return {
      id,
      name: asText(row?.name, "Unnamed sequence"),
      leadCount,
      sent: sentCount,
      failed: failedCount,
      queued: queuedCount,
      replies: engagedCount,
      closed: closedCount,
      conversion: `${(conversionRatio * 100).toFixed(1)}%`,
      status: sequenceStatusLabel(row?.status),
      stepCount: Math.max(0, asNumber(stepCountBySequence[id], 0)),
    };
  });
}
