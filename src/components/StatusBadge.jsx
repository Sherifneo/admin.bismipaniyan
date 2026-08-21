import "./StatusBadge.css";

// Colour mapping is deliberately generic (not module-specific) so this
// works for any status field that boils down to "good/neutral/bad/pending."
const TONE_BY_STATUS = {
  draft: "neutral",
  pending: "neutral",
  processing: "info",
  packed: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "warning",
  paid: "success",
  failed: "danger",
  refunded: "warning",
  partially_refunded: "warning",
  gateway_pending: "neutral",
  approved: "success",
  rejected: "danger",
  requested: "neutral",
  not_applicable: "neutral",
  processed: "success",
  new: "info",
  contacted: "info",
  in_progress: "info",
  responded: "success",
  closed: "neutral",
  active: "success",
  suspended: "danger",
  revoked: "danger",
  expired: "neutral",
  ready: "warning",
  published: "success",
  archived: "danger",
};

function labelFor(status) {
  return String(status || "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function StatusBadge({ status, label }) {
  const tone = TONE_BY_STATUS[status] || "neutral";
  return <span className={`bp-badge bp-badge-${tone}`}>{label || labelFor(status)}</span>;
}
