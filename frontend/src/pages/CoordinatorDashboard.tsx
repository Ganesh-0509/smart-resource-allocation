import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";

import {
  assignVolunteer,
  getDashboardActivity,
  getDashboardStats,
  getTaskMatches,
  getTasks,
} from "../api/tasks";
import ActivityFeed from "../components/ActivityFeed";
import TaskCard from "../components/TaskCard";
import UrgencyBadge from "../components/UrgencyBadge";
import VolunteerCard from "../components/VolunteerCard";
import type { DashboardActivity, DashboardStats, Task, TaskNeedType, VolunteerMatch } from "../types";

type UrgencyTab = "all" | "critical" | "high" | "medium";

type NeedTypeFilter = "all" | TaskNeedType;

type ActivityFeedItem = {
  time: string;
  action: string;
  actor: string;
  task_title: string;
};

const urgencyTabs: Array<{ key: UrgencyTab; label: string }> = [
  { key: "all", label: "All" },
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

  if (urgencyFilter === "critical") {
    return score >= 80;
  }

  if (urgencyFilter === "high") {
    return score >= 60 && score <= 79;
  }

  if (urgencyFilter === "medium") {
    return score >= 40 && score <= 59;
  }

  return true;
}

function MetricsCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-3 border border-slate-100 animate-pulse">
        <div className="h-2 w-16 rounded bg-slate-50" />
        <div className="mt-2 h-6 w-10 rounded bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm border border-[#114B3B]/5 transition-all hover:bg-slate-50/50">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xl font-black text-[#1A3C2E] font-['Instrument_Serif']">{value}</p>
    </div>
  );
}

function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-600">
      <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
      </svg>
      {label || "Loading..."}
    </div>
  );
}

function parseActivityDetails(details: string | undefined): Record<string, string> {
  if (!details) {
    return {};
  }

  return details.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, rawValue] = pair.split("=");
    if (!rawKey || !rawValue) {
      return acc;
    }
    acc[rawKey.trim().toLowerCase()] = rawValue.trim();
    return acc;
  }, {});
}

function normalizeActivity(item: DashboardActivity): ActivityFeedItem {
  const parsedDetails = parseActivityDetails(item.details);

  return {
    time: item.created_at || new Date().toISOString(),
    action: item.action_type || parsedDetails.action || "Updated",
    actor: item.actor_id || parsedDetails.actor || "system",
    task_title: item.task_title || "Task update",
  };
}

