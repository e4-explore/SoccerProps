/**
 * Mock data used when the api-sports daily quota is exhausted. Shapes match
 * the real fetcher return types so components can render unchanged. Logo URLs
 * point at api-sports' public CDN — those are static images, not metered API
 * calls. Player photos use the same CDN.
 *
 * Pages display a clear "mock data" banner above whenever any of this is shown.
 */

import type {
  Fixture,
  FixturePlayersTeamGroup,
  LeagueTeamRow,
  PlayerStatLine,
  StandingRow,
} from "./api-football";
import type { GameLogEntry, PlayerLogs } from "./player-trends";

const TEAM_LOGO = (id: number) =>
  `https://media.api-sports.io/football/teams/${id}.png`;
const LEAGUE_LOGO = (id: number) =>
  `https://media.api-sports.io/football/leagues/${id}.png`;
const COUNTRY_FLAG = (code: string) =>
  `https://media.api-sports.io/flags/${code}.svg`;

interface MockTeamMeta {
  id: number;
  name: string;
}

const EPL_TEAMS: MockTeamMeta[] = [
  { id: 42, name: "Arsenal" },
  { id: 40, name: "Liverpool" },
  { id: 50, name: "Manchester City" },
  { id: 49, name: "Chelsea" },
  { id: 47, name: "Tottenham" },
  { id: 66, name: "Aston Villa" },
  { id: 34, name: "Newcastle" },
  { id: 33, name: "Manchester United" },
  { id: 51, name: "Brighton" },
  { id: 65, name: "Nottingham Forest" },
  { id: 48, name: "West Ham" },
  { id: 52, name: "Crystal Palace" },
  { id: 36, name: "Fulham" },
  { id: 55, name: "Brentford" },
  { id: 35, name: "Bournemouth" },
  { id: 39, name: "Wolves" },
  { id: 45, name: "Everton" },
  { id: 71, name: "Leicester" },
  { id: 41, name: "Southampton" },
  { id: 57, name: "Ipswich" },
];

// ─── Today's matches ─────────────────────────────────────────────────────────

const todayIso = (hourOffset: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hourOffset, 0, 0, 0);
  return d.toISOString();
};

