type Activity = {
  time: string;
  action: string;
  actor: string;
  task_title: string;
};

type ActivityFeedProps = {
  activities: Activity[];
};

function getActionStyles(action: string): string {
  const normalized = action.toLowerCase();

  if (normalized.includes("assigned")) {
    return "border-l-[#1A3C2E] bg-[#EAF4EE]";
  }

  if (normalized.includes("completed")) {
    return "border-l-[#E8712A] bg-[#FEF0E6]";
  }

  if (normalized.includes("submitted")) {
    return "border-l-[#E8712A] bg-[#FEF0E6]";
  }

  return "border-l-slate-300 bg-slate-50/50";
}

function formatTimestamp(time: string): string {
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) {
    return time;
  }
  return parsed.toLocaleString();
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
        <p className="mt-2 text-sm text-slate-500">No activity yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm border border-[#114B3B]/5">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Field Activity Stream</h3>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {activities.map((item, index) => (
          <article
            key={`${item.time}-${item.actor}-${index}`}
            className={`rounded-xl border-l-[6px] p-4 transition-all hover:translate-x-1 ${getActionStyles(item.action)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-800 leading-relaxed">
                <span className="font-bold text-[#1A3C2E]">{item.actor}</span>{" "}
                <span className="font-bold text-slate-400 lowercase tracking-tight">{item.action}</span>{" "}
                <span className="font-bold text-[#1A3C2E]">{item.task_title}</span>
              </p>
              <time className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">{formatTimestamp(item.time)}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
