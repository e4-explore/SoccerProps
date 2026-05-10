import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getFixtureById,
  getFixturePlayerStats,
  isRateLimitError,
  type Fixture,
} from "../../lib/api-football";
import FixtureRoster from "../../_components/FixtureRoster";
import MockBanner from "../../_components/MockBanner";
import { mockFixtureById, mockFixturePlayerStats } from "../../lib/mock-data";

const LIVE = new Set(["1H", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);

export const metadata = {
  title: "Fixture — SoccerProps",
};

function StatusLine({ fixture }: { fixture: Fixture }) {
  const { status, date } = fixture.fixture;
  if (LIVE.has(status.short)) {
    return (
      <span className="text-emerald-400 text-xs font-medium">
        {status.elapsed != null ? `${status.elapsed}'` : status.long}
      </span>
    );
  }
  if (status.short === "HT") {
    return <span className="text-yellow-400 text-xs font-medium">Half time</span>;
  }
  if (FINISHED.has(status.short)) {
    return <span className="text-zinc-500 text-xs">{status.long}</span>;
  }
  const time = new Date(date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return <span className="text-zinc-500 text-xs">{time} ET</span>;
}

function MatchHeader({ fixture }: { fixture: Fixture }) {
  const { teams, goals, fixture: meta, league } = fixture;
  const showScore = LIVE.has(meta.status.short) || FINISHED.has(meta.status.short) || meta.status.short === "HT";

  return (
    <div className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 p-6 space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2 min-w-0">
          {league.logo && (
            <Image
              src={league.logo}
              alt={league.name}
              width={16}
              height={16}
              className="object-contain shrink-0"
            />
          )}
          <span className="font-medium text-zinc-400 uppercase tracking-wide truncate">
            {league.name}
          </span>
          {league.round && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-600 truncate">{league.round}</span>
            </>
          )}
        </div>
        <StatusLine fixture={fixture} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Home */}
        <Link
          href={`/players?league=${league.id}&team=${teams.home.id}`}
          prefetch={false}
          className="flex items-center gap-3 justify-end min-w-0 group"
        >
          <span
            className={`text-base sm:text-lg truncate text-right ${teams.home.winner === true ? "font-bold text-white" : "text-zinc-200"} group-hover:text-emerald-300 transition-colors`}
          >
            {teams.home.name}
          </span>
          <Image
            src={teams.home.logo}
            alt={teams.home.name}
            width={48}
            height={48}
            className="object-contain shrink-0"
          />
        </Link>

        {/* Score / time */}
        <div className="flex flex-col items-center min-w-[80px]">
          {showScore ? (
            <span className="text-3xl font-bold text-white tabular-nums tracking-wide">
              {goals.home ?? 0} <span className="text-zinc-700">–</span>{" "}
              {goals.away ?? 0}
            </span>
          ) : (
            <span className="text-zinc-500 text-sm">vs</span>
          )}
        </div>

        {/* Away */}
        <Link
          href={`/players?league=${league.id}&team=${teams.away.id}`}
          prefetch={false}
          className="flex items-center gap-3 min-w-0 group"
        >
          <Image
            src={teams.away.logo}
            alt={teams.away.name}
            width={48}
            height={48}
            className="object-contain shrink-0"
          />
          <span
            className={`text-base sm:text-lg truncate ${teams.away.winner === true ? "font-bold text-white" : "text-zinc-200"} group-hover:text-emerald-300 transition-colors`}
          >
            {teams.away.name}
          </span>
        </Link>
      </div>

      {meta.referee && (
        <p className="text-center text-xs text-zinc-600">Referee · {meta.referee}</p>
      )}
    </div>
  );
}

