import { useQuery } from "@tanstack/react-query";
import { getVolunteerTasks } from "../api/volunteers";
import { useMemo } from "react";
import UrgencyBadge from "../components/UrgencyBadge";
import { Link } from "react-router-dom";

export default function VolunteerExecutionPage() {
  const volunteerId =
    localStorage.getItem("namma_volunteer_id") ||
    localStorage.getItem("volunteer_id") ||
    localStorage.getItem("volunteerId");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["volunteer-tasks", volunteerId],
    queryFn: () => getVolunteerTasks(volunteerId as string),
    enabled: Boolean(volunteerId),
    refetchInterval: 30000,
  });

  const activeTasks = useMemo(() => {
    return (assignments || []).filter(a => a.status === "assigned" || a.status === "accepted");
  }, [assignments]);

  if (!volunteerId) {
    return <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">No account found.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your mission deployments...</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF4EE] text-[#1A3C2E] text-[10px] font-black uppercase tracking-widest mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E8712A] animate-pulse"></div>
          Active Deployments
        </div>
        <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Field Execution</h1>
        <p className="mt-2 text-slate-500 font-medium">Manage your active missions and report progress directly from the field.</p>
      </header>

      {activeTasks.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-[#114B3B]/10 bg-white p-12 text-center">
          <p className="text-lg font-bold text-[#1A3C2E]">No active missions assigned</p>
          <p className="mt-2 text-sm text-slate-400">Coordinators will notify you when a mission matches your skills.</p>
          <Link to="/volunteer/dashboard" className="mt-6 inline-block text-sm font-bold text-[#E8712A] hover:underline">
            Go to Profile →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {activeTasks.map((item) => {
            const task = item.tasks || item.task;
            if (!task) return null;
            return (
              <article key={item.id} className="rounded-3xl bg-white p-8 shadow-sm border border-[#114B3B]/5 transition-all hover:shadow-xl hover:shadow-[#1A3C2E]/5">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex-1 min-w-[280px] space-y-4">
                    <div className="flex items-center gap-3">
                      <UrgencyBadge score={task.urgency_score} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status: {item.status}</span>
                    </div>
                    <h3 className="text-2xl font-black text-[#1A3C2E] font-['Instrument_Serif']">{task.title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{task.description}</p>
                    
                    <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Location</p>
                        <p className="text-sm font-bold text-[#1A3C2E]">{task.ward}, {task.district}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Household Count</p>
                        <p className="text-sm font-bold text-[#1A3C2E]">{task.household_count} Households</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <Link 
                      to="/volunteer/dashboard"
                      className="rounded-2xl bg-[#1A3C2E] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] hover:-translate-y-1 text-center"
                    >
                      Execution Portal →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
