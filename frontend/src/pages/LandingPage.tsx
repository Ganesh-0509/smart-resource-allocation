import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getDashboardStats } from "../api/tasks";
import type { DashboardStats } from "../types";

type StatCardConfig = {
  label: string;
  value: number;
};

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const safeTarget = Number.isFinite(value) ? Math.max(0, value) : 0;
    const durationMs = 700;
    const start = performance.now();
    let frameId = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / durationMs);
      setDisplayValue(Math.round(safeTarget * progress));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [value]);

  return <span>{displayValue.toLocaleString("en-IN")}</span>;
}

function StatsSkeletonCard() {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function LandingPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const statCards: StatCardConfig[] = [
    { label: "Open Needs", value: data?.open_count ?? 0 },
    { label: "Tasks In Progress", value: data?.in_progress_count ?? 0 },
    { label: "Completed Today", value: data?.completed_today ?? 0 },
    { label: "Active Volunteers", value: data?.active_volunteers ?? 0 },
  ];

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-white px-6 py-12 shadow-sm sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Connecting Communities with Care
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            AI-powered volunteer coordination for NGOs across India
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/coordinator"
              className="inline-flex w-full items-center justify-center rounded-md bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#177f5e] sm:w-auto"
            >
              I&apos;m a Coordinator
            </Link>
            <Link
              to="/volunteer/register"
              className="inline-flex w-full items-center justify-center rounded-md border border-[#1D9E75] bg-white px-5 py-3 text-sm font-semibold text-[#1D9E75] transition-colors hover:bg-emerald-50 sm:w-auto"
            >
              Register as Volunteer
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Live Operations Snapshot</h2>
          {isError ? (
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Retry
            </button>
          ) : null}
        </div>

        {isError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{error instanceof Error ? error.message : "Could not load live stats."}</p>
          </div>
        )}

        {isFetching && !isLoading && !isError && (
          <p className="mb-3 text-xs text-slate-500">Refreshing stats...</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <StatsSkeletonCard key={index} />)
            : statCards.map((card) => (
                <article key={card.label} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-600">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-[#1D9E75]">
                    <AnimatedNumber value={card.value} />
                  </p>
                </article>
              ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#1D9E75]">Step 1</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Field worker submits need</h3>
            <p className="mt-2 text-sm text-slate-600">paper survey or mobile app</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#1D9E75]">Step 2</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">AI scores and matches</h3>
            <p className="mt-2 text-sm text-slate-600">urgency scoring + volunteer matching algorithm</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#1D9E75]">Step 3</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Volunteer gets notified</h3>
            <p className="mt-2 text-sm text-slate-600">SMS alert with task details</p>
          </article>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900">Need categories</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Nutrition</p>
          </article>
          <article className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Medical</p>
          </article>
          <article className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Shelter</p>
          </article>
          <article className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">Education</p>
          </article>
          <article className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-sm font-semibold text-cyan-800">Water</p>
          </article>
          <article className="rounded-xl border border-violet-100 bg-violet-50 p-4">
            <p className="text-sm font-semibold text-violet-800">Livelihood</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Ready to make an impact?</h2>
        <p className="mt-2 text-slate-600">Join the volunteer network and support local communities faster.</p>
        <Link
          to="/volunteer/register"
          className="mt-5 inline-flex items-center justify-center rounded-md bg-[#1D9E75] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#177f5e]"
        >
          Register as Volunteer
        </Link>
      </section>
    </div>
  );
}
