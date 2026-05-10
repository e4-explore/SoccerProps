const BASE = "https://v3.football.api-sports.io";

function apiHeaders(): HeadersInit {
  return { "x-apisports-key": process.env.API_FOOTBALL_KEY! };
}

/**
 * True when an error came from api-sports' daily-quota limit (vs other failures
 * like a missing season or an HTTP problem). Pages use this to decide whether
 * to fall back to mock data alongside the error message.
 */
export function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /reached the request limit/i.test(msg) || /rateLimit/i.test(msg);
}

/**
 * Fetch + unwrap an api-sports response. Throws on HTTP errors AND on plan/rate
 * errors (which return 200 OK with `errors: {...}`). Throwing is critical: when
 * called inside a `"use cache"` scope, a thrown error is not cached, so the next
 * request retries. Returning [] on error would cache the empty result.
 */
async function apiFetch<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`api-football HTTP ${res.status}: ${url}`);
  const data = await res.json();
  const errs = data?.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : errs && typeof errs === "object" && Object.keys(errs).length > 0;
  if (hasErrors) {
    throw new Error(`api-football error: ${JSON.stringify(errs)}`);
  }
  return data?.response ?? [];
}

export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface FixtureStatus {
  short: string;
  elapsed: number | null;
  long: string;
}

export interface Fixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    status: FixtureStatus;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: Team & { winner: boolean | null };
    away: Team & { winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface StandingRow {
  rank: number;
  team: Team;
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export async function getFixtures(params: {
  date?: string;
  league?: number;
  live?: string;
  season?: number;
  timezone?: string;
}): Promise<Fixture[]> {
  const url = new URL(`${BASE}/fixtures`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  // Not cached (cache: "no-store") — today's fixtures change throughout the
  // day. Throws on API errors so callers can show a useful message.
  const res = await fetch(url.toString(), {
    headers: apiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`api-football HTTP ${res.status}: ${url}`);
  const data = await res.json();
  const errs = data?.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : errs && typeof errs === "object" && Object.keys(errs).length > 0;
  if (hasErrors) {
    throw new Error(`api-football error: ${JSON.stringify(errs)}`);
  }
  return data?.response ?? [];
}

export async function getFixtureById(id: number): Promise<Fixture | null> {
  // HTTP-level cache — not "use cache" to avoid build-time API calls and
  // production error message sanitization breaking the mock fallback.
  const res = await fetch(`${BASE}/fixtures?id=${id}`, {
    headers: apiHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`api-football HTTP ${res.status}`);
  const data = await res.json();
  const errs = data?.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : errs && typeof errs === "object" && Object.keys(errs).length > 0;
  if (hasErrors) throw new Error(`api-football error: ${JSON.stringify(errs)}`);
  return (data?.response ?? [])[0] ?? null;
}

export async function getStandings(
  league: number,
  season: number
): Promise<StandingRow[][]> {
  // No "use cache" — that would call the API at build time to pre-populate
  // the cache, burning rate-limited quota on every deploy. Use HTTP-level
  // caching instead so the fetch is only made at runtime (first request).
  try {
    const res = await fetch(
      `${BASE}/standings?league=${league}&season=${season}`,
      { headers: apiHeaders(), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const errs = data?.errors;
    const hasErrors = Array.isArray(errs)
      ? errs.length > 0
      : errs && typeof errs === "object" && Object.keys(errs).length > 0;
    if (hasErrors) return [];
    const standings = data?.response?.[0]?.league?.standings;
    return Array.isArray(standings) ? standings : [];
  } catch {
    return [];
  }
}

// ─── Player props / trends endpoints ──────────────────────────────────────────

export interface LeagueTeamRow {
  team: Team & { country: string; founded: number | null; national: boolean };
  venue: { id: number; name: string; city: string; capacity: number | null };
}

export async function getLeagueTeams(
  league: number,
  season: number
): Promise<LeagueTeamRow[]> {
  // HTTP-level cache (teams don't change mid-season, long revalidate is fine).
  // Not "use cache" to keep error messages intact for mock-fallback detection.
  const res = await fetch(`${BASE}/teams?league=${league}&season=${season}`, {
    headers: apiHeaders(),
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`api-football HTTP ${res.status}`);
  const data = await res.json();
  const errs = data?.errors;
  const hasErrors = Array.isArray(errs)
    ? errs.length > 0
    : errs && typeof errs === "object" && Object.keys(errs).length > 0;
  if (hasErrors) throw new Error(`api-football error: ${JSON.stringify(errs)}`);
  return data?.response ?? [];
}

/**
 * Returns ALL fixtures for a team in a season. The free API tier doesn't
 * support the `last=N` parameter, so callers slice client-side.
 */
export async function getTeamSeasonFixtures(
  team: number,
  season: number
): Promise<Fixture[]> {
  "use cache";
  const { cacheLife } = await import("next/cache");
  cacheLife("hours");

  return apiFetch<Fixture>(`${BASE}/fixtures?team=${team}&season=${season}`);
}

export interface PlayerLite {
  id: number;
  name: string;
  photo: string;
}

export interface PlayerStatLine {
  games: {
    minutes: number | null;
    number: number | null;
    position: string | null;
    rating: string | null;
    captain: boolean;
    substitute: boolean;
  };
  offsides: number | null;
  shots: { total: number | null; on: number | null };
  goals: {
    total: number | null;
    conceded: number | null;
    assists: number | null;
    saves: number | null;
  };
  passes: {
    total: number | null;
    key: number | null;
    accuracy: string | number | null;
  };
  tackles: {
    total: number | null;
    blocks: number | null;
    interceptions: number | null;
  };
  duels: { total: number | null; won: number | null };
  dribbles: {
    attempts: number | null;
    success: number | null;
    past: number | null;
  };
  fouls: { drawn: number | null; committed: number | null };
  cards: { yellow: number; red: number };
  penalty: {
    won: number | null;
    committed: number | null;
    scored: number;
    missed: number;
    saved: number | null;
  };
}

export interface FixturePlayerEntry {
  player: PlayerLite;
  statistics: PlayerStatLine[];
}

export interface FixturePlayersTeamGroup {
  team: Team;
  players: FixturePlayerEntry[];
}

/**
 * Per-player stats for a single fixture. Past fixtures never change, so we cache
 * forever. Only called for finished fixtures.
 */
export async function getFixturePlayerStats(
  fixtureId: number
): Promise<FixturePlayersTeamGroup[]> {
  "use cache";
  const { cacheLife, cacheTag } = await import("next/cache");
  cacheLife("max");
  cacheTag(`fixture-players-${fixtureId}`);

  return apiFetch<FixturePlayersTeamGroup>(
    `${BASE}/fixtures/players?fixture=${fixtureId}`
  );
}

export interface SquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string;
  photo: string;
}

export interface TeamSquad {
  team: Team;
  players: SquadPlayer[];
}

export async function getTeamSquad(team: number): Promise<TeamSquad | null> {
  "use cache";
  const { cacheLife } = await import("next/cache");
  cacheLife("days");

  const rows = await apiFetch<TeamSquad>(`${BASE}/players/squads?team=${team}`);
  return rows[0] ?? null;
}
