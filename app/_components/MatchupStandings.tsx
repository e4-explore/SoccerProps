import Image from "next/image";
import type { StandingRow, Team } from "../lib/api-football";
import FormPills from "./FormPills";

const ZONE_COLOR: Record<string, string> = {
  "Champions League": "bg-blue-500",
  "Europa League": "bg-orange-500",
  "Europa Conference League": "bg-emerald-500",
  Relegation: "bg-red-500",
};

function zoneColor(description: string | null): string | null {
  if (!description) return null;
  for (const [key, color] of Object.entries(ZONE_COLOR)) {
    if (description.includes(key)) return color;
  }
  return null;
}

function StandingColumn({ row, team }: { row: StandingRow | null; team: Team }) {
  if (!row) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Image
          src={team.logo}
          alt={team.name}
          width={22}
          height={22}
          className="object-contain shrink-0"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {team.name}
          </div>
          <div className="text-[11px] text-zinc-600">
            Not in league table
          </div>
        </div>
      </div>
    );
  }

  const zone = zoneColor(row.description);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 min-w-0">
        {zone && <div className={`w-0.5 h-7 rounded-full ${zone}`} />}
        <span className="text-xs text-zinc-500 tabular-nums w-6 text-center">
          #{row.rank}
        </span>
        <Image
          src={row.team.logo}
          alt={row.team.name}
          width={22}
          height={22}
          className="object-contain shrink-0"
        />
        <span className="text-sm font-semibold text-white truncate">
          {row.team.name}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <Stat label="Pld" value={row.all.played} />
        <Stat label="W-D-L" value={`${row.all.win}-${row.all.draw}-${row.all.lose}`} />
        <Stat
          label="GD"
          value={`${row.goalsDiff > 0 ? "+" : ""}${row.goalsDiff}`}
          tone={
            row.goalsDiff > 0
              ? "text-emerald-400"
              : row.goalsDiff < 0
                ? "text-red-400"
                : "text-zinc-300"
          }
        />
        <Stat label="Pts" value={row.points} tone="text-white" />
      </div>

      {row.form && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            League form
          </span>
          <FormPills form={row.form} size="sm" />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-zinc-300",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded bg-zinc-950/40 ring-1 ring-zinc-800 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className={`text-xs font-bold tabular-nums mt-0.5 ${tone}`}>
        {value}
      </div>
    </div>
  );
}

export default function MatchupStandings({
  home,
  away,
  homeRow,
  awayRow,
}: {
  home: Team;
  away: Team;
  homeRow: StandingRow | null;
  awayRow: StandingRow | null;
}) {
  if (!homeRow && !awayRow) return null;

  return (
    <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-6 space-y-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        Standings
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StandingColumn row={homeRow} team={home} />
        <StandingColumn row={awayRow} team={away} />
      </div>
    </div>
  );
}
