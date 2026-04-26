import { formatDistanceToNow } from "date-fns";
import type { AuditLog } from "../types";

interface AuditTimelineProps {
  logs: AuditLog[];
  loading?: boolean;
}

export default function AuditTimeline({ logs, loading }: AuditTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-1 bg-slate-100 rounded-full" />
            <div className="flex-1 py-2">
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
              <div className="mt-2 h-2 w-1/4 bg-slate-50 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
        <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No history recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
      {logs.map((log) => (
        <div key={log.id} className="relative pl-8 group">
          {/* Dot */}
          <div className="absolute left-0 top-1.5 h-[24px] w-[24px] flex items-center justify-center">
             <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white transition-all group-hover:scale-125 ${
               log.action_type.includes('APPROVED') || log.action_type.includes('COMPLETED') 
                 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                 : log.action_type.includes('REJECTED') || log.action_type.includes('FAILED') || log.action_type.includes('ESCALATION')
                 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                 : 'bg-slate-400'
             }`} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {log.action_type.replace(/_/g, ' ')}
              </span>
              <time className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </time>
            </div>
            <p className="mt-1 text-xs font-medium text-[#1A3C2E] leading-relaxed">
              {log.description}
            </p>
            {log.user_role && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                  log.user_role === 'ngo' ? 'bg-[#1A3C2E] text-white' : 
                  log.user_role === 'volunteer' ? 'bg-[#E8712A] text-white' : 
                  'bg-slate-100 text-slate-500'
                }`}>
                  {log.user_role}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
