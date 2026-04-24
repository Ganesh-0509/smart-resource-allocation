
type Activity = {
  time: string;
  action: string;
  actor: string;
  task_title: string;
};

type ActivityFeedProps = {
  activities: Activity[];
};

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActionBadge(action: string): { label: string; style: string } {
  const normalized = action.toLowerCase();
  
  if (normalized.includes("batch_sms_sent")) {
    return { label: "Urgent Broadcast", style: "bg-purple-100 text-purple-700 border-purple-200" };
  }
  if (normalized.includes("assigned")) {
    return { label: "Task Assigned", style: "bg-blue-100 text-blue-700 border-blue-200" };
  }
  if (normalized.includes("completed")) {
    return { label: "Task Completed", style: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  if (normalized.includes("registered")) {
    return { label: "New Volunteer", style: "bg-teal-100 text-teal-700 border-teal-200" };
  }
  
  return { label: action, style: "bg-slate-100 text-slate-700 border-slate-200" };
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities.length) {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-sm font-medium text-slate-400">No recent activity detected on the ground.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Field Activity Stream</h3>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Update</span>
        </div>
      </div>
      
      <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {activities.map((item, index) => {
          const badge = getActionBadge(item.action);
          return (
            <article
              key={`${item.time}-${item.actor}-${index}`}
              className="group relative flex gap-4 transition-all duration-300"
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-slate-200 ring-4 ring-white" />
                {index !== activities.length - 1 && <div className="w-[1px] flex-1 bg-slate-100" />}
              </div>

              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.style}`}>
                    {badge.label}
                  </span>
                  <time className="text-[10px] font-bold text-slate-400 uppercase">
                    {formatTimeAgo(item.time)}
                  </time>
                </div>
                
                <p className="text-sm text-slate-600 leading-snug">
                  <span className="font-bold text-slate-900">{item.actor}</span>{" "}
                  {item.action.replace(/_/g, " ")}{" "}
                  {item.task_title && (
                    <span className="font-bold text-[#1A3C2E]">"{item.task_title}"</span>
                  )}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
