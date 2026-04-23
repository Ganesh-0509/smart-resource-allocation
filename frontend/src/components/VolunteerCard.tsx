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
    <article className="rounded-xl bg-white p-4 shadow-sm border border-[#114B3B]/5 hover:bg-slate-50 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4EE] text-base font-black text-[#1A3C2E] shadow-sm">
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Rank</p>
          <p className="text-4xl font-black leading-none text-[#1A3C2E] font-['Instrument_Serif'] mt-1">{volunteer.match_score}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(volunteer.skills || []).map((skill) => (
          <span key={skill} className="rounded-lg bg-[#EAF4EE] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1A3C2E]">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <MatchScoreBar label="Skill Match" score={volunteer.skill_score} color="#1A3C2E" />
        <MatchScoreBar label="Proximity" score={volunteer.distance_score} color="#E8712A" />
        <MatchScoreBar label="Active" score={availabilityScore} color="#F5A26F" />
        <MatchScoreBar label="Performance" score={performanceScore} color="#4A8C6A" />
      </div>

      <button
        type="button"
        disabled={isAssigning}
        onClick={() => onAssign(volunteer)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A3C2E] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] hover:-translate-y-1 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isAssigning && (
          <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        )}
        {isAssigning ? "Deploying..." : "Deploy Volunteer →"}
      </button>
    </article>
  );
}
