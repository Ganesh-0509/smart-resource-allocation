import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";

import { getVolunteer, getVolunteerTasks, updateAvailability } from "../api/volunteers";
import { acceptAssignment, declineAssignment, checkInAssignment, checkOutAssignment } from "../api/assignments";
import UrgencyBadge from "../components/UrgencyBadge";
import type { Assignment, Task, Volunteer } from "../types";

type TaskRow = {
  assignment: Assignment;
  task: Task;
};

type Trend = "up" | "down" | "flat";

const skillPalette = [
  "bg-emerald-100 text-emerald-800",
  "bg-blue-100 text-blue-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-lime-100 text-lime-800",
  "bg-slate-200 text-slate-700",
];

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function normalizeTaskRows(assignments: Assignment[]): TaskRow[] {
  return assignments
    .map((assignment) => {
      const task = assignment.tasks || assignment.task;
      if (!task) {
        return null;
      }
      return { assignment, task };
    })
    .filter((row): row is TaskRow => Boolean(row));
}

function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-60 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-20 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-4 w-36 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function PerformanceRing({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, Math.round(score || 0)));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-slate-200" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="fill-none stroke-[#1D9E75] transition-all duration-500"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{normalized}</span>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Score</span>
      </div>
    </div>
  );
}

function StatsCard({ label, value, trend }: { label: string; value: string; trend?: Trend }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#1D9E75]">{value}</p>
      {trend && (
        <p
          className={[
            "mt-1 text-xs font-medium",
            trend === "up" ? "text-emerald-700" : trend === "down" ? "text-red-600" : "text-slate-500",
          ].join(" ")}
        >
          {trend === "up" && "↑ Up vs last week"}
          {trend === "down" && "↓ Down vs last week"}
          {trend === "flat" && "→ Same as last week"}
        </p>
      )}
    </article>
  );
}

