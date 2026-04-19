import type { VolunteerMatch } from "../types";
import MatchScoreBar from "./MatchScoreBar";

type VolunteerCardProps = {
  volunteer: VolunteerMatch;
  onAssign: (volunteer: VolunteerMatch) => void;
  isAssigning: boolean;
};

function getInitials(name: string): string {
  const cleaned = (name || "Volunteer").trim();
  if (!cleaned) {
    return "VO";
  }

  const words = cleaned.split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() || "").join("") || "VO";
}

export default function VolunteerCard({ volunteer, onAssign, isAssigning }: VolunteerCardProps) {
  const availabilityScore = volunteer.availability ? 100 : 0;
  const performanceScore = Math.min(100, Math.max(0, Math.round(volunteer.performance_score || 0)));

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1D9E75]/15 text-sm font-bold text-[#1D9E75]">
            {getInitials(volunteer.name)}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{volunteer.name}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
              <span
                className={`h-2.5 w-2.5 rounded-full ${volunteer.availability ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {volunteer.availability ? "Free" : "Busy"}
              <span className="text-slate-400">|</span>
              <span>{volunteer.distance_km.toFixed(1)} km away</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Match Score</p>
          <p className="text-3xl font-bold leading-none text-[#1D9E75]">{volunteer.match_score}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(volunteer.skills || []).map((skill) => (
          <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        <MatchScoreBar label="Skill" score={volunteer.skill_score} color="#1D9E75" />
        <MatchScoreBar label="Proximity" score={volunteer.distance_score} color="#0EA5E9" />
        <MatchScoreBar label="Availability" score={availabilityScore} color="#F59E0B" />
        <MatchScoreBar label="Performance" score={performanceScore} color="#8B5CF6" />
      </div>

      <button
        type="button"
        disabled={isAssigning}
        onClick={() => onAssign(volunteer)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#17805f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isAssigning && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        )}
        {isAssigning ? "Assigning..." : "Assign"}
      </button>
    </article>
  );
}
