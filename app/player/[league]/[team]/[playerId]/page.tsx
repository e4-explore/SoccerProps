import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getLeagueTeams } from "../../../../lib/api-football";
import {
  getTeamPlayerLogs,
  computeHitRates,
  computeTrendSeries,
  computeHeadlineStats,
  getOpponentsPlayed,
  sliceGames,
  summarizePlayer,
  WINDOW_LABEL,
  VENUE_LABEL,
  type PlayerLogs,
  type Window,
  type Venue,
} from "../../../../lib/player-trends";
import { LEAGUES, LEAGUES_BY_ID, currentSeason } from "../../../../lib/leagues";
import { BreadcrumbDropdown } from "../../../../_components/BreadcrumbDropdown";
import {
  mockLeagueTeams,
  mockTeamPlayerLogs,
} from "../../../../lib/mock-data";
import MockBanner from "../../../../_components/MockBanner";
import WindowToggle from "../../../../_components/WindowToggle";
import PlayerSummaryPanel from "../../../../_components/PlayerSummaryPanel";
import PlayerSplitsTable from "../../../../_components/PlayerSplitsTable";
import PlayerStreaks from "../../../../_components/PlayerStreaks";
import PlayerTrendBars from "../../../../_components/PlayerTrendBars";
import PlayerGameLogTable from "../../../../_components/PlayerGameLogTable";

interface RouteParams {
  league: string;
  team: string;
  playerId: string;
}

interface SearchParams {
  window?: string;
  venue?: string;
  opponent?: string;
}

export const metadata = {
  title: "Player — SoccerProps",
};

// Fetch up to a full league season; first cold load is slow on the rate-limited
// free tier (~3-4 min) but every window toggle after is in-memory free.
const SEASON_FETCH = 38;

function parseWindow(v: string | undefined): Window {
  if (
    v === "last5" ||
    v === "last10" ||
    v === "last20" ||
    v === "season" ||
    v === "vs"
  )
    return v;
  return "last10";
}

