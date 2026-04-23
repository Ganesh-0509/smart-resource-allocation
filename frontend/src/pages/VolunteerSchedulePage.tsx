import VolunteerScheduling from "../components/VolunteerScheduling";
import { useQuery } from "@tanstack/react-query";
import { getVolunteer } from "../api/volunteers";

export default function VolunteerSchedulePage() {
  const volunteerId =
    localStorage.getItem("namma_volunteer_id") ||
    localStorage.getItem("volunteer_id") ||
    localStorage.getItem("volunteerId");

  const { data: volunteer, isLoading } = useQuery({
    queryKey: ["volunteer-profile", volunteerId],
    queryFn: () => getVolunteer(volunteerId as string),
    enabled: Boolean(volunteerId),
  });

  if (!volunteerId) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">No Volunteer Account Found</h2>
        <p className="mt-2 text-slate-500">Please register or sign in to manage your schedule.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Your Availability</h1>
        <p className="text-slate-500">Set your recurring time slots to help coordinators find you for relevant missions.</p>
      </header>
      <VolunteerScheduling volunteerId={volunteerId} volunteerName={volunteer?.name} />
    </div>
  );
}
