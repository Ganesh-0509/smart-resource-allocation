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
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#1D9E75]">{value}</p>
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
    onSuccess: async (_, variables) => {
      toast.success("Task assigned! SMS sent to volunteer.");

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
    <div className="space-y-6">
      <Toaster position="top-right" toastOptions={{ duration: 2600 }} />

      {hasQueryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>Some dashboard data failed to load. You can continue, or retry now.</p>
            <button
              type="button"
              onClick={() => void retryDashboardQueries()}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry all
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <MetricsCard label="Open" value={stats?.open_count ?? 0} loading={statsQuery.isLoading} />
            <MetricsCard label="In Progress" value={stats?.in_progress_count ?? 0} loading={statsQuery.isLoading} />
            <MetricsCard label="Completed Today" value={stats?.completed_today ?? 0} loading={statsQuery.isLoading} />
            <MetricsCard label="Active Volunteers" value={stats?.active_volunteers ?? 0} loading={statsQuery.isLoading} />
          </div>

          {statsQuery.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{statsQuery.error instanceof Error ? statsQuery.error.message : "Failed to load — Retry"}</p>
              <button
                type="button"
                onClick={() => void statsQuery.refetch()}
                className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Failed to load — Retry
              </button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {urgencyTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setUrgencyFilter(tab.key)}
                  className={[
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    urgencyFilter === tab.key
                      ? "bg-[#1D9E75] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}

              <div className="ml-auto">
                <select
                  value={needTypeFilter}
                  onChange={(event) => setNeedTypeFilter(event.target.value as NeedTypeFilter)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#1D9E75] focus:outline-none"
                >
                  {needTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All need types" : option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Tasks</h2>
              {tasksQuery.isFetching && <LoadingSpinner label="Refreshing" />}
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {tasksQuery.isLoading && (
                <div className="space-y-2">
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                </div>
              )}

              {tasksQuery.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>{tasksQuery.error instanceof Error ? tasksQuery.error.message : "Failed to load — Retry"}</p>
                  <button
                    type="button"
                    onClick={() => void tasksQuery.refetch()}
                    className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Failed to load — Retry
                  </button>
                </div>
              )}

              {!tasksQuery.isLoading && !filteredTasks.length && (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No tasks found for the selected filters.
                </p>
              )}

              {filteredTasks.map((task) => (
                <div key={task.id} className="space-y-1">
                  <TaskCard
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onSelect={(item) => {
                      setSelectedTaskId(item.id);
                      setShowMobileDetailSheet(true);
                    }}
                  />
                  <div className="px-1 text-xs text-slate-500">
                    Status: <span className="font-semibold capitalize text-slate-700">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-7">
          {!selectedTask && (
            <div className="hidden rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm md:block">
              Select a task from the left panel to view details and assign volunteers.
            </div>
          )}

          {selectedTask && (
            <div className="hidden space-y-4 md:block">
              <article className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedTask.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedTask.description || "No description available for this task."}
                    </p>
                  </div>
                  <UrgencyBadge score={selectedTask.urgency_score} />
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-slate-500">Ward</dt>
                    <dd className="text-slate-800">{selectedTask.ward || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">District</dt>
                    <dd className="text-slate-800">{selectedTask.district || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Households</dt>
                    <dd className="text-slate-800">{selectedTask.household_count ?? 1}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Urgency Score</dt>
                    <dd className="text-slate-800">{selectedTask.urgency_score}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Need Type</dt>
                    <dd className="capitalize text-slate-800">{selectedTask.need_type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Source</dt>
                    <dd className="capitalize text-slate-800">{selectedTask.source || "manual"}</dd>
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
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Volunteer Matches</h3>
                  {findMatchesMutation.isPending && <LoadingSpinner label="Running match" />}
                </div>

                {matchedTaskId !== selectedTask.id && !matches.length && (
                  <p className="text-sm text-slate-500">Run matching to view top volunteers for this task.</p>
                )}

                {matchedTaskId === selectedTask.id && !findMatchesMutation.isPending && !matches.length && (
                  <p className="text-sm text-slate-500">No volunteer matches found for this task.</p>
                )}

                <div className="space-y-3">
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
                        if (!selectedTask) {
                          return;
                        }
                        assignMutation.mutate({ taskId: selectedTask.id, volunteerId: item.id });
                      }}
                      isAssigning={
                        assignMutation.isPending && assignMutation.variables?.volunteerId === volunteer.id
                      }
                    />
                  ))}
                </div>
              </article>
            </div>
          )}

          <ActivityFeed activities={activities} />
          {activityQuery.isLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 space-y-2">
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          )}
          {activityQuery.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{activityQuery.error instanceof Error ? activityQuery.error.message : "Failed to load — Retry"}</p>
              <button
                type="button"
                onClick={() => void activityQuery.refetch()}
                className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Failed to load — Retry
              </button>
            </div>
          )}
        </section>
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
