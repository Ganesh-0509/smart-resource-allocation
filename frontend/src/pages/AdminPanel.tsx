import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";

import { deleteVolunteer, getVolunteers, updateAvailability } from "../api/volunteers";
import type { Volunteer } from "../types";

function VolunteerTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[760px] p-4">
        <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-8 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-8 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-8 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const queryClient = useQueryClient();

  const volunteersQuery = useQuery<Volunteer[]>({
    queryKey: ["admin-volunteers"],
    queryFn: getVolunteers,
    refetchInterval: 60_000,
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, availability }: { id: string; availability: boolean }) => updateAvailability(id, availability),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers"] });
      toast.success("Availability updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update availability.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVolunteer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers"] });
      toast.success("Volunteer removed from active roster.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove volunteer.");
    },
  });

  const volunteers = useMemo(() => volunteersQuery.data ?? [], [volunteersQuery.data]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" toastOptions={{ duration: 2400 }} />

      <section className="rounded-[2rem] bg-white p-8 shadow-[0_40px_100px_rgba(26,60,46,0.06)] border border-[#114B3B]/5">
        <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Governance Control</h1>
        <p className="mt-2 text-slate-500 font-medium">Monitor Bharat’s response network, volunteer deployment, and operational performance.</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-xl bg-slate-50/50 p-6 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Volunteers</p>
            <p className="mt-2 text-3xl font-black text-[#1A3C2E] font-['Instrument_Serif']">{volunteers.length}</p>
          </article>
          <article className="rounded-xl bg-slate-50/50 p-6 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Now</p>
            <p className="mt-2 text-3xl font-black text-[#E8712A] font-['Instrument_Serif']">{volunteers.filter((item) => item.availability).length}</p>
          </article>
          <article className="rounded-xl bg-slate-50/50 p-6 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">High Performers</p>
            <p className="mt-2 text-3xl font-black text-[#1A3C2E] font-['Instrument_Serif']">{volunteers.filter((item) => item.performance_score >= 80).length}</p>
          </article>
        </div>
      </section>

      {volunteersQuery.isLoading && <VolunteerTableSkeleton />}

      {volunteersQuery.isError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          <h2 className="text-lg font-semibold text-red-800">Could not load volunteers</h2>
          <p className="mt-2 text-sm">
            {volunteersQuery.error instanceof Error ? volunteersQuery.error.message : "Unable to fetch volunteers."}
          </p>
          <button
            type="button"
            onClick={() => void volunteersQuery.refetch()}
            className="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </section>
      )}

      {!volunteersQuery.isLoading && !volunteersQuery.isError && (
        <section className="overflow-x-auto rounded-[2rem] bg-white shadow-[0_20px_50px_rgba(26,60,46,0.04)] border border-[#114B3B]/5">
          <table className="min-w-[760px] w-full text-left">
            <thead className="bg-[#EAF4EE]">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60">Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60">Phone</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60">Skills</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60">Performance</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60">Availability</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1A3C2E]/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    No volunteers found.
                  </td>
                </tr>
              )}

              {volunteers.map((volunteer) => {
                const isAvailabilityPending =
                  availabilityMutation.isPending && availabilityMutation.variables?.id === volunteer.id;
                const isDeletePending = deleteMutation.isPending && deleteMutation.variables === volunteer.id;

                return (
                  <tr key={volunteer.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{volunteer.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{volunteer.phone || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex max-w-sm flex-wrap gap-1.5">
                        {(volunteer.skills || []).map((skill) => (
                          <span
                            key={`${volunteer.id}-${skill}`}
                            className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-500 border border-slate-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-[#1A3C2E] font-['Instrument_Serif']">{Math.round(volunteer.performance_score || 0)}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(volunteer.availability)}
                          onChange={(event) =>
                            availabilityMutation.mutate({
                              id: volunteer.id,
                              availability: event.target.checked,
                            })
                          }
                          disabled={isAvailabilityPending || isDeletePending}
                          className="h-5 w-5 accent-[#E8712A]"
                        />
                        {volunteer.availability ? "Available" : "Unavailable"}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const proceed = window.confirm(
                            `Remove ${volunteer.name} from active roster? This sets availability to false.`,
                          );
                          if (proceed) {
                            deleteMutation.mutate(volunteer.id);
                          }
                        }}
                        disabled={isAvailabilityPending || isDeletePending}
                        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeletePending ? "Removing..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
