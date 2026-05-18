import {
  getTeamSeasonFixtures,
  getFixturePlayerStats,
  type Fixture,
  type PlayerLite,
  type PlayerStatLine,
} from "./api-football";
import { getPlayerMatches } from "./understat";
import { understatIdFor } from "./understat-player-map";

const FINISHED = new Set(["FT", "AET", "PEN"]);
const SCHEDULED = new Set(["NS", "TBD", "PST"]);

export interface GameLogEntry {
  fixtureId: number;
  date: string; // ISO
  opponent: { id: number; name: string; logo: string };
  isHome: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  stats: PlayerStatLine;
  /** Expected goals for this appearance (Understat). null = no mapping or no match. */
  xg: number | null;
  /** Expected assists for this appearance (Understat). null = no mapping or no match. */
  xa: number | null;
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
): Promise<{
  fixtures: Fixture[];
  upcoming: Fixture[];
  logs: Map<number, PlayerLogs>;
}> {
  const all = await getTeamSeasonFixtures(teamId, season);
  const finished = all
    .filter((f) => FINISHED.has(f.fixture.status.short))
    .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date))
    .slice(0, last);
  const upcoming = all
    .filter((f) => SCHEDULED.has(f.fixture.status.short))
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));

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
        xg: null,
        xa: null,
      });
      logs.set(entry.player.id, existing);
    }
  }

  for (const v of logs.values()) {
    v.games.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Merge per-match xG/xA from Understat for any player that has a mapping.
  // Failures here are non-fatal: the page still renders without xG/xA.
  await Promise.allSettled(
    [...logs.entries()].map(async ([apiFootballId, playerLogs]) => {
      const understatId = understatIdFor(apiFootballId);
      if (understatId === undefined) return;
      try {
        const matches = await getPlayerMatches(understatId);
        const byDate = new Map(matches.map((m) => [m.date, m]));
        for (const g of playerLogs.games) {
          const key = g.date.slice(0, 10);
          const u = byDate.get(key);
          if (u) {
            g.xg = u.xg;
            g.xa = u.xa;
          }
        }
      } catch {
        // Understat fetch failed — leave xg/xa as null. UI shows "–".
      }
    }),
  );

  return { fixtures: finished, upcoming, logs };
}

// ─── Stat selectors & hit-rate math ──────────────────────────────────────────

export type StatKey =
  | "minutes"
  | "shots"
  | "sot"
  | "goals"
  | "xg"
  | "assists"
  | "xa"
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
  xg: "xG",
  assists: "A",
  xa: "xA",
  tackles: "Tk",
  fouls: "Fls",
  yellow: "YC",
  passKey: "KP",
  rating: "Rtg",
};

/**
 * Stat selector for keys that live on the API-Football PlayerStatLine. Returns
 * null for keys that don't live there (xg/xa). Use `pickGameStat` if you need
 * the full set including xG/xA.
 */
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
    case "xg":
    case "xa":
      return null;
  }
}

/**
 * Stat selector that knows about xG/xA (which live on GameLogEntry, not on
 * PlayerStatLine). Use this in any aggregation that should include xG/xA.
 */
export function pickGameStat(g: GameLogEntry, key: StatKey): number | null {
  if (key === "xg") return g.xg;
  if (key === "xa") return g.xa;
  return pickStat(g.stats, key);
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
  xg: [0.15, 0.3, 0.5],
  xa: [0.15, 0.3, 0.5],
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
      const v = pickGameStat(g, stat);
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

// ─── Window & venue slicing (props-research toggles) ────────────────────────

export type Window = "last5" | "last10" | "last20" | "season" | "vs";
export type Venue = "all" | "home" | "away" | "starts";

export const WINDOW_LABEL: Record<Window, string> = {
  last5: "Last 5",
  last10: "Last 10",
  last20: "Last 20",
  season: "Season",
  vs: "vs Opp",
};

export const VENUE_LABEL: Record<Venue, string> = {
  all: "All",
  home: "Home",
  away: "Away",
  starts: "Starts",
};

const WINDOW_SIZE: Record<Window, number | null> = {
  last5: 5,
  last10: 10,
  last20: 20,
  season: null,
  vs: null,
};

/**
 * Slice the most-recent-first game log by venue, opponent, then window. Venue
 * + opponent filter first so "last 5 home" / "vs ARS" mean what you'd expect.
 * When window === "vs", we ignore the size limit and return every matching
 * meeting (H2H samples are tiny — show them all).
 */
export function sliceGames(
  games: GameLogEntry[],
  window: Window,
  venue: Venue = "all",
  opponentId?: number,
): GameLogEntry[] {
  let pool = games.filter((g) => {
    if (venue === "home") return g.isHome;
    if (venue === "away") return !g.isHome;
    if (venue === "starts")
      return !g.stats.games.substitute && (g.stats.games.minutes ?? 0) > 0;
    return true;
  });
  if (window === "vs") {
    if (opponentId === undefined) return [];
    pool = pool.filter((g) => g.opponent.id === opponentId);
  }
  const n = WINDOW_SIZE[window];
  return n === null ? pool : pool.slice(0, n);
}

// ─── H2H helpers ──────────────────────────────────────────────────────────────

export interface OpponentMeta {
  id: number;
  name: string;
  logo: string;
  meetings: number;
  lastMeeting: string | null;
}

/**
 * Unique opponents the player's team has faced in the fetched window, sorted
 * by most-played descending then alphabetically. Drives the H2H opponent picker.
 */
export function getOpponentsPlayed(games: GameLogEntry[]): OpponentMeta[] {
  const map = new Map<number, OpponentMeta>();
  for (const g of games) {
    const existing = map.get(g.opponent.id);
    if (existing) {
      existing.meetings += 1;
      if (!existing.lastMeeting || g.date > existing.lastMeeting) {
        existing.lastMeeting = g.date;
      }
    } else {
      map.set(g.opponent.id, {
        id: g.opponent.id,
        name: g.opponent.name,
        logo: g.opponent.logo,
        meetings: 1,
        lastMeeting: g.date,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name),
  );
}

// ─── Headline stats with deltas vs baseline ──────────────────────────────────

export interface HeadlineStat {
  key: StatKey;
  label: string;
  /** Per-game average in the filtered window. null if no appearances. */
  avg: number | null;
  /** avg − baselineAvg. null if either side missing. */
  delta: number | null;
}

const HEADLINE_STATS: StatKey[] = [
  "shots",
  "sot",
  "goals",
  "xg",
  "assists",
  "xa",
  "minutes",
];

function avgOf(games: GameLogEntry[], key: StatKey): number | null {
  const values = games
    .filter((g) => (g.stats.games.minutes ?? 0) > 0)
    .map((g) => pickGameStat(g, key))
    .filter((v): v is number => v !== null);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeHeadlineStats(
  games: GameLogEntry[],
  baseline: GameLogEntry[]
): HeadlineStat[] {
  return HEADLINE_STATS.map((key) => {
    const cur = avgOf(games, key);
    const base = avgOf(baseline, key);
    return {
      key,
      label: STAT_LABEL[key],
      avg: cur,
      delta: cur !== null && base !== null ? cur - base : null,
    };
  });
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
      return pickGameStat(g, stat);
    }),
  }));
}