function parseVenue(v: string | undefined): Venue {
  if (v === "home" || v === "away" || v === "starts") return v;
  return "all";
}

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
  const window = parseWindow(sp.window);
  const venue = parseVenue(sp.venue);
  const opponentParam = sp.opponent ? Number(sp.opponent) : undefined;
  const opponentFromParam = Number.isFinite(opponentParam) ? opponentParam : undefined;

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
    () => getTeamPlayerLogs(teamId, season, SEASON_FETCH),
    () => mockTeamPlayerLogs(teamId, SEASON_FETCH)
  );

  const mocked = logsRes.mocked || teamsRes.mocked;
  const teamMeta = teamsRes.data.find((t) => t.team.id === teamId);
  const playerLogs: PlayerLogs | undefined =
    logsRes.data.logs.get(playerId) ??
    (mocked ? logsRes.data.logs.values().next().value : undefined);

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

  // ── H2H opponent resolution ────────────────────────────────────────────────
  // Opponents in the fetched window feed the picker. Default opponent when
  // window=vs: the URL param wins, otherwise auto-default to the player's
  // team's next scheduled opponent. Falls back to undefined if neither exists.
  const opponentsPlayed = getOpponentsPlayed(playerLogs.games);
  const nextOpponentId = logsRes.data.upcoming[0]
    ? logsRes.data.upcoming[0].teams.home.id === teamId
      ? logsRes.data.upcoming[0].teams.away.id
      : logsRes.data.upcoming[0].teams.home.id
    : undefined;
  const resolvedOpponentId =
    opponentFromParam ?? (window === "vs" ? nextOpponentId : undefined);
  const currentOpponent =
    resolvedOpponentId !== undefined
      ? opponentsPlayed.find((o) => o.id === resolvedOpponentId)
      : undefined;

  // ── Slicing ────────────────────────────────────────────────────────────────
  // Three slices feed different sections:
  //  - focusSlice: window + venue (+ opponent if vs) → summary, streaks, trends, game log
  //  - splitsSlice: window only → splits table (it shows its own H/A breakdown)
  //  - baselineSlice: season + same venue → delta baseline for summary
  const focusSlice = sliceGames(
    playerLogs.games,
    window,
    venue,
    resolvedOpponentId,
  );
  // For H2H mode the splits table still shows the H/A breakdown of all H2H games.
  const splitsSlice = sliceGames(
    playerLogs.games,
    window,
    "all",
    resolvedOpponentId,
  );
  const baselineSlice = sliceGames(playerLogs.games, "season", venue);

  const summary = summarizePlayer(focusSlice);
  const headline = computeHeadlineStats(focusSlice, baselineSlice);
  const focusHitRates = computeHitRates(focusSlice);
  const splitsHitRates = computeHitRates(splitsSlice);
  const trendSeries = computeTrendSeries(focusSlice);
  const basePath = `/player/${league}/${teamId}/${playerId}`;
  const baselineLabel =
    venue === "all"
      ? "season"
      : `season · ${VENUE_LABEL[venue].toLowerCase()}`;

  const leagueOptions = LEAGUES.map((l) => ({
    href: `/players?league=${l.id}`,
    label: l.shortName,
    active: l.id === league,
  }));
  const teamDropdownOptions = [...teamsRes.data]
    .sort((a, b) => a.team.name.localeCompare(b.team.name))
    .map((t) => ({
      href: `/players?league=${league}&team=${t.team.id}`,
      label: t.team.name,
      logo: t.team.logo,
      active: t.team.id === teamId,
    }));
  const playerDropdownOptions = [...logsRes.data.logs.values()]
    .sort((a, b) => a.player.name.localeCompare(b.player.name))
    .map((p) => ({
      href: `/player/${league}/${teamId}/${p.player.id}`,
      label: p.player.name,
      logo: p.player.photo || undefined,
      active: p.player.id === playerId,
    }));

  return (
    <div className="space-y-8">
      {mocked && <MockBanner />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs">
        <BreadcrumbDropdown
          label={leagueMeta?.shortName ?? "League"}
          options={leagueOptions}
        />
        <span className="text-zinc-700">/</span>
        <BreadcrumbDropdown
          label={teamMeta?.team.name ?? `Team ${teamId}`}
          options={teamDropdownOptions}
        />
        <span className="text-zinc-700">/</span>
        <BreadcrumbDropdown
          label={playerLogs.player.name}
          options={playerDropdownOptions}
          isLast
        />
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
                href={`/players?league=${league}&team=${teamId}`}
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
            <span>
              {playerLogs.games.length} season {playerLogs.games.length === 1 ? "match" : "matches"} fetched
            </span>
          </div>
        </div>
      </div>

      {/* Window + venue toggle */}
      <WindowToggle
        basePath={basePath}
        window={window}
        venue={venue}
        sampleSize={focusSlice.length}
        opponentId={resolvedOpponentId}
        opponents={opponentsPlayed}
        currentOpponent={currentOpponent}
      />

      {/* Summary panel: headline stats with deltas + primary prop hit rates */}
      <PlayerSummaryPanel
        headline={headline}
        hitRates={focusHitRates}
        window={window}
        venue={venue}
        sampleSize={focusSlice.length}
        baselineLabel={baselineLabel}
        h2h={
          window === "vs"
            ? {
                opponentName: currentOpponent?.name ?? null,
                lastMeeting: currentOpponent?.lastMeeting ?? null,
              }
            : undefined
        }
      />

      {/* Recent form / streaks (focus slice) */}
      <div>
        <SectionHeading>Hot &amp; cold streaks · {WINDOW_LABEL[window]}</SectionHeading>
        <PlayerStreaks rows={focusHitRates} />
      </div>

      {/* Splits table — always venue-agnostic so it shows H/A breakdown */}
      <div>
        <SectionHeading>
          Prop hit rates · home/away splits · {WINDOW_LABEL[window]}
        </SectionHeading>
        <PlayerSplitsTable rows={splitsHitRates} />
      </div>

      {/* Trend bars (focus slice) */}
      <div>
        <SectionHeading>Trends · {focusSlice.length}-game series</SectionHeading>
        <PlayerTrendBars series={trendSeries} />
      </div>

      {/* Game log (focus slice) */}
      <div>
        <SectionHeading>Game log · {WINDOW_LABEL[window]}{venue !== "all" ? ` · ${VENUE_LABEL[venue]}` : ""}</SectionHeading>
        <PlayerGameLogTable games={focusSlice} />
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
              Home
            </Link>
            <Link
              href="/players"
              prefetch={false}
              className="text-white font-medium border-b border-emerald-500 pb-0.5"
            >
              Search
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
