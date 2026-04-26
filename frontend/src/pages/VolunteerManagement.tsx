import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  getVolunteers, 
  approveVolunteer, 
  rejectVolunteer, 
  activateVolunteer, 
  deactivateVolunteer 
} from "../services/volunteers";
import type { Volunteer, VolunteerStatus } from "../types";
import { toast, Toaster } from "react-hot-toast";

export default function VolunteerManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<VolunteerStatus | "all">("pending");

  const { data: volunteers, isLoading } = useQuery({
    queryKey: ["volunteers", activeTab],
    queryFn: () => getVolunteers({ status: activeTab === "all" ? undefined : activeTab }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" | "activate" | "deactivate" }) => {
      switch (action) {
        case "approve": return approveVolunteer(id);
        case "reject": return rejectVolunteer(id);
        case "activate": return activateVolunteer(id);
        case "deactivate": return deactivateVolunteer(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      toast.success("Volunteer status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    }
  });

  const renderVolunteerCard = (volunteer: Volunteer) => (
    <div key={volunteer.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">{volunteer.name}</h3>
          <p className="text-sm text-slate-500">{volunteer.phone || "No phone provided"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          volunteer.status === 'active' ? 'bg-[#EAF4EE] text-[#1D9E75]' :
          volunteer.status === 'pending' ? 'bg-amber-50 text-amber-600' :
          volunteer.status === 'approved' ? 'bg-blue-50 text-blue-600' :
          'bg-red-50 text-red-600'
        }`}>
          {volunteer.status}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {volunteer.skills.map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold">
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Location</p>
          <p className="text-xs font-bold text-slate-600">{volunteer.ward}, {volunteer.district}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-50">
        {volunteer.status === 'pending' && (
          <>
            <button
              onClick={() => statusMutation.mutate({ id: volunteer.id, action: "approve" })}
              className="flex-1 py-2 bg-[#EAF4EE] text-[#1D9E75] rounded-xl text-xs font-bold hover:bg-[#D5EAE0] transition-all"
            >
              Approve
            </button>
            <button
              onClick={() => statusMutation.mutate({ id: volunteer.id, action: "reject" })}
              className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
            >
              Reject
            </button>
          </>
        )}
        {volunteer.status === 'approved' && (
          <button
            onClick={() => statusMutation.mutate({ id: volunteer.id, action: "activate" })}
            className="w-full py-2 bg-[#1A3C2E] text-white rounded-xl text-xs font-bold hover:bg-[#2D5E47] transition-all"
          >
            Activate to Active Pool
          </button>
        )}
        {volunteer.status === 'active' && (
          <button
            onClick={() => statusMutation.mutate({ id: volunteer.id, action: "deactivate" })}
            className="w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
          >
            Deactivate
          </button>
        )}
        {volunteer.status === 'inactive' && (
          <button
            onClick={() => statusMutation.mutate({ id: volunteer.id, action: "activate" })}
            className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
          >
            Re-activate
          </button>
        )}
        {volunteer.status === 'rejected' && (
           <button
           onClick={() => statusMutation.mutate({ id: volunteer.id, action: "approve" })}
           className="w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
         >
           Re-review
         </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F7F2] p-8 font-inter">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Volunteer Directory</h1>
            <p className="text-slate-500 mt-2">Manage onboarding and approval of community volunteers.</p>
          </div>
          <div className="bg-white p-1 rounded-2xl border border-slate-100 flex gap-1">
            {(["pending", "active", "inactive", "rejected", "all"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? "bg-[#1A3C2E] text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white h-64 rounded-3xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : !volunteers || volunteers.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             </div>
             <p className="text-xl font-bold text-slate-400">No volunteers found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volunteers.map(renderVolunteerCard)}
          </div>
        )}
      </div>
    </div>
  );
}
