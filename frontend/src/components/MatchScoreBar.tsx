type MatchScoreBarProps = {
  label: string;
  score: number;
  color: string;
};

export default function MatchScoreBar({ label, score, color }: MatchScoreBarProps) {
  const safeScore = Math.min(100, Math.max(0, Math.round(score || 0)));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{safeScore}/100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${safeScore}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
