import { Suspense } from "react";
import Link from "next/link";
import LeagueChips from "../_components/LeagueChips";
import TeamGrid from "../_components/TeamGrid";
import TeamSwitcher from "../_components/TeamSwitcher";
import PlayerRoster from "../_components/PlayerRoster";
import PlayerGameLog from "../_components/PlayerGameLog";
import { LEAGUES_BY_ID, currentSeason } from "../lib/leagues";
import { getTeamPlayerLogs } from "../lib/player-trends";
import { getLeagueTeams } from "../lib/api-football";

export const metadata = {
  title: "Player Trends — SoccerProps",
};

interface SearchParams {
  league?: string;
  team?: string;
  player?: string;
  n?: string;
}

function NoApiKey() {
  return (
    <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
      Set <code className="mx-1 px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400">API_FOOTBALL_KEY</code>
      {" "}in <code className="mx-1 px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400">.env.local</code> to use this page.
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-3 w-12 bg-zinc-900 rounded animate-pulse" />
        <div className="flex gap-1.5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 rounded-full bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-12 bg-zinc-900 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-lg bg-zinc-900 animate-pulse"
              style={{ opacity: Math.max(0.2, 1 - i * 0.06) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-500/5 ring-1 ring-red-500/20 p-4 text-sm text-red-300">
      <p className="font-medium mb-1">API request failed</p>
      <p className="text-xs text-red-300/70 font-mono break-words">{message}</p>
    </div>
  );
}

async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; error: string | null }> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    return { data: fallback, error: e instanceof Error ? e.message : String(e) };
  }
}

async function TeamRosterAndPlayer({
  league,
  team,
  season,
  last,
  playerId,
}: {
  league: number;
  team: number;
  season: number;
  last: number;
  playerId?: number;
}) {
  const teamsRes = await safeCall(() => getLeagueTeams(league, season), []);
  const logsRes = await safeCall(
    () => getTeamPlayerLogs(team, season, last),
    { fixtures: [], logs: new Map() }
  );

  if (logsRes.error) return <ApiError message={logsRes.error} />;

  const teamMeta = teamsRes.data.find((t) => t.team.id === team);
  const teamOptions = teamsRes.data.map((t) => ({
    id: t.team.id,
    name: t.team.name,
    logo: t.team.logo,
  }));
  const { fixtures, logs } = logsRes.data;

  if (fixtures.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500 text-sm">
        No finished fixtures found for this team in season {season}.
      </div>
    );
  }

  const playerLogs = playerId ? logs.get(playerId) : undefined;

  return (
    <div className="space-y-8">
      {teamOptions.length > 0 ? (
        <TeamSwitcher
          league={league}
          teams={teamOptions}
          activeTeamId={team}
          subtitle={`Last ${fixtures.length} matches · ${logs.size} players with stats`}
        />
      ) : (
        <div>
          <h1 className="text-xl font-bold text-white">
            {teamMeta?.team.name ?? `Team ${team}`}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Last {fixtures.length} matches · {logs.size} players with stats
          </p>
        </div>
      )}

      <div>
        <SectionHeading>Roster · totals over last {fixtures.length}</SectionHeading>
        <PlayerRoster
          league={league}
          team={team}
          logs={logs}
          activePlayerId={playerId}
        />
        <p className="mt-2 text-xs text-zinc-600">
          Click a player to see their game log and prop hit rates.
        </p>
      </div>

      {playerId && (
        <div className="pt-4 border-t border-zinc-800">
          {playerLogs ? (
            <PlayerGameLog
              player={playerLogs.player}
              games={playerLogs.games}
            />
          ) : (
            <div className="py-8 text-center text-zinc-500 text-sm">
              No stats found for player {playerId} in this team&rsquo;s last{" "}
              {fixtures.length} matches.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function PageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const leagueId = Number(params.league) || 39;
  const meta = LEAGUES_BY_ID.get(leagueId);
  const season = currentSeason(leagueId);
  const teamId = params.team ? Number(params.team) : undefined;
  const playerId = params.player ? Number(params.player) : undefined;
  const last = Math.min(20, Math.max(3, Number(params.n) || 10));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SectionHeading>League</SectionHeading>
        <LeagueChips activeId={leagueId} />
        <p className="text-xs text-zinc-600">
          {meta?.name ?? "League"} · {season}-
          {(season + 1).toString().slice(2)} season
          {season === 2024 && (
            <span className="text-zinc-700">
              {" "}
              (free API tier max)
            </span>
          )}
        </p>
      </div>

      {teamId ? (
        <TeamRosterAndPlayer
          league={leagueId}
          team={teamId}
          season={season}
          last={last}
          playerId={playerId}
        />
      ) : (
        <div className="space-y-3">
          <SectionHeading>Team</SectionHeading>
          <TeamGrid
            league={leagueId}
            season={season}
            activeTeamId={teamId}
          />
        </div>
      )}
    </div>
  );
}

export default function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!process.env.API_FOOTBALL_KEY) return <NoApiKey />;

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
            <span className="text-white font-medium border-b border-emerald-500 pb-0.5">
              Players
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Suspense fallback={<ContentSkeleton />}>
          <PageContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
