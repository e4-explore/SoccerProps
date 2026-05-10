const BASE = "https://v3.football.api-sports.io";

function apiHeaders(): HeadersInit {
  return { "x-apisports-key": process.env.API_FOOTBALL_KEY! };
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

  try {
    const res = await fetch(url.toString(), {
      headers: apiHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.response ?? [];
  } catch {
    return [];
  }
}

export async function getStandings(
  league: number,
  season: number
): Promise<StandingRow[][]> {
  "use cache";
  const { cacheLife } = await import("next/cache");
  cacheLife("hours");

  try {
    const res = await fetch(
      `${BASE}/standings?league=${league}&season=${season}`,
      { headers: apiHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.response?.[0]?.league?.standings ?? [];
  } catch {
    return [];
  }
}
