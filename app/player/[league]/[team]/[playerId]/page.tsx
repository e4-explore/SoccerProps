import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getLeagueTeams } from "../../../../lib/api-football";
import {
  getTeamPlayerLogs,
  computeHitRates,
  computeTrendSeries,
  summarizePlayer,
  type PlayerLogs,
} from "../../../../lib/player-trends";
import { LEAGUES_BY_ID, currentSeason } from "../../../../lib/leagues";
import {
  mockLeagueTeams,
  mockTeamPlayerLogs,
} from "../../../../lib/mock-data";
import MockBanner from "../../../../_components/MockBanner";
import PlayerKPI from "../../../../_components/PlayerKPI";
import PlayerSplitsTable from "../../../../_components/PlayerSplitsTable";
import PlayerStreaks from "../../../../_components/PlayerStreaks";
import PlayerTrendBars from "../../../../_components/PlayerTrendBars";
import PlayerGameLogTable, {
  type GameLogFilter,
} from "../../../../_components/PlayerGameLogTable";

interface RouteParams {
  league: string;
  team: string;
  playerId: string;
}

interface SearchParams {
  filter?: string;
  n?: string;
}

export const metadata = {
  title: "Player — SoccerProps",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

interface CallResult<T> {
  data: T;
  error: string | null;
  mocked: boolean;
}

async function callWithMock<T>(
  fn: () => Promise<T>,
  mockFn: () => T
): Promise<CallResult<T>> {
  try {
    return { data: await fn(), error: null, mocked: false };
  } catch {
    return { data: mockFn(), error: null, mocked: true };
  }
}

async function PlayerPageContent({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const [p, sp] = await Promise.all([params, searchParams]);
  const league = Number(p.league);
  const teamId = Number(p.team);
  const playerId = Number(p.playerId);
  const last = Math.min(20, Math.max(3, Number(sp.n) || 10));
  const filter: GameLogFilter =
    sp.filter === "home" || sp.filter === "away" || sp.filter === "starts"
      ? sp.filter
      : "all";

  if (!Number.isFinite(league) || !Number.isFinite(teamId) || !Number.isFinite(playerId)) {
    return (
      <p className="text-zinc-500 text-sm">Invalid URL parameters.</p>
    );
  }

  const leagueMeta = LEAGUES_BY_ID.get(league);
  const season = currentSeason(league);

  const teamsRes = await callWithMock(
    () => getLeagueTeams(league, season),
    () => mockLeagueTeams(league)
  );
  const logsRes = await callWithMock(
    () => getTeamPlayerLogs(teamId, season, last),
    () => mockTeamPlayerLogs(teamId, last)
  );

  const mocked = logsRes.mocked || teamsRes.mocked;
  const teamMeta = teamsRes.data.find((t) => t.team.id === teamId);
  const playerLogs: PlayerLogs | undefined = logsRes.data.logs.get(playerId);

  if (!playerLogs) {
    return (
      <div className="space-y-4">
        {mocked && <MockBanner />}
        <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 p-6 text-center text-zinc-500 text-sm">
          No stats found for this player in {teamMeta?.team.name ?? "this team"}&rsquo;s last{" "}
          {logsRes.data.fixtures.length} matches.
          <div className="mt-3">
            <Link
              href={`/players?league=${league}&team=${teamId}`}
              prefetch={false}
              className="text-emerald-400 hover:text-emerald-300 text-xs"
            >
              ← Back to roster
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const summary = summarizePlayer(playerLogs.games);
  const hitRates = computeHitRates(playerLogs.games);
  const trendSeries = computeTrendSeries(playerLogs.games);
  const teamHref = `/players?league=${league}&team=${teamId}`;
  const basePath = `/player/${league}/${teamId}/${playerId}`;

  return (
    <div className="space-y-8">
      {mocked && <MockBanner />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/players" prefetch={false} className="hover:text-zinc-300">
          {leagueMeta?.shortName ?? "League"}
        </Link>
        <span className="text-zinc-700">/</span>
        <Link href={teamHref} prefetch={false} className="hover:text-zinc-300">
          {teamMeta?.team.name ?? `Team ${teamId}`}
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">{playerLogs.player.name}</span>
      </div>

      {/* Player header */}
      <div className="flex items-start gap-5 flex-wrap">
        <div className="size-20 rounded-full bg-zinc-900 ring-1 ring-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
          {playerLogs.player.photo ? (
            <Image
              src={playerLogs.player.photo}
              alt={playerLogs.player.name}
              width={80}
              height={80}
              className="object-cover"
            />
          ) : (
            <span className="text-3xl">⚽</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white tracking-tight truncate">
            {playerLogs.player.name}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-zinc-400">
            {teamMeta && (
              <Link
                href={teamHref}
                prefetch={false}
                className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors"
              >
                <Image
                  src={teamMeta.team.logo}
                  alt={teamMeta.team.name}
                  width={16}
                  height={16}
                  className="object-contain"
                />
                <span>{teamMeta.team.name}</span>
              </Link>
            )}
            {summary.position && (
              <>
                <span className="text-zinc-700">·</span>
                <span>
                  {summary.position === "G"
                    ? "Goalkeeper"
                    : summary.position === "D"
                      ? "Defender"
                      : summary.position === "M"
                        ? "Midfielder"
                        : summary.position === "F"
                          ? "Forward"
                          : summary.position}
                </span>
              </>
            )}
            <span className="text-zinc-700">·</span>
            <span>Last {playerLogs.games.length} matches</span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <PlayerKPI summary={summary} />

      {/* Recent form / streaks */}
      <div>
        <SectionHeading>Hot &amp; cold streaks</SectionHeading>
        <PlayerStreaks rows={hitRates} />
      </div>

      {/* Hit rates with splits */}
      <div>
        <SectionHeading>Prop hit rates · splits &amp; per-90</SectionHeading>
        <PlayerSplitsTable rows={hitRates} />
      </div>

      {/* Trend bars */}
      <div>
        <SectionHeading>Trends · {playerLogs.games.length}-game series</SectionHeading>
        <PlayerTrendBars series={trendSeries} />
      </div>

      {/* Game log */}
      <div>
        <SectionHeading>Game log</SectionHeading>
        <PlayerGameLogTable
          games={playerLogs.games}
          filter={filter}
          basePath={basePath}
        />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <div className="size-20 rounded-full bg-zinc-900 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-8 w-64 bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-40 bg-zinc-900 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-zinc-900 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-zinc-900 animate-pulse" />
      <div className="h-72 rounded-xl bg-zinc-900 animate-pulse" />
    </div>
  );
}

export default function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
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
              className="text-zinc-400 hover:text-zinc-200"
            >
              Matches
            </Link>
            <Link
              href="/players"
              prefetch={false}
              className="text-white font-medium border-b border-emerald-500 pb-0.5"
            >
              Players
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Suspense fallback={<PageSkeleton />}>
          <PlayerPageContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
