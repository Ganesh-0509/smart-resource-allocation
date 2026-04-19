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
    return "border-l-[#1D9E75] bg-emerald-50";
  }

  if (normalized.includes("completed")) {
    return "border-l-blue-500 bg-blue-50";
  }

  if (normalized.includes("submitted")) {
    return "border-l-amber-500 bg-amber-50";
  }

  return "border-l-slate-300 bg-slate-50";
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {activities.map((item, index) => (
          <article
            key={`${item.time}-${item.actor}-${index}`}
            className={`rounded-md border-l-4 p-3 ${getActionStyles(item.action)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-800">
                <span className="font-semibold">{item.actor}</span>{" "}
                <span className="font-medium text-slate-700">{item.action}</span>{" "}
                <span className="text-slate-900">{item.task_title}</span>
              </p>
              <time className="shrink-0 text-xs text-slate-500">{formatTimestamp(item.time)}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