export default function VolunteerDashboard() {
  const volunteerId =
    localStorage.getItem("namma_volunteer_id") ||
    localStorage.getItem("volunteer_id") ||
    localStorage.getItem("volunteerId");
  const queryClient = useQueryClient();

  const volunteerQuery = useQuery<Volunteer>({
    queryKey: ["volunteer-profile", volunteerId],
    queryFn: () => getVolunteer(volunteerId as string),
    enabled: Boolean(volunteerId),
    refetchInterval: 60_000,
  });

  const tasksQuery = useQuery<Assignment[]>({
    queryKey: ["volunteer-tasks", volunteerId],
    queryFn: () => getVolunteerTasks(volunteerId as string),
    enabled: Boolean(volunteerId),
    refetchInterval: 60_000,
  });

  const availabilityMutation = useMutation({
    mutationFn: (available: boolean) => updateAvailability(volunteerId as string, available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-profile", volunteerId] });
      toast.success("Availability updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update availability.");
    },
  });

  const acceptAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => acceptAssignment(assignmentId),
    onSuccess: () => {
      toast.success("Assignment accepted!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-tasks", volunteerId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to accept assignment.");
    },
  });

  const declineAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => declineAssignment(assignmentId, "Declined by volunteer"),
    onSuccess: () => {
      toast.success("Assignment declined.");
      queryClient.invalidateQueries({ queryKey: ["volunteer-tasks", volunteerId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to decline assignment.");
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      return checkInAssignment(assignmentId, position.coords.latitude, position.coords.longitude);
    },
    onSuccess: () => {
      toast.success("Checked in successfully!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-tasks", volunteerId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to check in.");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      return checkOutAssignment(assignmentId, position.coords.latitude, position.coords.longitude);
    },
    onSuccess: () => {
      toast.success("Checked out and task completed!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-tasks", volunteerId] });
      queryClient.invalidateQueries({ queryKey: ["volunteer-profile", volunteerId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to check out.");
    },
  });

  const rows = useMemo(() => normalizeTaskRows(tasksQuery.data || []), [tasksQuery.data]);

  const activeRows = useMemo(
    () =>
      rows
        .filter((row) => row.assignment.status !== "completed" && row.assignment.status !== "declined")
        .sort((a, b) => b.task.urgency_score - a.task.urgency_score),
    [rows],
  );

  const completedRows = useMemo(
    () =>
      rows
        .filter((row) => row.assignment.status === "completed")
        .sort((a, b) => {
          const first = new Date(a.assignment.completed_at || a.task.created_at).getTime();
          const second = new Date(b.assignment.completed_at || b.task.created_at).getTime();
          return second - first;
        }),
    [rows],
  );

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  const completedThisWeek = completedRows.filter((row) => {
    const completedAt = new Date(row.assignment.completed_at || "").getTime();
    return Number.isFinite(completedAt) && completedAt >= now - weekMs;
  }).length;

  const completedThisMonth = completedRows.filter((row) => {
    const completedAt = new Date(row.assignment.completed_at || "").getTime();
    return Number.isFinite(completedAt) && completedAt >= now - monthMs;
  }).length;

  const completedLastWeek = completedRows.filter((row) => {
    const completedAt = new Date(row.assignment.completed_at || "").getTime();
    return Number.isFinite(completedAt) && completedAt < now - weekMs && completedAt >= now - 2 * weekMs;
  }).length;

  const trend: Trend =
    completedThisWeek > completedLastWeek ? "up" : completedThisWeek < completedLastWeek ? "down" : "flat";

  if (!volunteerId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">No account found</h1>
        <p className="mt-3 text-slate-600">Please register as a volunteer to view your tasks and availability dashboard.</p>
        <Link
          to="/volunteer/register"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177f5e]"
        >
          Register as Volunteer
        </Link>
      </section>
    );
  }

  const volunteer = volunteerQuery.data;
  const initialLoading = volunteerQuery.isLoading || tasksQuery.isLoading;
  const hasQueryError = volunteerQuery.isError || tasksQuery.isError;

  async function retryVolunteerData() {
    await Promise.all([volunteerQuery.refetch(), tasksQuery.refetch()]);
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" toastOptions={{ duration: 2400 }} />

      {initialLoading && (
        <>
          <ProfileSkeleton />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </div>
          <TaskSkeleton />
        </>
      )}

      {!initialLoading && hasQueryError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          <h2 className="text-lg font-semibold text-red-800">Could not load volunteer dashboard</h2>
          {volunteerQuery.isError && (
            <p className="mt-2 text-sm">
              {volunteerQuery.error instanceof Error ? volunteerQuery.error.message : "Failed to load profile."}
            </p>
          )}
          {tasksQuery.isError && (
            <p className="mt-1 text-sm">
              {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Failed to load tasks."}
            </p>
          )}
          <button
            type="button"
            onClick={() => void retryVolunteerData()}
            className="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </section>
      )}

      {!initialLoading && volunteer && (
        <>
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{volunteer.name}</h1>
                <p className="mt-1 text-sm text-slate-600">Volunteer Dashboard</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(volunteer.skills || []).map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${skillPalette[index % skillPalette.length]}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(volunteer.availability)}
                      onChange={(event) => availabilityMutation.mutate(event.target.checked)}
                      disabled={availabilityMutation.isPending}
                      className="h-4 w-4 accent-[#1D9E75]"
                    />
                    Available to help right now
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <PerformanceRing score={volunteer.performance_score} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Tasks Done</p>
                  <p className="mt-1 text-3xl font-bold text-[#1D9E75]">{volunteer.total_tasks_done}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatsCard label="Tasks This Week" value={String(completedThisWeek)} />
            <StatsCard label="Tasks This Month" value={String(completedThisMonth)} />
            <StatsCard label="Performance Trend" value={trend === "up" ? "Improving" : trend === "down" ? "Dropping" : "Stable"} trend={trend} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">My active tasks</h2>
              {tasksQuery.isFetching && <span className="text-xs text-slate-500">Refreshing...</span>}
            </div>

            {!activeRows.length && !completedRows.length && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
                You&apos;ll be notified by SMS when a task matches your skills. Keep your availability on!
              </div>
            )}

            {activeRows.length > 0 && (
              <div className="space-y-3">
                {activeRows.map((row) => (
                  <article key={row.assignment.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{row.task.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{row.task.ward}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {row.assignment.status}</p>
                      </div>
                      <UrgencyBadge score={row.task.urgency_score} />
                    </div>

                    <p className="mt-3 text-xs text-slate-500">Assigned: {formatDateTime(row.assignment.assigned_at || row.task.created_at)}</p>
                    {row.assignment.check_in_time && (
                      <p className="mt-1 text-xs text-slate-500">Checked in: {formatDateTime(row.assignment.check_in_time)}</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      {row.assignment.status === "assigned" && (
                        <>
                          <button
                            type="button"
                            onClick={() => acceptAssignmentMutation.mutate(row.assignment.id)}
                            disabled={acceptAssignmentMutation.isPending}
                            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => declineAssignmentMutation.mutate(row.assignment.id)}
                            disabled={declineAssignmentMutation.isPending}
                            className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {row.assignment.status === "accepted" && !row.assignment.check_in_time && (
                        <button
                          type="button"
                          onClick={() => checkInMutation.mutate(row.assignment.id)}
                          disabled={checkInMutation.isPending}
                          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Check In
                        </button>
                      )}
                      {row.assignment.status === "accepted" && row.assignment.check_in_time && !row.assignment.check_out_time && (
                        <button
                          type="button"
                          onClick={() => checkOutMutation.mutate(row.assignment.id)}
                          disabled={checkOutMutation.isPending}
                          className="inline-flex items-center rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#177f5e] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Completed tasks</h2>

            {!completedRows.length && (
              <p className="mt-3 text-sm text-slate-500">No completed tasks yet.</p>
            )}

            {completedRows.length > 0 && (
              <div className="mt-3 space-y-3">
                {completedRows.map((row) => (
                  <article
                    key={row.assignment.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-700">{row.task.title}</h3>
                        <p className="mt-1 text-sm">{row.task.ward}</p>
                      </div>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Completed
                      </span>
                    </div>
                    <p className="mt-3 text-xs">Completed: {formatDateTime(row.assignment.completed_at)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
