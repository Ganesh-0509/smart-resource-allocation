import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getIntakeReports, reviewIntakeReport, convertToTask, getDuplicates } from "../services/intake";
import { getEntityHistory } from "../services/audit";
import type { IntakeReport, IntakeStatus, TaskCreate, AuditLog } from "../types";
import { toast, Toaster } from "react-hot-toast";
import AuditTimeline from "../components/AuditTimeline";

export default function TriageDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<IntakeStatus | "">("pending");
  const [selectedReport, setSelectedReport] = useState<IntakeReport | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["intake-reports", statusFilter],
    queryFn: () => getIntakeReports({ status: statusFilter || undefined }),
  });

  const { data: duplicates } = useQuery({
    queryKey: ["report-duplicates", selectedReport?.id],
    queryFn: () => getDuplicates(selectedReport!.id),
    enabled: !!selectedReport,
  });

  const auditHistoryQuery = useQuery<AuditLog[]>({
    queryKey: ["audit-history-report", selectedReport?.id],
    queryFn: () => getEntityHistory("report", selectedReport!.id),
    enabled: !!selectedReport && showHistory,
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { id: string; status: IntakeStatus }) =>
      reviewIntakeReport(data.id, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-reports"] });
      toast.success("Report updated");
      setSelectedReport(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update report");
    },
  });

  const convertMutation = useMutation({
    mutationFn: (report: IntakeReport) => {
      const taskData: TaskCreate = {
        title: report.title,
        description: report.description || "",
        need_type: (report.raw_data?.need_type as any) || "other",
        urgency_score: report.urgency === "high" ? 90 : report.urgency === "medium" ? 50 : 20,
        ward: report.location_text || "Unknown",
        district: report.raw_data?.district || "Unknown",
        lat: report.lat || 0,
        lng: report.lng || 0,
        required_skills: report.raw_data?.required_skills || [],
        household_count: report.raw_data?.household_count || 1,
        source: `intake_${report.source}`,
      };
      return convertToTask(report.id, taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-reports"] });
      toast.success("Successfully converted to task");
      setSelectedReport(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to convert to task");
    },
  });

  return (
    <div className="min-h-screen bg-[#F9F7F2] p-8 font-inter">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Triage Dashboard</h1>
          <p className="text-slate-500 mt-2">Review incoming reports and convert them into actionable community tasks.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  statusFilter === "pending" ? "bg-[#1A3C2E] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  statusFilter === "approved" ? "bg-[#1D9E75] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter("")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  statusFilter === "" ? "bg-slate-800 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Reports
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-white rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reports?.length === 0 && (
                  <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No reports to display</p>
                  </div>
                )}
                {reports?.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                        setSelectedReport(report);
                        setShowHistory(false);
                    }}
                    className={`p-6 bg-white rounded-3xl border-2 transition-all cursor-pointer group ${
                      selectedReport?.id === report.id ? "border-[#1A3C2E] shadow-xl" : "border-transparent hover:border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          report.urgency === 'high' ? 'bg-red-100 text-red-600' : 
                          report.urgency === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {report.urgency} Urgency
                        </span>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                          {report.source}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-[#1A3C2E] mb-2">{report.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2">{report.description}</p>
                    
                    {report.possible_duplicate_of && !ignoreDuplicate[report.id] && (
                        <div className="mt-4 p-3 bg-red-50 rounded-2xl flex items-center justify-between border border-red-100 animate-pulse">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <p className="text-[10px] font-black text-red-700 uppercase tracking-tight">Possible Duplicate Found (Score: {report.duplicate_score}%)</p>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIgnoreDuplicate({...ignoreDuplicate, [report.id]: true});
                                }}
                                className="text-[10px] font-black text-red-700 underline"
                            >
                                IGNORE
                            </button>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {selectedReport ? (
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 animate-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-[#1A3C2E] uppercase tracking-widest">Report Details</h2>
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-lg border transition-all ${showHistory ? 'bg-[#1A3C2E] text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                        title="Audit History"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </button>
                  </div>
                  
                  {showHistory ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail</h3>
                             <button onClick={() => setShowHistory(false)} className="text-[10px] font-black text-[#1D9E75] uppercase">Back to details</button>
                        </div>
                        <AuditTimeline logs={auditHistoryQuery.data || []} loading={auditHistoryQuery.isLoading} />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue</p>
                          <h3 className="text-2xl font-black text-[#1A3C2E] font-['Instrument_Serif'] leading-tight">{selectedReport.title}</h3>
                          <p className="mt-3 text-slate-600 text-sm leading-relaxed">{selectedReport.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Region</p>
                            <p className="text-sm font-bold text-[#1A3C2E]">{selectedReport.location_text}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <p className="text-sm font-bold capitalize text-emerald-600">{selectedReport.status}</p>
                          </div>
                        </div>

                        {duplicates && duplicates.length > 0 && !ignoreDuplicate[selectedReport.id] && (
                            <div className="pt-6 border-t border-slate-50">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Similar Reports Found</p>
                                <div className="space-y-2">
                                    {duplicates.map(dup => (
                                        <div key={dup.id} className="p-3 bg-red-50 rounded-2xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-700">{dup.title}</p>
                                            <p className="text-[9px] text-red-600 mt-1">{new Date(dup.created_at).toLocaleDateString()} • {dup.status}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 flex flex-col gap-3">
                          {selectedReport.status === "pending" && (
                            <>
                              <button
                                onClick={() => reviewMutation.mutate({ id: selectedReport.id, status: "approved" })}
                                className="w-full bg-[#1A3C2E] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#1A3C2E]/20 hover:scale-[1.02] transition-all"
                              >
                                APPROVE REPORT
                              </button>
                              <button
                                onClick={() => reviewMutation.mutate({ id: selectedReport.id, status: "rejected" })}
                                className="w-full bg-white text-red-600 border-2 border-red-100 font-black py-4 rounded-2xl hover:bg-red-50 transition-all"
                              >
                                REJECT REPORT
                              </button>
                            </>
                          )}
                          {selectedReport.status === "approved" && !selectedReport.converted_to_task_id && (
                            <button
                              onClick={() => convertMutation.mutate(selectedReport)}
                              className="w-full bg-[#1D9E75] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#1D9E75]/20 hover:scale-[1.02] transition-all"
                            >
                              CONVERT TO TASK
                            </button>
                          )}
                          {selectedReport.converted_to_task_id && (
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                              <p className="text-xs font-bold text-emerald-700">Converted to Task #{selectedReport.converted_to_task_id.slice(0, 8)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Select a report to review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
