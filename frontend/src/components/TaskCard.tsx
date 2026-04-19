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
        "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md",
        isSelected ? "border-[#1D9E75] ring-2 ring-[#1D9E75]/15" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{task.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{task.ward || "Location unknown"}</p>
        </div>
        <UrgencyBadge score={task.urgency_score} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#1D9E75] text-[10px] font-bold text-white">
            {meta.icon}
          </span>
          {meta.label}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
          Households: {task.household_count ?? 1}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
          {formatRelativeTime(task.created_at)}
        </span>
      </div>
    </button>
  );
}
