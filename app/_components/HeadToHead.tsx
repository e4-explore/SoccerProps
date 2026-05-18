import Image from "next/image";
import Link from "next/link";
import type { Fixture, Team } from "../lib/api-football";

function summarize(fixtures: Fixture[], homeTeamId: number) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let btts = 0;
  let over25 = 0;
  let counted = 0;

  for (const f of fixtures) {
    const gh = f.goals.home;
    const ga = f.goals.away;
    if (gh == null || ga == null) continue;
    const isHome = f.teams.home.id === homeTeamId;
    const myGoals = isHome ? gh : ga;
    const oppGoals = isHome ? ga : gh;
    goalsFor += myGoals;
    goalsAgainst += oppGoals;
    if (myGoals > oppGoals) wins++;
    else if (myGoals < oppGoals) losses++;
    else draws++;
    if (gh > 0 && ga > 0) btts++;
    if (gh + ga > 2) over25++;
    counted++;
  }

  return { wins, draws, losses, goalsFor, goalsAgainst, btts, over25, counted };
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export default function HeadToHead({
  fixtures,
  home,
  away,
}: {
  fixtures: Fixture[];
  home: Team;
  away: Team;
}) {
  const finished = fixtures.filter(
    (f) => f.goals.home != null && f.goals.away != null
  );

  if (finished.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-6">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Head-to-head
        </h3>
        <p className="text-sm text-zinc-500">
          No prior meetings on record between {home.name} and {away.name}.
        </p>
      </div>
    );
  }

  const s = summarize(finished, home.id);
  const bttsPct = Math.round((s.btts / s.counted) * 100);
  const over25Pct = Math.round((s.over25 / s.counted) * 100);
  const totalGoals = s.goalsFor + s.goalsAgainst;

  return (
    <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-6 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Head-to-head · last {s.counted}
        </h3>
        <span className="text-xs text-zinc-600">
          From {home.name}&rsquo;s perspective
        </span>
      </div>

      {/* Aggregate stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Record
          </div>
          <div className="mt-1 flex items-baseline gap-1 text-sm font-bold tabular-nums">
            <span className="text-emerald-400">{s.wins}W</span>
            <span className="text-zinc-500">{s.draws}D</span>
            <span className="text-red-400">{s.losses}L</span>
          </div>
        </div>
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Goals
          </div>
          <div className="mt-1 text-sm font-bold text-white tabular-nums">
            {s.goalsFor}–{s.goalsAgainst}
            <span className="text-zinc-600 font-normal ml-1.5 text-xs">
              ({(totalGoals / s.counted).toFixed(1)}/match)
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            BTTS
          </div>
          <div className="mt-1 text-sm font-bold text-white tabular-nums">
            {bttsPct}%
            <span className="text-zinc-600 font-normal ml-1.5 text-xs">
              ({s.btts}/{s.counted})
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Over 2.5
          </div>
          <div className="mt-1 text-sm font-bold text-white tabular-nums">
            {over25Pct}%
            <span className="text-zinc-600 font-normal ml-1.5 text-xs">
              ({s.over25}/{s.counted})
            </span>
          </div>
        </div>
      </div>

      {/* Past meetings list */}
      <div className="space-y-1.5 pt-1">
        {finished.map((f) => {
          const homeWon = f.teams.home.winner === true;
          const awayWon = f.teams.away.winner === true;
          const isCurrentHomeTeamHome = f.teams.home.id === home.id;
          return (
            <Link
              key={f.fixture.id}
              href={`/fixture/${f.fixture.id}`}
              prefetch={false}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-950/40 ring-1 ring-zinc-800 hover:bg-zinc-800/60 transition-colors"
            >
              <span className="text-xs text-zinc-500 tabular-nums w-16 shrink-0">
                {shortDate(f.fixture.date)}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wide w-12 shrink-0 ${isCurrentHomeTeamHome ? "text-zinc-500" : "text-zinc-600"}`}
                title={isCurrentHomeTeamHome ? `${home.name} at home` : `${home.name} away`}
              >
                {isCurrentHomeTeamHome ? "Home" : "Away"}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span
                  className={`text-xs truncate ${homeWon ? "text-white font-semibold" : "text-zinc-400"}`}
                >
                  {f.teams.home.name}
                </span>
                <Image
                  src={f.teams.home.logo}
                  alt={f.teams.home.name}
                  width={18}
                  height={18}
                  className="object-contain shrink-0"
                />
              </div>
              <span className="text-xs font-bold text-white tabular-nums w-12 text-center shrink-0">
                {f.goals.home}–{f.goals.away}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Image
                  src={f.teams.away.logo}
                  alt={f.teams.away.name}
                  width={18}
                  height={18}
                  className="object-contain shrink-0"
                />
                <span
                  className={`text-xs truncate ${awayWon ? "text-white font-semibold" : "text-zinc-400"}`}
                >
                  {f.teams.away.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
