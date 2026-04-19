type UrgencyBadgeProps = {
  score: number;
};

function getUrgencyMeta(score: number): { label: string; classes: string } {
  if (score >= 80) {
    return {
      label: "Critical",
      classes: "border border-red-200 bg-red-100 text-red-700",
    };
  }

  if (score >= 60) {
    return {
      label: "High",
      classes: "border border-orange-200 bg-orange-100 text-orange-700",
    };
  }

  if (score >= 40) {
    return {
      label: "Medium",
      classes: "border border-yellow-200 bg-yellow-100 text-yellow-800",
    };
  }

  return {
    label: "Low",
    classes: "border border-slate-200 bg-slate-100 text-slate-700",
  };
}

export default function UrgencyBadge({ score }: UrgencyBadgeProps) {
  const safeScore = Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  const urgency = getUrgencyMeta(safeScore);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${urgency.classes}`}
      title={`Urgency score: ${safeScore}`}
    >
      {urgency.label}
    </span>
  );
}
