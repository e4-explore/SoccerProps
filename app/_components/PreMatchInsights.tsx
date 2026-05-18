import Link from "next/link";
import {
  getHeadToHead,
  getStandings,
  getTeamSeasonFixtures,
  type Fixture,
  type StandingRow,
  type Team,
} from "../lib/api-football";
import {
  mockHeadToHead,
  mockStandingsForTeams,
  mockTeamSeasonFixtures,
  MOCK_EPL_STANDINGS,
} from "../lib/mock-data";
import HeadToHead from "./HeadToHead";
import TeamFormPanel from "./TeamFormPanel";
import MatchupStandings from "./MatchupStandings";

async function safeHeadToHead(
  home: Team,
  away: Team,
  mocked: boolean
): Promise<Fixture[]> {
  if (mocked) return mockHeadToHead(home, away);
  try {
    return await getHeadToHead(home.id, away.id, 10);
  } catch {
    return mockHeadToHead(home, away);
  }
}

async function safeTeamFixtures(
  team: Team,
  season: number,
  mocked: boolean
): Promise<Fixture[]> {
  if (mocked) return mockTeamSeasonFixtures(team);
  try {
    return await getTeamSeasonFixtures(team.id, season);
  } catch {
    return mockTeamSeasonFixtures(team);
  }
}

async function safeStandings(
  leagueId: number,
  season: number,
  mocked: boolean
): Promise<StandingRow[]> {
  if (mocked) return MOCK_EPL_STANDINGS;
  try {
    const all = await getStandings(leagueId, season);
    const table = all[0] ?? [];
    return table.length === 0 ? MOCK_EPL_STANDINGS : table;
  } catch {
    return MOCK_EPL_STANDINGS;
  }
}

export default async function PreMatchInsights({
  fixture,
  mocked = false,
}: {
  fixture: Fixture;
  mocked?: boolean;
}) {
  const { teams, league } = fixture;
  const season = league.season;

  const [h2h, homeFixtures, awayFixtures, standings] = await Promise.all([
    safeHeadToHead(teams.home, teams.away, mocked),
    safeTeamFixtures(teams.home, season, mocked),
    safeTeamFixtures(teams.away, season, mocked),
    safeStandings(league.id, season, mocked),
  ]);

  let homeRow = standings.find((r) => r.team.id === teams.home.id) ?? null;
  let awayRow = standings.find((r) => r.team.id === teams.away.id) ?? null;
  // Neither team in the league table (e.g. mock mode for a non-EPL fixture):
  // fall back to synthetic rows so the standings card still renders.
  if (mocked && !homeRow && !awayRow) {
    const fallback = mockStandingsForTeams(teams.home, teams.away);
    homeRow = fallback[0];
    awayRow = fallback[1];
  }

  return (
    <div className="space-y-4">
      <HeadToHead fixtures={h2h} home={teams.home} away={teams.away} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamFormPanel team={teams.home} fixtures={homeFixtures} />
        <TeamFormPanel team={teams.away} fixtures={awayFixtures} align="right" />
      </div>

      <MatchupStandings
        home={teams.home}
        away={teams.away}
        homeRow={homeRow}
        awayRow={awayRow}
      />

      {/* Footer: keep team-page deep links for users who want full rosters */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-zinc-600">Squads & player stats →</span>
        <Link
          href={`/players?league=${league.id}&team=${teams.home.id}`}
          prefetch={false}
          className="px-2.5 py-1 rounded-md bg-zinc-900 ring-1 ring-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors"
        >
          {teams.home.name}
        </Link>
        <Link
          href={`/players?league=${league.id}&team=${teams.away.id}`}
          prefetch={false}
          className="px-2.5 py-1 rounded-md bg-zinc-900 ring-1 ring-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors"
        >
          {teams.away.name}
        </Link>
      </div>
    </div>
  );
}