function mockFixture({
  id,
  leagueId,
  leagueName,
  country,
  flag,
  round,
  home,
  away,
  goalsHome,
  goalsAway,
  status,
  hourOffset,
}: {
  id: number;
  leagueId: number;
  leagueName: string;
  country: string;
  flag: string | null;
  round: string;
  home: MockTeamMeta;
  away: MockTeamMeta;
  goalsHome: number | null;
  goalsAway: number | null;
  status: { short: string; long: string; elapsed: number | null };
  hourOffset: number;
}): Fixture {
  const winner =
    goalsHome != null && goalsAway != null
      ? goalsHome > goalsAway
        ? "home"
        : goalsHome < goalsAway
          ? "away"
          : null
      : null;
  return {
    fixture: {
      id,
      referee: "M. Oliver",
      timezone: "UTC",
      date: todayIso(hourOffset),
      timestamp: Math.floor(Date.now() / 1000) + hourOffset * 3600,
      status,
    },
    league: {
      id: leagueId,
      name: leagueName,
      country,
      logo: LEAGUE_LOGO(leagueId),
      flag,
      season: 2024,
      round,
    },
    teams: {
      home: { ...home, logo: TEAM_LOGO(home.id), winner: winner === "home" ? true : winner === "away" ? false : null },
      away: { ...away, logo: TEAM_LOGO(away.id), winner: winner === "away" ? true : winner === "home" ? false : null },
    },
    goals: { home: goalsHome, away: goalsAway },
    score: {
      halftime: { home: goalsHome != null ? Math.floor(goalsHome / 2) : null, away: goalsAway != null ? Math.floor(goalsAway / 2) : null },
      fulltime: { home: goalsHome, away: goalsAway },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

export const MOCK_TODAYS_FIXTURES: Fixture[] = [
  mockFixture({
    id: 9000001,
    leagueId: 39,
    leagueName: "Premier League",
    country: "England",
    flag: COUNTRY_FLAG("GB"),
    round: "Regular Season - 35",
    home: EPL_TEAMS[0], // Arsenal
    away: EPL_TEAMS[3], // Chelsea
    goalsHome: 2,
    goalsAway: 1,
    status: { short: "FT", long: "Match Finished", elapsed: 90 },
    hourOffset: -3,
  }),
  mockFixture({
    id: 9000002,
    leagueId: 39,
    leagueName: "Premier League",
    country: "England",
    flag: COUNTRY_FLAG("GB"),
    round: "Regular Season - 35",
    home: EPL_TEAMS[1], // Liverpool
    away: EPL_TEAMS[2], // Man City
    goalsHome: 1,
    goalsAway: 1,
    status: { short: "2H", long: "Second Half", elapsed: 67 },
    hourOffset: -1,
  }),
  mockFixture({
    id: 9000003,
    leagueId: 140,
    leagueName: "La Liga",
    country: "Spain",
    flag: COUNTRY_FLAG("ES"),
    round: "Regular Season - 36",
    home: { id: 541, name: "Real Madrid" },
    away: { id: 529, name: "Barcelona" },
    goalsHome: null,
    goalsAway: null,
    status: { short: "NS", long: "Not Started", elapsed: null },
    hourOffset: 2,
  }),
  mockFixture({
    id: 9000004,
    leagueId: 135,
    leagueName: "Serie A",
    country: "Italy",
    flag: COUNTRY_FLAG("IT"),
    round: "Regular Season - 35",
    home: { id: 489, name: "AC Milan" },
    away: { id: 505, name: "Inter" },
    goalsHome: null,
    goalsAway: null,
    status: { short: "NS", long: "Not Started", elapsed: null },
    hourOffset: 4,
  }),
  mockFixture({
    id: 9000005,
    leagueId: 253,
    leagueName: "MLS",
    country: "USA",
    flag: COUNTRY_FLAG("US"),
    round: "Regular Season - 12",
    home: { id: 1616, name: "Inter Miami" },
    away: { id: 1602, name: "LA Galaxy" },
    goalsHome: null,
    goalsAway: null,
    status: { short: "NS", long: "Not Started", elapsed: null },
    hourOffset: 7,
  }),
];

// ─── Premier League standings ────────────────────────────────────────────────

function mockStandingsRow(
  rank: number,
  team: MockTeamMeta,
  played: number,
  win: number,
  draw: number,
  goalsFor: number,
  goalsAgainst: number,
  description: string | null
): StandingRow {
  const lose = played - win - draw;
  return {
    rank,
    team: { id: team.id, name: team.name, logo: TEAM_LOGO(team.id) },
    points: win * 3 + draw,
    goalsDiff: goalsFor - goalsAgainst,
    group: "Premier League",
    form: "WWDLW",
    status: "same",
    description,
    all: {
      played,
      win,
      draw,
      lose,
      goals: { for: goalsFor, against: goalsAgainst },
    },
  };
}

export const MOCK_EPL_STANDINGS: StandingRow[] = [
  mockStandingsRow(1, EPL_TEAMS[1], 36, 25, 9, 81, 26, "Champions League"),
  mockStandingsRow(2, EPL_TEAMS[0], 36, 21, 11, 67, 32, "Champions League"),
  mockStandingsRow(3, EPL_TEAMS[2], 36, 21, 8, 71, 41, "Champions League"),
  mockStandingsRow(4, EPL_TEAMS[5], 36, 19, 10, 56, 49, "Champions League"),
  mockStandingsRow(5, EPL_TEAMS[3], 36, 18, 12, 62, 41, "Europa League"),
  mockStandingsRow(6, EPL_TEAMS[4], 36, 19, 4, 65, 48, "Europa League"),
  mockStandingsRow(7, EPL_TEAMS[6], 36, 18, 8, 65, 47, null),
  mockStandingsRow(8, EPL_TEAMS[8], 36, 16, 13, 64, 56, null),
  mockStandingsRow(9, EPL_TEAMS[9], 36, 18, 7, 58, 45, null),
  mockStandingsRow(10, EPL_TEAMS[10], 36, 15, 9, 56, 56, null),
  mockStandingsRow(11, EPL_TEAMS[7], 36, 14, 10, 44, 53, null),
  mockStandingsRow(12, EPL_TEAMS[11], 36, 13, 8, 52, 49, null),
  mockStandingsRow(13, EPL_TEAMS[12], 36, 14, 11, 53, 53, null),
  mockStandingsRow(14, EPL_TEAMS[14], 36, 12, 12, 56, 65, null),
  mockStandingsRow(15, EPL_TEAMS[13], 36, 13, 8, 56, 56, null),
  mockStandingsRow(16, EPL_TEAMS[15], 36, 12, 6, 52, 65, null),
  mockStandingsRow(17, EPL_TEAMS[16], 36, 11, 4, 41, 64, null),
  mockStandingsRow(18, EPL_TEAMS[17], 36, 6, 7, 33, 80, "Relegation"),
  mockStandingsRow(19, EPL_TEAMS[19], 36, 4, 10, 35, 78, "Relegation"),
  mockStandingsRow(20, EPL_TEAMS[18], 36, 2, 6, 26, 86, "Relegation"),
];

// ─── League teams (used by /players league picker) ───────────────────────────

const GENERIC_TEAMS: MockTeamMeta[] = [
  { id: 100001, name: "Demo United" },
  { id: 100002, name: "Sample FC" },
  { id: 100003, name: "Mock City" },
  { id: 100004, name: "Placeholder Town" },
  { id: 100005, name: "Test Athletic" },
  { id: 100006, name: "Stub Rangers" },
];

function teamsFor(teams: MockTeamMeta[]): LeagueTeamRow[] {
  return teams.map((t) => ({
    team: {
      id: t.id,
      name: t.name,
      logo: TEAM_LOGO(t.id),
      country: "Mock",
      founded: 1900,
      national: false,
    },
    venue: { id: t.id, name: "Mock Stadium", city: "Mock City", capacity: 50000 },
  }));
}

export const MOCK_LEAGUE_TEAMS: Record<number, LeagueTeamRow[]> = {
  39: teamsFor(EPL_TEAMS),
  140: teamsFor([
    { id: 541, name: "Real Madrid" },
    { id: 529, name: "Barcelona" },
    { id: 530, name: "Atlético Madrid" },
    { id: 531, name: "Athletic Club" },
    { id: 543, name: "Real Betis" },
    { id: 538, name: "Celta Vigo" },
  ]),
  135: teamsFor([
    { id: 489, name: "AC Milan" },
    { id: 505, name: "Inter" },
    { id: 496, name: "Juventus" },
    { id: 492, name: "Napoli" },
    { id: 487, name: "Lazio" },
    { id: 497, name: "Roma" },
  ]),
};

export function mockLeagueTeams(leagueId: number): LeagueTeamRow[] {
  return MOCK_LEAGUE_TEAMS[leagueId] ?? teamsFor(GENERIC_TEAMS);
}

// ─── Player game logs (used by /players team page) ───────────────────────────

const MOCK_PLAYERS = [
  { id: 990001, name: "Jordan Hayes", position: "G" },
  { id: 990002, name: "Marco Rivera", position: "D" },
  { id: 990003, name: "Tomás Lindqvist", position: "D" },
  { id: 990004, name: "Kwame Boateng", position: "D" },
  { id: 990005, name: "Hiroshi Tanaka", position: "D" },
  { id: 990006, name: "Liam O'Connor", position: "M" },
  { id: 990007, name: "Pierre Lefèvre", position: "M" },
  { id: 990008, name: "Diego Salazar", position: "M" },
  { id: 990009, name: "Yusuf Demir", position: "F" },
  { id: 990010, name: "Theo Westbrook", position: "F" },
  { id: 990011, name: "Andre Costa", position: "F" },
  { id: 990012, name: "Ben Walker", position: "M" }, // sub
  { id: 990013, name: "Sven Müller", position: "F" }, // sub
];

function blankStat(): PlayerStatLine {
  return {
    games: { minutes: 0, number: null, position: null, rating: null, captain: false, substitute: true },
    offsides: null,
    shots: { total: null, on: null },
    goals: { total: null, conceded: null, assists: null, saves: null },
    passes: { total: null, key: null, accuracy: null },
    tackles: { total: null, blocks: null, interceptions: null },
    duels: { total: null, won: null },
    dribbles: { attempts: null, success: null, past: null },
    fouls: { drawn: null, committed: null },
    cards: { yellow: 0, red: 0 },
    penalty: { won: null, committed: null, scored: 0, missed: 0, saved: null },
  };
}

// Deterministic pseudo-random so the mock looks consistent across reloads.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function mockPlayerStats(
  position: string,
  seed: number,
  played: boolean
): PlayerStatLine {
  if (!played) return blankStat();
  const r = rng(seed);
  const minutes = r() < 0.2 ? 25 + Math.floor(r() * 30) : 78 + Math.floor(r() * 13);
  const isFwd = position === "F";
  const isMid = position === "M";
  const isDef = position === "D";
  const isGk = position === "G";
  const shots = isGk ? 0 : isFwd ? Math.floor(r() * 5) : isMid ? Math.floor(r() * 3) : Math.floor(r() * 2);
  const sot = Math.floor(shots * (0.3 + r() * 0.4));
  return {
    games: {
      minutes,
      number: null,
      position,
      rating: (5.5 + r() * 3).toFixed(1),
      captain: false,
      substitute: minutes < 60,
    },
    offsides: isFwd ? Math.floor(r() * 2) : 0,
    shots: { total: shots, on: sot },
    goals: {
      total: isFwd && r() < 0.18 ? 1 : isMid && r() < 0.08 ? 1 : 0,
      conceded: isGk ? Math.floor(r() * 3) : null,
      assists: isFwd && r() < 0.12 ? 1 : isMid && r() < 0.18 ? 1 : 0,
      saves: isGk ? 2 + Math.floor(r() * 4) : null,
    },
    passes: {
      total: isGk ? 20 + Math.floor(r() * 20) : isDef ? 60 + Math.floor(r() * 30) : 40 + Math.floor(r() * 40),
      key: isMid || isFwd ? Math.floor(r() * 4) : 0,
      accuracy: 70 + Math.floor(r() * 25),
    },
    tackles: {
      total: isDef ? 1 + Math.floor(r() * 4) : isMid ? Math.floor(r() * 4) : 0,
      blocks: isDef ? Math.floor(r() * 2) : 0,
      interceptions: isDef ? Math.floor(r() * 3) : 0,
    },
    duels: { total: 5 + Math.floor(r() * 8), won: 2 + Math.floor(r() * 6) },
    dribbles: {
      attempts: isFwd || isMid ? Math.floor(r() * 5) : 0,
      success: isFwd || isMid ? Math.floor(r() * 3) : 0,
      past: null,
    },
    fouls: {
      drawn: Math.floor(r() * 3),
      committed: isDef || isMid ? Math.floor(r() * 3) : Math.floor(r() * 2),
    },
    cards: { yellow: r() < 0.18 ? 1 : 0, red: 0 },
    penalty: { won: null, committed: null, scored: 0, missed: 0, saved: null },
  };
}

// Real EPL team IDs are used so logos load from the api-sports CDN. The names
// next to them are fictional opponents — the logos are just visual placeholders.
const MOCK_OPPONENTS: MockTeamMeta[] = [
  { id: 51, name: "Crosstown FC" },
  { id: 55, name: "Riverside United" },
  { id: 35, name: "Eastside Athletic" },
  { id: 36, name: "Highland Rovers" },
  { id: 39, name: "Coastline City" },
  { id: 45, name: "Northgate" },
  { id: 41, name: "Old Park" },
  { id: 65, name: "Cathedral Town" },
  { id: 71, name: "Mill Lane" },
  { id: 57, name: "Quay Athletic" },
];

export function mockTeamPlayerLogs(
  teamId: number,
  last = 10
): { fixtures: Fixture[]; upcoming: Fixture[]; logs: Map<number, PlayerLogs> } {
  const fixtures: Fixture[] = [];
  const r = rng(teamId);

  for (let i = 0; i < last; i++) {
    const isHome = i % 2 === 0;
    const opp = MOCK_OPPONENTS[i % MOCK_OPPONENTS.length];
    const goalsFor = Math.floor(r() * 4);
    const goalsAgainst = Math.floor(r() * 3);
    const date = new Date();
    date.setDate(date.getDate() - (i + 1) * 5);

    fixtures.push(
      mockFixture({
        id: 9100000 + teamId * 100 + i,
        leagueId: 39,
        leagueName: "Premier League",
        country: "England",
        flag: COUNTRY_FLAG("GB"),
        round: `Regular Season - ${36 - i}`,
        home: isHome ? { id: teamId, name: "Selected Team" } : opp,
        away: isHome ? opp : { id: teamId, name: "Selected Team" },
        goalsHome: isHome ? goalsFor : goalsAgainst,
        goalsAway: isHome ? goalsAgainst : goalsFor,
        status: { short: "FT", long: "Match Finished", elapsed: 90 },
        hourOffset: -24 * (i + 1) * 5,
      })
    );
  }

  // One scheduled upcoming fixture so H2H can default to "next opponent".
  // Pick an opponent the team has already met so the H2H sample isn't empty.
  const nextOpp = MOCK_OPPONENTS[0];
  const upcoming: Fixture[] = [
    mockFixture({
      id: 9100000 + teamId * 100 + 999,
      leagueId: 39,
      leagueName: "Premier League",
      country: "England",
      flag: COUNTRY_FLAG("GB"),
      round: `Regular Season - ${36 + 1}`,
      home: { id: teamId, name: "Selected Team" },
      away: nextOpp,
      goalsHome: null,
      goalsAway: null,
      status: { short: "NS", long: "Not Started", elapsed: null },
      hourOffset: 24 * 3,
    }),
  ];

  const logs = new Map<number, PlayerLogs>();
  for (const p of MOCK_PLAYERS) {
    const games: GameLogEntry[] = fixtures.map((f, i) => {
      const played = !(p.id === 990012 && i % 3 === 0) && !(p.id === 990013 && i % 4 === 0);
      const isHome = f.teams.home.id === teamId;
      const opp = isHome ? f.teams.away : f.teams.home;
      const stats = mockPlayerStats(p.position, p.id + i, played);
      // Synthetic xG/xA so the mock-mode preview shows the columns populated.
      // Real data comes from Understat for mapped players in live mode.
      const xg = played
        ? Number((((stats.shots.total ?? 0) * 0.12 + (stats.shots.on ?? 0) * 0.05)).toFixed(2))
        : null;
      const xa = played
        ? Number((((stats.passes.key ?? 0) * 0.08 + (stats.goals.assists ?? 0) * 0.3)).toFixed(2))
        : null;
      return {
        fixtureId: f.fixture.id,
        date: f.fixture.date,
        opponent: { id: opp.id, name: opp.name, logo: opp.logo },
        isHome,
        goalsFor: isHome ? f.goals.home : f.goals.away,
        goalsAgainst: isHome ? f.goals.away : f.goals.home,
        stats,
        xg,
        xa,
      };
    });
    // Empty photo URL — components that render player photos already guard
    // against falsy values, so they cleanly skip the avatar for mocks.
    logs.set(p.id, {
      player: { id: p.id, name: p.name, photo: "" },
      games,
    });
  }

  return { fixtures, upcoming, logs };
}

// ─── Fixture detail (single match + per-player stats) ────────────────────────

export function mockFixtureById(id: number): Fixture {
  const found = MOCK_TODAYS_FIXTURES.find((f) => f.fixture.id === id);
  if (found) return found;
  return mockFixture({
    id,
    leagueId: 39,
    leagueName: "Premier League",
    country: "England",
    flag: COUNTRY_FLAG("GB"),
    round: "Regular Season - 35",
    home: EPL_TEAMS[0],
    away: EPL_TEAMS[3],
    goalsHome: 2,
    goalsAway: 1,
    status: { short: "FT", long: "Match Finished", elapsed: 90 },
    hourOffset: -3,
  });
}

function mockTeamGroup(team: MockTeamMeta, seed: number): FixturePlayersTeamGroup {
  return {
    team: { id: team.id, name: team.name, logo: TEAM_LOGO(team.id) },
    players: MOCK_PLAYERS.map((p, i) => ({
      player: { id: p.id + seed, name: p.name, photo: "" },
      statistics: [mockPlayerStats(p.position, seed + i, true)],
    })),
  };
}

export function mockFixturePlayerStats(id: number): FixturePlayersTeamGroup[] {
  const f = mockFixtureById(id);
  return [
    mockTeamGroup(
      { id: f.teams.home.id, name: f.teams.home.name },
      f.fixture.id
    ),
    mockTeamGroup(
      { id: f.teams.away.id, name: f.teams.away.name },
      f.fixture.id + 7
    ),
  ];
}

// ─── H2H + team-season fallbacks for pre-match insights ──────────────────────

interface MockTeamRef {
  id: number;
  name: string;
  logo?: string;
}

// Deterministic pseudo-random so the same teams always produce the same mock
// history (no flicker between requests).
function seededInt(seed: number, mod: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * mod);
}

function logoFor(ref: MockTeamRef): string {
  return ref.logo ?? TEAM_LOGO(ref.id);
}

function mockPastFixture(opts: {
  id: number;
  home: MockTeamRef;
  away: MockTeamRef;
  goalsHome: number;
  goalsAway: number;
  daysAgo: number;
  leagueId?: number;
  leagueName?: string;
  round?: string;
}): Fixture {
  const date = new Date();
  date.setDate(date.getDate() - opts.daysAgo);
  date.setHours(15, 0, 0, 0);
  const winner =
    opts.goalsHome > opts.goalsAway
      ? "home"
      : opts.goalsHome < opts.goalsAway
        ? "away"
        : null;
  return {
    fixture: {
      id: opts.id,
      referee: null,
      timezone: "UTC",
      date: date.toISOString(),
      timestamp: Math.floor(date.getTime() / 1000),
      status: { short: "FT", long: "Match Finished", elapsed: 90 },
    },
    league: {
      id: opts.leagueId ?? 39,
      name: opts.leagueName ?? "Premier League",
      country: "England",
      logo: LEAGUE_LOGO(opts.leagueId ?? 39),
      flag: COUNTRY_FLAG("GB"),
      season: 2024,
      round: opts.round ?? "Regular Season",
    },
    teams: {
      home: {
        id: opts.home.id,
        name: opts.home.name,
        logo: logoFor(opts.home),
        winner: winner === "home" ? true : winner === "away" ? false : null,
      },
      away: {
        id: opts.away.id,
        name: opts.away.name,
        logo: logoFor(opts.away),
        winner: winner === "away" ? true : winner === "home" ? false : null,
      },
    },
    goals: { home: opts.goalsHome, away: opts.goalsAway },
    score: {
      halftime: {
        home: Math.floor(opts.goalsHome / 2),
        away: Math.floor(opts.goalsAway / 2),
      },
      fulltime: { home: opts.goalsHome, away: opts.goalsAway },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

export function mockHeadToHead(t1: MockTeamRef, t2: MockTeamRef): Fixture[] {
  const seed = t1.id * 31 + t2.id;
  // 8 prior meetings, alternating venue, with varied scorelines.
  return Array.from({ length: 8 }, (_, i) => {
    const homeIsT1 = i % 2 === 0;
    const home = homeIsT1 ? t1 : t2;
    const away = homeIsT1 ? t2 : t1;
    const gh = seededInt(seed + i * 7, 4);
    const ga = seededInt(seed + i * 11 + 3, 4);
    return mockPastFixture({
      id: 9100000 + seed + i,
      home,
      away,
      goalsHome: gh,
      goalsAway: ga,
      daysAgo: 90 + i * 180,
      round: `H2H archive ${i + 1}`,
    });
  });
}

function mockStandingRow(team: MockTeamRef, seed: number): StandingRow {
  const played = 30 + seededInt(seed, 6);
  const win = 8 + seededInt(seed + 1, 12);
  const draw = 3 + seededInt(seed + 2, 6);
  const lose = Math.max(0, played - win - draw);
  const goalsFor = 25 + seededInt(seed + 3, 35);
  const goalsAgainst = 20 + seededInt(seed + 4, 30);
  const formChars = ["W", "D", "L"] as const;
  const form = Array.from({ length: 5 }, (_, i) =>
    formChars[seededInt(seed + 10 + i, 3)]
  ).join("");
  return {
    rank: 1 + seededInt(seed + 5, 18),
    team: { id: team.id, name: team.name, logo: logoFor(team) },
    points: win * 3 + draw,
    goalsDiff: goalsFor - goalsAgainst,
    group: "Mock league",
    form,
    status: "same",
    description: null,
    all: {
      played,
      win,
      draw,
      lose,
      goals: { for: goalsFor, against: goalsAgainst },
    },
  };
}

/**
 * Synthetic standings rows for the two teams when the league table isn't
 * available (e.g. mock mode for a non-EPL fixture). Lets the standings card
 * still render in the preview UI without needing the real /standings call.
 */
export function mockStandingsForTeams(
  home: MockTeamRef,
  away: MockTeamRef
): StandingRow[] {
  return [
    mockStandingRow(home, home.id * 7),
    mockStandingRow(away, away.id * 13),
  ];
}

export function mockTeamSeasonFixtures(team: MockTeamRef): Fixture[] {
  // Use EPL teams as a pool of believable opponents, swapped to avoid the
  // subject team itself. Names/logos for the subject team come from the caller.
  const opponents = EPL_TEAMS.filter((t) => t.id !== team.id).slice(0, 10);
  return opponents.map((opp, i) => {
    const homeIsTeam = i % 2 === 0;
    const home = homeIsTeam ? team : opp;
    const away = homeIsTeam ? opp : team;
    const gh = seededInt(team.id * 13 + i * 5, 4);
    const ga = seededInt(team.id * 17 + i * 9 + 1, 4);
    return mockPastFixture({
      id: 9200000 + team.id * 100 + i,
      home,
      away,
      goalsHome: gh,
      goalsAway: ga,
      daysAgo: 7 + i * 14,
    });
  });
}
