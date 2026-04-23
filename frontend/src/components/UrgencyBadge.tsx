type UrgencyBadgeProps = {
  score: number;
};

function getUrgencyMeta(score: number): { label: string; classes: string } {
  if (score >= 80) {
    return {
      label: "Critical",
      classes: "bg-red-50 text-red-600 ring-1 ring-red-200",
    };
  }

  if (score >= 60) {
    return {
      label: "High Impact",
      classes: "bg-[#FEF0E6] text-[#E8712A] ring-1 ring-[#F5A26F]/30",
    };
  }

  if (score >= 40) {
    return {
      label: "Routine",
      classes: "bg-[#EAF4EE] text-[#1A3C2E] ring-1 ring-[#4A8C6A]/20",
    };
  }

  return {
    label: "Low Priority",
    classes: "bg-slate-50 text-slate-400 ring-1 ring-slate-200",
  };
}

export default function UrgencyBadge({ score }: UrgencyBadgeProps) {
  const safeScore = Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  const urgency = getUrgencyMeta(safeScore);

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${urgency.classes}`}
      title={`Severity Level: ${safeScore}%`}
    >
      {urgency.label}
    </span>
  );
}
