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

export interface ThresholdSummary {
  line: number;
  hits: number;
  total: number;
  /** Number of consecutive most-recent games (most recent first) that hit. */
  currentStreak: number;
}

export interface HitRateRow {
  stat: StatKey;
  label: string;
  thresholds: ThresholdSummary[];
  /** Mean per-game across games the player appeared in. */
  mean: number | null;
  /** Mean per-90 minutes (rate-normalized for partial appearances). */
  mean90: number | null;
  /** Subset hit rates for home and away games. */
  homeAway: {
    home: { thresholds: ThresholdSummary[]; mean: number | null };
    away: { thresholds: ThresholdSummary[]; mean: number | null };
  };
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

interface NumericGame {
  value: number;
  minutes: number;
  /** Game index — 0 = most recent. */
  recencyIndex: number;
}

function gameValues(games: GameLogEntry[], stat: StatKey): NumericGame[] {
  return games
    .map((g, i) => {
      const minutes = g.stats.games.minutes ?? 0;
      if (minutes === 0) return null;
      const v = pickStat(g.stats, stat);
      if (v === null) return null;
      return { value: v, minutes, recencyIndex: i };
    })
    .filter((x): x is NumericGame => x !== null);
}

function summarizeThresholds(
  values: NumericGame[],
  lines: number[]
): ThresholdSummary[] {
  // Recency-sorted (most recent first) for streak detection
  const byRecency = [...values].sort((a, b) => a.recencyIndex - b.recencyIndex);
  return lines.map((line) => {
    const hits = values.filter((v) => v.value > line).length;
    let streak = 0;
    for (const g of byRecency) {
      if (g.value > line) streak += 1;
      else break;
    }
    return { line, hits, total: values.length, currentStreak: streak };
  });
}

function meanOf(values: NumericGame[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b.value, 0) / values.length;
}

function meanPer90(values: NumericGame[]): number | null {
  const totalMin = values.reduce((s, v) => s + v.minutes, 0);
  if (totalMin === 0) return null;
  const totalVal = values.reduce((s, v) => s + v.value, 0);
  return (totalVal / totalMin) * 90;
}

export function computeHitRates(games: GameLogEntry[]): HitRateRow[] {
  const homeGames = games.filter((g) => g.isHome);
  const awayGames = games.filter((g) => !g.isHome);

  return (Object.keys(HIT_RATE_LINES) as StatKey[])
    .filter((k) => HIT_RATE_LINES[k].length > 0)
    .map((stat) => {
      const lines = HIT_RATE_LINES[stat];
      const all = gameValues(games, stat);
      const home = gameValues(homeGames, stat);
      const away = gameValues(awayGames, stat);
      return {
        stat,
        label: STAT_LABEL[stat],
        thresholds: summarizeThresholds(all, lines),
        mean: meanOf(all),
        mean90: stat === "rating" ? null : meanPer90(all),
        homeAway: {
          home: {
            thresholds: summarizeThresholds(home, lines),
            mean: meanOf(home),
          },
          away: {
            thresholds: summarizeThresholds(away, lines),
            mean: meanOf(away),
          },
        },
      };
    });
}

// ─── Player-level summary ────────────────────────────────────────────────────

export interface PlayerSummary {
  apps: number;
  starts: number;
  totalMinutes: number;
  avgMinutes: number | null;
  avgRating: number | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  position: string | null;
  /** Recent ratings (oldest → newest) for sparkline display. */
  ratingTrend: (number | null)[];
}

export function summarizePlayer(games: GameLogEntry[]): PlayerSummary {
  const appeared = games.filter((g) => (g.stats.games.minutes ?? 0) > 0);
  const starts = appeared.filter((g) => !g.stats.games.substitute).length;
  const totalMinutes = appeared.reduce(
    (s, g) => s + (g.stats.games.minutes ?? 0),
    0
  );
  const ratings = appeared
    .map((g) => (g.stats.games.rating ? Number(g.stats.games.rating) : null))
    .filter((v): v is number => v !== null);
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  // Reverse the chronologically-sorted (most-recent first) games into
  // chronological order for trend visualization (left = old, right = new).
  const trend = [...games]
    .reverse()
    .map((g) =>
      g.stats.games.rating ? Number(g.stats.games.rating) : null
    );

  return {
    apps: appeared.length,
    starts,
    totalMinutes,
    avgMinutes: appeared.length ? totalMinutes / appeared.length : null,
    avgRating,
    goals: appeared.reduce((s, g) => s + (g.stats.goals.total ?? 0), 0),
    assists: appeared.reduce((s, g) => s + (g.stats.goals.assists ?? 0), 0),
    yellowCards: appeared.reduce((s, g) => s + g.stats.cards.yellow, 0),
    redCards: appeared.reduce((s, g) => s + g.stats.cards.red, 0),
    position:
      appeared.find((g) => g.stats.games.position)?.stats.games.position ??
      null,
    ratingTrend: trend,
  };
}

// ─── Per-stat trend series for sparkline bars ────────────────────────────────

export interface TrendSeries {
  stat: StatKey;
  label: string;
  /** Chronological (oldest → newest); null for DNP games. */
  values: (number | null)[];
}

const TREND_STATS: StatKey[] = ["shots", "sot", "goals", "tackles", "passKey"];

export function computeTrendSeries(games: GameLogEntry[]): TrendSeries[] {
  const chrono = [...games].reverse();
  return TREND_STATS.map((stat) => ({
    stat,
    label: STAT_LABEL[stat],
    values: chrono.map((g) => {
      if ((g.stats.games.minutes ?? 0) === 0) return null;
      return pickStat(g.stats, stat);
    }),
  }));
}
