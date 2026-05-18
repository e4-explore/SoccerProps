import Image from "next/image";
import Link from "next/link";
import type { Fixture, Team } from "../lib/api-football";
import FormPills from "./FormPills";

const FINISHED = new Set(["FT", "AET", "PEN"]);

function lastNFinished(fixtures: Fixture[], teamId: number, n: number) {
  return fixtures
    .filter(
      (f) =>
        FINISHED.has(f.fixture.status.short) &&
        (f.teams.home.id === teamId || f.teams.away.id === teamId) &&
        f.goals.home != null &&
        f.goals.away != null
    )
    .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
    .slice(0, n);
}

function summarize(fixtures: Fixture[], teamId: number) {
  let gf = 0;
  let ga = 0;
  let btts = 0;
  let cs = 0;
  for (const f of fixtures) {
    const isHome = f.teams.home.id === teamId;
    const myGoals = (isHome ? f.goals.home : f.goals.away) ?? 0;
    const oppGoals = (isHome ? f.goals.away : f.goals.home) ?? 0;
    gf += myGoals;
    ga += oppGoals;
    if (myGoals > 0 && oppGoals > 0) btts++;
    if (oppGoals === 0) cs++;
  }
  return { gf, ga, btts, cs };
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function TeamFormPanel({
  team,
  fixtures,
  align = "left",
}: {
  team: Team;
  fixtures: Fixture[];
  align?: "left" | "right";
}) {
  const recent = lastNFinished(fixtures, team.id, 5);
  // Show form chronologically (oldest → newest) so the rightmost pill is the
  // most recent — matches how league tables present "WWDLW".
  const ordered = [...recent].reverse();

  if (recent.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Image
            src={team.logo}
            alt={team.name}
            width={20}
            height={20}
            className="object-contain"
          />
          <h3 className="text-sm font-semibold text-white truncate">
            {team.name}
          </h3>
        </div>
        <p className="text-xs text-zinc-500">No recent matches on record.</p>
      </div>
    );
  }

  const s = summarize(recent, team.id);

  return (
    <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-5 space-y-4">
      <div
        className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
      >
        <Image
          src={team.logo}
          alt={team.name}
          width={22}
          height={22}
          className="object-contain"
        />
        <h3 className="text-sm font-semibold text-white truncate">
          {team.name}
        </h3>
      </div>

      <div
        className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          Last 5
        </span>
        <FormPills fixtures={ordered} teamId={team.id} size="md" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            GF/GA
          </div>
          <div className="text-xs font-bold text-white tabular-nums mt-0.5">
            {s.gf}/{s.ga}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            BTTS
          </div>
          <div className="text-xs font-bold text-white tabular-nums mt-0.5">
            {s.btts}/{recent.length}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Clean
          </div>
          <div className="text-xs font-bold text-white tabular-nums mt-0.5">
            {s.cs}/{recent.length}
          </div>
        </div>
      </div>

      <ul className="space-y-1">
        {recent.map((f) => {
          const isHome = f.teams.home.id === team.id;
          const opp = isHome ? f.teams.away : f.teams.home;
          const myGoals = isHome ? f.goals.home : f.goals.away;
          const oppGoals = isHome ? f.goals.away : f.goals.home;
          const result: "W" | "D" | "L" =
            myGoals! > oppGoals! ? "W" : myGoals! < oppGoals! ? "L" : "D";
          const tone =
            result === "W"
              ? "text-emerald-400"
              : result === "L"
                ? "text-red-400"
                : "text-zinc-400";
          return (
            <li key={f.fixture.id}>
              <Link
                href={`/fixture/${f.fixture.id}`}
                prefetch={false}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/60 transition-colors"
              >
                <span className="text-[10px] text-zinc-600 tabular-nums w-12 shrink-0">
                  {shortDate(f.fixture.date)}
                </span>
                <span className="text-[10px] uppercase text-zinc-600 w-3 shrink-0">
                  {isHome ? "H" : "A"}
                </span>
                <Image
                  src={opp.logo}
                  alt={opp.name}
                  width={14}
                  height={14}
                  className="object-contain shrink-0"
                />
                <span className="text-xs text-zinc-300 flex-1 min-w-0 truncate">
                  {opp.name}
                </span>
                <span className={`text-xs font-semibold tabular-nums ${tone}`}>
                  {result} {myGoals}–{oppGoals}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
