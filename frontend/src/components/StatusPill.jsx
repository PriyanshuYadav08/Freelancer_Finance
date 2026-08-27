const TONES = {
  draft: "pill-neutral",
  sent: "pill-neutral",
  due: "pill-warn",
  overdue: "pill-risk",
  paid: "pill-positive",
  active: "pill-positive",
  inactive: "pill-neutral",
};

const LABELS = {
  draft: "Draft",
  sent: "Sent",
  due: "Due",
  overdue: "Overdue",
  paid: "Paid",
  active: "Active",
  inactive: "Inactive",
};

export default function StatusPill({ status }) {
  const tone = TONES[status] || "pill-neutral";
  const label = LABELS[status] || status;
  return <span className={"pill " + tone}>{label}</span>;
}
