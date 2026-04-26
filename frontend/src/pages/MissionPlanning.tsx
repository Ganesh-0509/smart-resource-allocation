import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";

import {
  assignVolunteer,
  getTaskMatches,
  getTasks,
} from "../services/tasks";
import { getEntityHistory } from "../services/audit";
import TaskCard from "../components/TaskCard";
import UrgencyBadge from "../components/UrgencyBadge";
import VolunteerCard from "../components/VolunteerCard";
import AuditTimeline from "../components/AuditTimeline";
import type { Task, TaskNeedType, VolunteerMatch, AuditLog } from "../types";

type UrgencyTab = "all" | "critical" | "high" | "medium" | "escalated";
type NeedTypeFilter = "all" | TaskNeedType;

const urgencyTabs: Array<{ key: UrgencyTab; label: string }> = [
  { key: "all", label: "All Missions" },
  { key: "escalated", label: "Escalated" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
];

const needTypeOptions: NeedTypeFilter[] = [
  "all",
  "nutrition",
  "medical",
  "shelter",
  "education",
  "water",
  "livelihood",
  "other",
];

function matchesUrgency(task: Task, urgencyFilter: UrgencyTab): boolean {
  const score = task.urgency_score;
  if (urgencyFilter === "escalated") return task.status === "escalated";
  if (urgencyFilter === "critical") return score >= 80;
  if (urgencyFilter === "high") return score >= 60 && score <= 79;
  if (urgencyFilter === "medium") return score >= 40 && score <= 59;
  return true;
}

export default function MissionPlanning() {
  const queryClient = useQueryClient();
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyTab>("all");
  const [needTypeFilter, setNeedTypeFilter] = useState<NeedTypeFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [matches, setMatches] = useState<VolunteerMatch[]>([]);
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["dashboard-tasks"],
    queryFn: () => getTasks({ status: undefined }),
    refetchInterval: 30000,
  });

  const auditHistoryQuery = useQuery<AuditLog[]>({
    queryKey: ["audit-history-task", selectedTaskId],
    queryFn: () => getEntityHistory("task", selectedTaskId!),
    enabled: !!selectedTaskId && showAuditHistory,
  });

  const allTasks = tasksQuery.data || [];

  const filteredTasks = useMemo(() => {
    return allTasks
      .filter((task) => task.status === "open" || task.status === "assigned" || task.status === "escalated")
      .filter((task) => matchesUrgency(task, urgencyFilter))
      .filter((task) => (needTypeFilter === "all" ? true : task.need_type === needTypeFilter))
      .sort((a, b) => b.urgency_score - a.urgency_score);
  }, [allTasks, urgencyFilter, needTypeFilter]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return allTasks.find((task) => task.id === selectedTaskId) || null;
  }, [allTasks, selectedTaskId]);

  useEffect(() => {
    if (!filteredTasks.length) {
      setSelectedTaskId(null);
      return;
    }
    if (!filteredTasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  const findMatchesMutation = useMutation({
    mutationFn: (taskId: string) => getTaskMatches(taskId),
    onSuccess: (result) => {
      setMatches(result);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ taskId, volunteerId }: { taskId: string; volunteerId: string }) =>
      assignVolunteer(taskId, volunteerId, "coordinator"),
    onSuccess: () => {
      toast.success("Volunteer deployed to mission");
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
      if (selectedTaskId) findMatchesMutation.mutate(selectedTaskId);
    },
  });



  return (
    <div className="space-y-8">
      <Toaster position="top-right" />
      
      <header>
        <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Mission Planning</h1>
        <p className="text-slate-500 mt-2">Identify needs, deploy volunteers, and track field execution.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Task List Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="space-y-4 mb-8">
               <div className="flex flex-wrap gap-1.5">
                {urgencyTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setUrgencyFilter(tab.key)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all ${
                      urgencyFilter === tab.key ? "bg-[#E8712A] text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <select
                value={needTypeFilter}
                onChange={(e) => setNeedTypeFilter(e.target.value as NeedTypeFilter)}
                className="w-full rounded-xl border border-slate-50 bg-slate-50 px-4 py-2 text-[10px] font-black text-[#1A3C2E] uppercase tracking-wider"
              >
                {needTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt === "all" ? "All Need Types" : opt}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {filteredTasks.length === 0 && (
                 <div className="py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-50 rounded-2xl">
                    No active missions found
                 </div>
              )}
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  onSelect={(t) => setSelectedTaskId(t.id)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Mission Control Area */}
        <main className="lg:col-span-8 space-y-6">
          {!selectedTask ? (
            <div className="flex h-[60vh] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select a mission to initiate deployment</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <article className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                   <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UrgencyBadge score={selectedTask.urgency_score} />
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                          selectedTask.status === 'escalated' ? 'bg-red-600 text-white' : 
                          selectedTask.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {selectedTask.status}
                        </span>
                      </div>
                      <h2 className="text-3xl font-black text-[#1A3C2E] font-['Instrument_Serif']">{selectedTask.title}</h2>
                      <p className="text-slate-500 text-sm max-w-2xl">{selectedTask.description}</p>
                   </div>
                   <div className="flex gap-2">
                      <button
                        onClick={() => findMatchesMutation.mutate(selectedTask.id)}
                        disabled={findMatchesMutation.isPending}
                        className="bg-[#1A3C2E] text-white px-6 py-3 rounded-2xl text-xs font-black hover:scale-[1.02] transition-all shadow-xl shadow-[#1A3C2E]/20"
                      >
                        {findMatchesMutation.isPending ? "Matching..." : "Locate Field Agents"}
                      </button>
                      <button 
                         onClick={() => setShowAuditHistory(!showAuditHistory)}
                         className={`p-3 rounded-2xl border transition-all ${showAuditHistory ? 'bg-[#1A3C2E] text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-50">
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Region</p>
                      <p className="text-sm font-bold text-[#1A3C2E]">{selectedTask.ward}, {selectedTask.district}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Impact Scale</p>
                      <p className="text-sm font-bold text-[#1A3C2E]">{selectedTask.household_count} Households</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Need Type</p>
                      <p className="text-sm font-bold text-[#1A3C2E] capitalize">{selectedTask.need_type}</p>
                   </div>
                </div>
              </article>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 {/* Deployment Suggestions */}
                 <section className={`rounded-3xl bg-[#FAF8F3] p-8 border border-slate-100 shadow-inner ${showAuditHistory ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                    <h3 className="text-sm font-black text-[#1A3C2E] uppercase tracking-widest mb-6">Deployment Suggestions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {matches.length === 0 && (
                          <div className="md:col-span-2 py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-2 border-dashed border-slate-100 rounded-3xl">
                             Ready for matching
                          </div>
                       )}
                       {matches.map(vol => (
                          <VolunteerCard 
                             key={vol.id} 
                             volunteer={vol} 
                             onAssign={() => assignMutation.mutate({ taskId: selectedTask.id, volunteerId: vol.id })}
                             isAssigning={assignMutation.isPending && assignMutation.variables?.volunteerId === vol.id}
                          />
                       ))}
                    </div>
                 </section>

                 {/* History Sidebar */}
                 {showAuditHistory && (
                    <aside className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-right-4">
                       <h3 className="text-sm font-black text-[#1A3C2E] uppercase tracking-widest mb-6">Mission History</h3>
                       <AuditTimeline logs={auditHistoryQuery.data || []} loading={auditHistoryQuery.isLoading} />
                    </aside>
                 )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
