import {
  getTeamSeasonFixtures,
  getFixturePlayerStats,
  type Fixture,
  type PlayerLite,
  type PlayerStatLine,
} from "./api-football";

const FINISHED = new Set(["FT", "AET", "PEN"]);

export interface GameLogEntry {
  fixtureId: number;
  date: string; // ISO
  opponent: { id: number; name: string; logo: string };
  isHome: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  stats: PlayerStatLine;
}

export interface PlayerLogs {
  player: PlayerLite;
  /** Games sorted most-recent first. */
  games: GameLogEntry[];
}

/**
 * Fetches the team's last N finished fixtures, then per-fixture player stats,
 * and returns a per-player game log. Data for every player on the team is built
 * from the same fetches — no extra calls to drill into individual players.
 */
export async function getTeamPlayerLogs(
  teamId: number,
  season: number,
  last = 10
): Promise<{ fixtures: Fixture[]; logs: Map<number, PlayerLogs> }> {
  const all = await getTeamSeasonFixtures(teamId, season);
  const finished = all
    .filter((f) => FINISHED.has(f.fixture.status.short))
    .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date))
    .slice(0, last);

  // Free tier rate-limits at 10 req/min, so chunk the per-fixture fetches.
  // Cache hits are free, so warm-cache reloads stay snappy. We also tolerate
  // individual fixture failures rather than failing the whole page.
  const CHUNK = 5;
  const perFixture: { fixture: Fixture; groups: Awaited<ReturnType<typeof getFixturePlayerStats>> }[] = [];
  for (let i = 0; i < finished.length; i += CHUNK) {
    const chunk = finished.slice(i, i + CHUNK);
    const settled = await Promise.allSettled(
      chunk.map((f) => getFixturePlayerStats(f.fixture.id))
    );
    chunk.forEach((f, j) => {
      const r = settled[j];
      if (r.status === "fulfilled") {
        perFixture.push({ fixture: f, groups: r.value });
      }
    });
  }

  const logs = new Map<number, PlayerLogs>();

  for (const { fixture, groups } of perFixture) {
    const teamGroup = groups.find((g) => g.team.id === teamId);
    if (!teamGroup) continue;
    const isHome = fixture.teams.home.id === teamId;
    const opp = isHome ? fixture.teams.away : fixture.teams.home;
    const opponent = { id: opp.id, name: opp.name, logo: opp.logo };

    for (const entry of teamGroup.players) {
      const stat = entry.statistics?.[0];
      if (!stat) continue;
      const existing = logs.get(entry.player.id) ?? {
        player: entry.player,
        games: [],
      };
      existing.games.push({
        fixtureId: fixture.fixture.id,
        date: fixture.fixture.date,
        opponent,
        isHome,
        goalsFor: isHome ? fixture.goals.home : fixture.goals.away,
        goalsAgainst: isHome ? fixture.goals.away : fixture.goals.home,
        stats: stat,
      });
      logs.set(entry.player.id, existing);
    }
  }

  for (const v of logs.values()) {
    v.games.sort((a, b) => b.date.localeCompare(a.date));
  }

  return { fixtures: finished, logs };
}

// ─── Stat selectors & hit-rate math ──────────────────────────────────────────

export type StatKey =
  | "minutes"
  | "shots"
  | "sot"
  | "goals"
  | "assists"
  | "tackles"
  | "fouls"
  | "yellow"
  | "passKey"
  | "rating";

export const STAT_LABEL: Record<StatKey, string> = {
  minutes: "Min",
  shots: "Sh",
  sot: "SoT",
  goals: "G",
  assists: "A",
  tackles: "Tk",
  fouls: "Fls",
  yellow: "YC",
  passKey: "KP",
  rating: "Rtg",
};

export function pickStat(s: PlayerStatLine, key: StatKey): number | null {
  switch (key) {
    case "minutes":
      return s.games.minutes;
    case "shots":
      return s.shots.total;
    case "sot":
      return s.shots.on;
    case "goals":
      return s.goals.total;
    case "assists":
      return s.goals.assists;
    case "tackles":
      return s.tackles.total;
    case "fouls":
      return s.fouls.committed;
    case "yellow":
      return s.cards.yellow;
    case "passKey":
      return s.passes.key;
    case "rating":
      return s.games.rating ? Number(s.games.rating) : null;
  }
}

export interface HitRateRow {
  stat: StatKey;
  label: string;
  thresholds: { line: number; hits: number; total: number }[];
  /** Mean across games where the player got minutes (for context). */
  mean: number | null;
}

/**
 * Common prop lines per stat — what bettors actually see at sportsbooks.
 * Players who didn't appear (0 minutes) are excluded from denominators.
 */
const HIT_RATE_LINES: Record<StatKey, number[]> = {
  shots: [0.5, 1.5, 2.5, 3.5],
  sot: [0.5, 1.5, 2.5],
  goals: [0.5],
  assists: [0.5],
  tackles: [1.5, 2.5, 3.5],
  fouls: [0.5, 1.5, 2.5],
  yellow: [0.5],
  passKey: [0.5, 1.5, 2.5],
  minutes: [],
  rating: [],
};

export function computeHitRates(games: GameLogEntry[]): HitRateRow[] {
  const appeared = games.filter((g) => (g.stats.games.minutes ?? 0) > 0);
  return (Object.keys(HIT_RATE_LINES) as StatKey[])
    .filter((k) => HIT_RATE_LINES[k].length > 0)
    .map((stat) => {
      const values = appeared
        .map((g) => pickStat(g.stats, stat))
        .filter((v): v is number => v !== null);
      const mean = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
      const thresholds = HIT_RATE_LINES[stat].map((line) => {
        const hits = values.filter((v) => v > line).length;
        return { line, hits, total: values.length };
      });
      return { stat, label: STAT_LABEL[stat], thresholds, mean };
    });
}
