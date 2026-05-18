/**
 * Understat per-match player stats — free xG/xA source covering EPL, La Liga,
 * Serie A, Bundesliga, and Ligue 1.
 *
 * The endpoint `GET https://understat.com/main/getPlayerMatches/{id}` returns
 * every league match for a player, with xG/xA per appearance. All numeric
 * fields come back as strings — we coerce. Used by the player page when a
 * mapping exists in `understat-player-map.ts`.
 */

const BASE = "https://understat.com";

/** Raw shape returned by Understat. Every number is JSON-encoded as a string. */
interface RawMatch {
  id: string;
  season: string;
  date: string; // YYYY-MM-DD
  goals: string;
  shots: string;
  xG: string;
  xA: string;
  assists: string;
  key_passes: string;
  npg: string;
  npxG: string;
  xGChain: string;
  xGBuildup: string;
  time: string;
  position: string;
  h_team: string;
  a_team: string;
  h_goals: string;
  a_goals: string;
  roster_id: string;
}

export interface UnderstatMatch {
  matchId: number;
  season: number;
  date: string; // YYYY-MM-DD
  xg: number;
  xa: number;
  shots: number;
  goals: number;
  assists: number;
  keyPasses: number;
  homeTeam: string;
  awayTeam: string;
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch every match Understat has for a player. We cache aggressively — match
 * xG never changes after the whistle, so day-long staleness is fine and saves
 * round-trips when the user toggles windows.
 */
export async function getPlayerMatches(
  understatPlayerId: number,
): Promise<UnderstatMatch[]> {
  "use cache";
  const { cacheLife } = await import("next/cache");
  cacheLife("hours");

  const res = await fetch(`${BASE}/main/getPlayerMatches/${understatPlayerId}`, {
    headers: { "User-Agent": "Mozilla/5.0 SoccerProps/0.1" },
  });
  if (!res.ok) {
    throw new Error(`understat HTTP ${res.status} for player ${understatPlayerId}`);
  }
  const data = await res.json();
  const matches: RawMatch[] = data?.response?.matches ?? [];
  return matches.map((m) => ({
    matchId: Number(m.id),
    season: Number(m.season),
    date: m.date,
    xg: num(m.xG),
    xa: num(m.xA),
    shots: num(m.shots),
    goals: num(m.goals),
    assists: num(m.assists),
    keyPasses: num(m.key_passes),
    homeTeam: m.h_team,
    awayTeam: m.a_team,
  }));
}
