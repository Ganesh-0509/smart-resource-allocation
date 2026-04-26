import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getDashboardActivity } from "../services/tasks";
import { getDistrictImpact } from "../services/analytics";
import ActivityFeed from "../components/ActivityFeed";
import type { DashboardStats, DashboardActivity, DistrictImpactMetrics } from "../types";

export default function DashboardOverview() {
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30000,
  });

  const activityQuery = useQuery<DashboardActivity[]>({
    queryKey: ["dashboard-activity"],
    queryFn: getDashboardActivity,
    refetchInterval: 30000,
  });

  const impactQuery = useQuery<DistrictImpactMetrics[]>({
    queryKey: ["district-impact"],
    queryFn: getDistrictImpact,
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Operations Overview</h1>
        <p className="text-slate-500 mt-2">Real-time metrics and impact analytics across your organization.</p>
      </header>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          label="Open Needs" 
          value={stats?.open_count ?? 0} 
          loading={statsQuery.isLoading} 
          color="text-orange-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <MetricCard 
          label="Active Missions" 
          value={stats?.in_progress_count ?? 0} 
          loading={statsQuery.isLoading} 
          color="text-emerald-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <MetricCard 
          label="Completed Today" 
          value={stats?.completed_today ?? 0} 
          loading={statsQuery.isLoading} 
          color="text-[#E8712A]"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard 
          label="Field Agents" 
          value={stats?.active_volunteers ?? 0} 
          loading={statsQuery.isLoading} 
          color="text-blue-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: District Impact Table */}
        <section className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-[#1A3C2E] uppercase tracking-widest mb-6">Regional Impact</h3>
            <div className="overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="pb-4 text-[10px] font-black uppercase text-slate-400">District</th>
                    <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Households Served</th>
                    <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Tasks Completed</th>
                    <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {impactQuery.data?.map((district) => (
                    <tr key={district.district} className="group hover:bg-slate-50/50 transition-all">
                      <td className="py-4 font-bold text-[#1A3C2E]">{district.district}</td>
                      <td className="py-4 text-sm text-slate-600">{district.total_households_served}</td>
                      <td className="py-4 text-sm text-slate-600">{district.total_tasks_completed}</td>
                      <td className="py-4 text-sm font-black text-emerald-600">{district.avg_task_completion_rate}%</td>
                    </tr>
                  ))}
                  {(!impactQuery.data || impactQuery.data.length === 0) && !impactQuery.isLoading && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No regional data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Right: Live Activity Feed */}
        <aside className="lg:col-span-4">
           <ActivityFeed 
             activities={(activityQuery.data || []).map(a => ({
               time: a.created_at,
               action: a.action_type,
               actor: a.actor_id,
               task_title: a.task_title || "Update"
             })).slice(0, 10)} 
           />
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, loading, color, icon }: { label: string; value: number; loading: boolean; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className={`mb-4 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-16 bg-slate-50 animate-pulse rounded" />
      ) : (
        <p className={`text-4xl font-black ${color} font-['Instrument_Serif'] tracking-tight`}>{value}</p>
      )}
    </div>
  );
}