async function FixtureContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);

  if (!Number.isFinite(id) || id <= 0) {
    return <p className="text-zinc-500 text-sm">Invalid fixture id.</p>;
  }

  let fixture: Fixture | null = null;
  let fixtureError: string | null = null;
  let mocked = false;
  try {
    fixture = await getFixtureById(id);
  } catch (e) {
    if (isRateLimitError(e)) {
      mocked = true;
      fixtureError = e instanceof Error ? e.message : String(e);
      fixture = mockFixtureById(id);
    } else {
      fixtureError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!fixture) {
    return (
      <div className="rounded-xl bg-red-500/5 ring-1 ring-red-500/20 p-4 text-sm text-red-300">
        <p className="font-medium mb-1">Fixture unavailable</p>
        <p className="text-xs text-red-300/70 font-mono break-words">
          {fixtureError ?? `No fixture found for id ${id}`}
        </p>
      </div>
    );
  }

  const finished = FINISHED.has(fixture.fixture.status.short);
  const live = LIVE.has(fixture.fixture.status.short) || fixture.fixture.status.short === "HT";
  const leagueId = fixture.league.id;

  let groups: Awaited<ReturnType<typeof getFixturePlayerStats>> = [];
  let rosterError: string | null = null;
  if (finished || live) {
    if (mocked) {
      // We already fell back to mocks for the fixture metadata; use mock player
      // stats too so the rosters render as expected.
      groups = mockFixturePlayerStats(id);
    } else {
      try {
        groups = await getFixturePlayerStats(id);
      } catch (e) {
        if (isRateLimitError(e)) {
          mocked = true;
          rosterError = e instanceof Error ? e.message : String(e);
          groups = mockFixturePlayerStats(id);
        } else {
          rosterError = e instanceof Error ? e.message : String(e);
        }
      }
    }
  }

  const home = groups.find((g) => g.team.id === fixture.teams.home.id);
  const away = groups.find((g) => g.team.id === fixture.teams.away.id);

  return (
    <div className="space-y-6">
      {mocked && <MockBanner message={fixtureError ?? rosterError ?? undefined} />}
      <MatchHeader fixture={fixture} />

      {!finished && !live && (
        <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white">Match hasn&rsquo;t started</h2>
          <p className="text-sm text-zinc-400">
            Per-player stats appear once the match kicks off. In the meantime,
            dig into each side&rsquo;s recent form and rosters:
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/players?league=${leagueId}&team=${fixture.teams.home.id}`}
              prefetch={false}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-colors"
            >
              {fixture.teams.home.name} →
            </Link>
            <Link
              href={`/players?league=${leagueId}&team=${fixture.teams.away.id}`}
              prefetch={false}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-colors"
            >
              {fixture.teams.away.name} →
            </Link>
          </div>
        </div>
      )}

      {(finished || live) && rosterError && !mocked && (
        <div className="rounded-xl bg-red-500/5 ring-1 ring-red-500/20 p-4 text-sm text-red-300">
          <p className="font-medium mb-1">Could not load player stats</p>
          <p className="text-xs text-red-300/70 font-mono break-words">{rosterError}</p>
        </div>
      )}

      {(finished || live) && (!rosterError || mocked) && groups.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {home && (
            <FixtureRoster group={home} league={leagueId} />
          )}
          {away && (
            <FixtureRoster group={away} league={leagueId} align="right" />
          )}
        </div>
      )}

      {(finished || live) && !rosterError && groups.length === 0 && (
        <div className="rounded-xl bg-zinc-900 p-6 text-center text-zinc-500 text-sm">
          Player stats not yet available for this match.
        </div>
      )}
    </div>
  );
}

function FixtureSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-zinc-900 h-44 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl bg-zinc-900 h-96 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function FixturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col flex-1 bg-zinc-950 min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg">⚽</span>
              <span className="font-bold text-white tracking-tight">
                SoccerProps
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              prefetch={false}
              className="text-white font-medium border-b border-emerald-500 pb-0.5"
            >
              Matches
            </Link>
            <Link
              href="/players"
              prefetch={false}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Players
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Suspense fallback={<FixtureSkeleton />}>
          <FixtureContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
