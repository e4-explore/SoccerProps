import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  getFixtures,
  getStandings,
  type Fixture,
} from "./lib/api-football";
import MatchCard from "./_components/MatchCard";
import StandingsTable from "./_components/StandingsTable";
import MockBanner from "./_components/MockBanner";
import { MOCK_TODAYS_FIXTURES, MOCK_EPL_STANDINGS } from "./lib/mock-data";

// ─── Loading skeletons ────────────────────────────────────────────────────────

function MatchesSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((g) => (
        <div key={g} className="space-y-1.5">
          <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse mb-3" />
          {[0, 1, 2, 3].map((r) => (
            <div key={r} className="h-11 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

function StandingsSkeleton() {
  return (
    <div className="rounded-xl bg-zinc-900 overflow-hidden">
      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          className="h-9 border-b border-zinc-800/40 animate-pulse"
          style={{ opacity: Math.max(0.2, 1 - i * 0.05) }}
        />
      ))}
    </div>
  );
}

// ─── No API key state ─────────────────────────────────────────────────────────

function NoApiKey() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 text-center px-6 py-32">
      <div className="size-20 rounded-full bg-zinc-900 ring-1 ring-zinc-800 flex items-center justify-center text-4xl">
        ⚽
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Connect API-Football
        </h1>
        <p className="text-zinc-400 max-w-xs leading-relaxed">
          Add your API key to start seeing live matches, standings, and stats.
        </p>
      </div>
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-xl p-5 text-left font-mono text-sm w-full max-w-sm">
        <p className="text-zinc-600 mb-2 text-xs"># .env.local</p>
        <p className="text-emerald-400">
          API_FOOTBALL_KEY
          <span className="text-zinc-500">=</span>
          <span className="text-zinc-400">your_key_here</span>
        </p>
      </div>
      <p className="text-zinc-600 text-sm">
        Free keys available at{" "}
        <span className="text-zinc-400">api-sports.io</span>
      </p>
    </div>
  );
}

// Top leagues to display (IDs from api-football.com)
const TOP_LEAGUES = new Set([
  39,  // Premier League
  140, // La Liga
  135, // Serie A
  78,  // Bundesliga
  61,  // Ligue 1
  2,   // UEFA Champions League
  3,   // UEFA Europa League
  848, // UEFA Conference League
  253, // MLS
  307, // Saudi Pro League
  71,  // Brasileirão
  88,  // Eredivisie
  94,  // Primeira Liga
]);

// ─── Today's matches (streamed) ───────────────────────────────────────────────

async function TodaysMatches() {
  await connection();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });

  let fixtures: Fixture[] = [];
  let mocked = false;
  try {
    const all = await getFixtures({ date: todayStr, timezone: "America/New_York" });
    fixtures = all.filter((f) => TOP_LEAGUES.has(f.league.id));
  } catch {
    mocked = true;
    fixtures = MOCK_TODAYS_FIXTURES;
  }

  if (fixtures.length === 0) {
    return (
      <>
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-lg font-bold text-white">Today&rsquo;s Matches</h1>
          <span className="text-sm text-zinc-500">{dateDisplay}</span>
        </div>
        <div className="flex items-center justify-center h-40 rounded-xl bg-zinc-900 text-zinc-500 text-sm">
          No top-league matches scheduled for today.
        </div>
      </>
    );
  }

  // Group by league, preserve insertion order (API returns by league)
  const byLeague = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const list = byLeague.get(f.league.id) ?? [];
    list.push(f);
    byLeague.set(f.league.id, list);
  }

  return (
    <>
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-lg font-bold text-white">Today&rsquo;s Matches</h1>
        <span className="text-sm text-zinc-500">{dateDisplay}</span>
      </div>
      {mocked && (
        <div className="mb-5">
          <MockBanner />
        </div>
      )}
      <div className="space-y-7">
      {[...byLeague.values()].map((group) => {
        const { league } = group[0];
        return (
          <div key={league.id}>
            <div className="flex items-center gap-2 mb-3">
              {league.flag && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={league.flag}
                  alt={league.country}
                  className="h-3 w-[18px] object-cover rounded-[2px] shrink-0"
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={league.logo}
                alt={league.name}
                className="size-4 object-contain shrink-0"
              />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {league.name}
              </span>
              <span className="text-zinc-700 text-xs">·</span>
              <span className="text-xs text-zinc-600 truncate">
                {league.round}
              </span>
            </div>
            <div className="space-y-1.5">
              {group.map((f) => (
                <MatchCard key={f.fixture.id} fixture={f} />
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}

// ─── Premier League standings (cached, streamed) ──────────────────────────────

async function PremierLeagueStandings() {
  let table: Awaited<ReturnType<typeof getStandings>>[number] = [];
  try {
    const standings = await getStandings(39, 2024);
    table = standings[0] ?? [];
  } catch {
    // getStandings catches internally and returns [], but handle just in case
  }

  const mocked = table.length === 0;
  if (mocked) table = MOCK_EPL_STANDINGS;

  return (
    <div className="space-y-3">
      {mocked && (
        <p className="text-xs text-amber-400/80">
          Mock standings — API quota reached
        </p>
      )}
      <StandingsTable rows={table} league={39} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const hasApiKey = Boolean(process.env.API_FOOTBALL_KEY);

  if (!hasApiKey) return <NoApiKey />;

  return (
    <div className="flex flex-col flex-1 bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">
              SoccerProps
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <span className="text-white font-medium border-b border-emerald-500 pb-0.5">
              Home
            </span>
            <Link
              href="/players"
              prefetch={false}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Search
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          {/* Fixtures — heading + date rendered inside after data loads */}
          <div>
            <Suspense fallback={<MatchesSkeleton />}>
              <TodaysMatches />
            </Suspense>
          </div>

          {/* Standings sidebar */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-lg font-bold text-white">Premier League</h2>
            </div>
            <Suspense fallback={<StandingsSkeleton />}>
              <PremierLeagueStandings />
            </Suspense>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-500" />
                Champions League
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-orange-500" />
                Europa League
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-red-500" />
                Relegation
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
