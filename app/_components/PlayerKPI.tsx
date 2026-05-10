import type { PlayerSummary } from "../lib/player-trends";

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 px-4 py-3.5">
      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function PlayerKPI({ summary }: { summary: PlayerSummary }) {
  const startPct = summary.apps > 0 ? Math.round((summary.starts / summary.apps) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <Card
        label="Apps"
        value={String(summary.apps)}
        hint={
          summary.apps > 0
            ? `${summary.starts} starts (${startPct}%)`
            : undefined
        }
      />
      <Card
        label="Avg minutes"
        value={summary.avgMinutes !== null ? Math.round(summary.avgMinutes).toString() : "–"}
        hint={`${summary.totalMinutes} total`}
      />
      <Card
        label="G + A"
        value={`${summary.goals} + ${summary.assists}`}
        hint={
          summary.apps > 0
            ? `${((summary.goals + summary.assists) / summary.apps).toFixed(2)}/g`
            : undefined
        }
      />
      <Card
        label="Avg rating"
        value={summary.avgRating !== null ? summary.avgRating.toFixed(2) : "–"}
        hint={
          summary.yellowCards + summary.redCards > 0
            ? `${summary.yellowCards}Y${summary.redCards > 0 ? ` ${summary.redCards}R` : ""}`
            : "No cards"
        }
      />
    </div>
  );
}
