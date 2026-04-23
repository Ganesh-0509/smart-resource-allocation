import type { Task } from "../types";
import UrgencyBadge from "./UrgencyBadge";

type TaskCardProps = {
  task: Task;
  onSelect: (task: Task) => void;
  isSelected: boolean;
};

const needTypeMeta: Record<string, { icon: string; label: string }> = {
  nutrition: { icon: "NU", label: "Nutrition" },
  medical: { icon: "ME", label: "Medical" },
  shelter: { icon: "SH", label: "Shelter" },
  education: { icon: "ED", label: "Education" },
  water: { icon: "WA", label: "Water" },
  livelihood: { icon: "LI", label: "Livelihood" },
  other: { icon: "OT", label: "Other" },
};

function formatRelativeTime(isoTime: string): string {
  const created = new Date(isoTime).getTime();
  if (Number.isNaN(created)) {
    return "just now";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function TaskCard({ task, onSelect, isSelected }: TaskCardProps) {
  const meta = needTypeMeta[task.need_type] || needTypeMeta.other;

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={[
        "w-full rounded-2xl border p-3.5 text-left transition-all",
        "hover:shadow-lg hover:shadow-[#1A3C2E]/5",
        isSelected 
          ? "border-[#E8712A] bg-[#FEF0E6]/20 ring-1 ring-[#E8712A]" 
          : "border-slate-50 bg-white hover:border-[#1A3C2E]/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-black text-[#1A3C2E] leading-tight">{task.title}</h3>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{task.ward || "Global Ward"}</p>
        </div>
        <div className="shrink-0 scale-75 origin-top-right">
          <UrgencyBadge score={task.urgency_score} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF4EE] px-2 py-1 text-[#1A3C2E]">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-md bg-[#1A3C2E] text-[6px] text-white">
            {meta.icon}
          </span>
          {meta.label}
        </span>
        <span className="text-slate-400">
           HH: {task.household_count ?? 1}
        </span>
        <span className="text-slate-400">
          • {formatRelativeTime(task.created_at)}
        </span>
      </div>
    </button>
  );
}