export default function CoordinatorDashboard() {
  const queryClient = useQueryClient();

  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyTab>("all");
  const [needTypeFilter, setNeedTypeFilter] = useState<NeedTypeFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [matches, setMatches] = useState<VolunteerMatch[]>([]);
  const [matchedTaskId, setMatchedTaskId] = useState<string | null>(null);
  const [showMobileDetailSheet, setShowMobileDetailSheet] = useState(false);

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["dashboard-tasks"],
    queryFn: () => getTasks({ status: "open" }),
    refetchInterval: 30_000,
  });

  const activityQuery = useQuery<DashboardActivity[]>({
    queryKey: ["dashboard-activity"],
    queryFn: getDashboardActivity,
    refetchInterval: 30_000,
    retry: false,
  });

  const allTasks = tasksQuery.data || [];

  const filteredTasks = useMemo(() => {
    return [...allTasks]
      .filter((task) => matchesUrgency(task, urgencyFilter))
      .filter((task) => (needTypeFilter === "all" ? true : task.need_type === needTypeFilter))
      .sort((a, b) => b.urgency_score - a.urgency_score);
  }, [allTasks, urgencyFilter, needTypeFilter]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }
    return allTasks.find((task) => task.id === selectedTaskId) || null;
  }, [allTasks, selectedTaskId]);

  const normalizedActivities = useMemo<ActivityFeedItem[]>(() => {
    return (activityQuery.data || []).map(normalizeActivity).slice(0, 10);
  }, [activityQuery.data]);

  useEffect(() => {
    if (!filteredTasks.length) {
      setSelectedTaskId(null);
      return;
    }

    const stillVisible = filteredTasks.some((task) => task.id === selectedTaskId);
    if (!stillVisible) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId !== matchedTaskId) {
      setMatches([]);
    }
  }, [selectedTaskId, matchedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      setShowMobileDetailSheet(false);
    }
  }, [selectedTask]);

  const findMatchesMutation = useMutation({
    mutationFn: (taskId: string) => getTaskMatches(taskId),
    onSuccess: (result, taskId) => {
      setMatches(result);
      setMatchedTaskId(taskId);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to fetch volunteer matches.";
      toast.error(message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ taskId, volunteerId }: { taskId: string; volunteerId: string }) =>
      assignVolunteer(taskId, volunteerId, "coordinator"),
    onSuccess: async (result, variables) => {
      if (result.sms_sent) {
        toast.success("Task assigned and SMS sent to volunteer.");
      } else {
        toast.success("Task assigned. SMS notification was not sent.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] }),
      ]);

      if (selectedTaskId) {
        findMatchesMutation.mutate(selectedTaskId);
      }

      setMatches((prev) => prev.filter((volunteer) => volunteer.id !== variables.volunteerId));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to assign volunteer.";
      toast.error(message);
    },
  });

  const stats = statsQuery.data;
  const activities = normalizedActivities;
  const hasQueryError = statsQuery.isError || tasksQuery.isError || activityQuery.isError;

  async function retryDashboardQueries() {
    await Promise.all([statsQuery.refetch(), tasksQuery.refetch(), activityQuery.refetch()]);
  }

  return (
    <div className="space-y-8">
      <Toaster position="top-right" toastOptions={{ duration: 2600 }} />

      {hasQueryError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold">!</span>
              <p className="font-medium">System performance is degraded due to missing database metrics.</p>
            </div>
            <button
              type="button"
              onClick={() => void retryDashboardQueries()}
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-700 shadow-sm border border-red-100 transition-all hover:bg-red-50"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Slim Top Bar */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <MetricsCard label="Needs" value={stats?.open_count ?? 0} loading={statsQuery.isLoading} />
          <MetricsCard label="Missions" value={stats?.in_progress_count ?? 0} loading={statsQuery.isLoading} />
          <MetricsCard label="Impact" value={stats?.completed_today ?? 0} loading={statsQuery.isLoading} />
          <MetricsCard label="Field" value={stats?.active_volunteers ?? 0} loading={statsQuery.isLoading} />
        </div>
        
        <div className="flex items-center gap-2 rounded-xl bg-white p-2 border border-slate-200">
           <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
           <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">Live Network Active</span>
        </div>
      </section>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Sidebar: Navigation & Discovery */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(26,60,46,0.03)] border border-[#114B3B]/5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Discovery Filter</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {urgencyTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setUrgencyFilter(tab.key)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all",
                      urgencyFilter === tab.key
                        ? "bg-[#E8712A] text-white shadow-md shadow-[#E8712A]/20"
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <select
                value={needTypeFilter}
                onChange={(event) => setNeedTypeFilter(event.target.value as NeedTypeFilter)}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black text-[#1A3C2E] uppercase tracking-wider"
              >
                {needTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Needs" : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60 tracking-widest">Active Needs</h2>
                {tasksQuery.isFetching && <LoadingSpinner label="" />}
              </div>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onSelect={(item) => {
                      setSelectedTaskId(item.id);
                      setShowMobileDetailSheet(true);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <ActivityFeed activities={activities} />
        </aside>

        {/* Content: Main Field Workspace */}
        <main className="lg:col-span-8 space-y-6">
          {!selectedTask ? (
            <div className="flex h-[70vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white shadow-sm p-12 text-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select a task to begin mission planning</p>
            </div>
          ) : (
            <div className="flex flex-col min-h-full space-y-6">
              <article className="rounded-3xl bg-white p-6 shadow-sm border border-[#114B3B]/5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       <UrgencyBadge score={selectedTask.urgency_score} />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {selectedTask.id.slice(0,8)}</span>
                    </div>
                    <h2 className="text-2xl font-black text-[#1A3C2E] font-['Instrument_Serif']">{selectedTask.title}</h2>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">{selectedTask.description || "No mission brief provided."}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => findMatchesMutation.mutate(selectedTask.id)}
                    disabled={findMatchesMutation.isPending}
                    className="rounded-xl bg-[#1A3C2E] px-6 py-3 text-xs font-black text-white hover:bg-[#2D5E47] transition-all shadow-lg shadow-[#1A3C2E]/10"
                  >
                     {findMatchesMutation.isPending ? "Matching..." : "Locate Field Agents"}
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4 border-t border-slate-50 pt-6">
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Region</p>
                      <p className="text-sm font-bold text-[#1A3C2E]">{selectedTask.ward || "Unassigned"}, {selectedTask.district}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Scale</p>
                      <p className="text-sm font-bold text-[#1A3C2E]">{selectedTask.household_count} Households</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Need Type</p>
                      <p className="text-sm font-bold capitalize text-[#1A3C2E]">{selectedTask.need_type}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Status</p>
                      <p className="text-sm font-bold capitalize text-emerald-600">Active {selectedTask.status}</p>
                   </div>
                </div>
              </article>

              <section className="flex-1 flex flex-col rounded-3xl bg-[#FAF8F3] p-6 border border-[#114B3B]/5 shadow-inner">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#1A3C2E] uppercase tracking-widest">Field Matches</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Top responders prioritized by skill and distance</p>
                  </div>
                  {findMatchesMutation.isPending && <LoadingSpinner label="" />}
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-1">
                  {matches.length === 0 && !findMatchesMutation.isPending && (
                    <div className="md:col-span-2 py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-2 border-dashed border-slate-100 rounded-2xl">
                      Scanner ready — initiate matching
                    </div>
                  )}

                  {matches.map((volunteer) => (
                    <VolunteerCard
                      key={volunteer.id}
                      volunteer={volunteer}
                      onAssign={(item) => {
                        if (!selectedTask) return;
                        assignMutation.mutate({ taskId: selectedTask.id, volunteerId: item.id });
                      }}
                      isAssigning={assignMutation.isPending && assignMutation.variables?.volunteerId === volunteer.id}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {selectedTask && showMobileDetailSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowMobileDetailSheet(false)}
          />

          <section className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{selectedTask.description || "No description available for this task."}</p>
              </div>
              <UrgencyBadge score={selectedTask.urgency_score} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Ward</dt>
                <dd className="text-slate-800">{selectedTask.ward || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">District</dt>
                <dd className="text-slate-800">{selectedTask.district || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Urgency Score</dt>
                <dd className="text-slate-800">{selectedTask.urgency_score}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Households</dt>
                <dd className="text-slate-800">{selectedTask.household_count ?? 1}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Source</dt>
                <dd className="capitalize text-slate-800">{selectedTask.source || "manual"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Need Type</dt>
                <dd className="capitalize text-slate-800">{selectedTask.need_type}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Required Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedTask.required_skills || []).map((skill) => (
                  <span key={skill} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => findMatchesMutation.mutate(selectedTask.id)}
              disabled={findMatchesMutation.isPending}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177f5e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {findMatchesMutation.isPending ? <LoadingSpinner label="Matching..." /> : "Find Best Volunteers"}
            </button>

            <div className="mt-4 space-y-3">
              {findMatchesMutation.isPending && (
                <>
                  <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
                </>
              )}

              {matches.map((volunteer) => (
                <VolunteerCard
                  key={volunteer.id}
                  volunteer={volunteer}
                  onAssign={(item) => {
                    assignMutation.mutate({ taskId: selectedTask.id, volunteerId: item.id });
                  }}
                  isAssigning={assignMutation.isPending && assignMutation.variables?.volunteerId === volunteer.id}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
