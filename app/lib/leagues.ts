export interface LeagueMeta {
  id: number;
  name: string;
  shortName: string;
  country: string;
  /** "europe" = Aug→May seasons; "calendar" = Jan→Dec seasons */
  calendar: "europe" | "calendar";
}

export const LEAGUES: LeagueMeta[] = [
  { id: 39, name: "Premier League", shortName: "EPL", country: "England", calendar: "europe" },
  { id: 140, name: "La Liga", shortName: "La Liga", country: "Spain", calendar: "europe" },
  { id: 135, name: "Serie A", shortName: "Serie A", country: "Italy", calendar: "europe" },
  { id: 78, name: "Bundesliga", shortName: "Bundesliga", country: "Germany", calendar: "europe" },
  { id: 61, name: "Ligue 1", shortName: "Ligue 1", country: "France", calendar: "europe" },
  { id: 2, name: "Champions League", shortName: "UCL", country: "Europe", calendar: "europe" },
  { id: 3, name: "Europa League", shortName: "UEL", country: "Europe", calendar: "europe" },
  { id: 88, name: "Eredivisie", shortName: "Eredivisie", country: "Netherlands", calendar: "europe" },
  { id: 94, name: "Primeira Liga", shortName: "Primeira", country: "Portugal", calendar: "europe" },
  { id: 253, name: "MLS", shortName: "MLS", country: "USA", calendar: "calendar" },
  { id: 71, name: "Brasileirão", shortName: "Brasileirão", country: "Brazil", calendar: "calendar" },
  { id: 307, name: "Saudi Pro League", shortName: "SPL", country: "Saudi Arabia", calendar: "europe" },
];

export const LEAGUES_BY_ID = new Map(LEAGUES.map((l) => [l.id, l]));

/**
 * The free API-Football tier only exposes seasons 2022–2024. We clamp the
 * default season to FREE_TIER_MAX so the page works out of the box; users can
 * still override via the `season` URL param if they upgrade.
 */
export const FREE_TIER_MAX_SEASON = 2024;

/**
 * Default season (year of season-start) for a league based on today's date,
 * clamped to the free-tier max. European leagues run Aug→May, so season =
 * current year if month ≥ 7, else year - 1. Calendar leagues use current year.
 */
export function currentSeason(leagueId: number, today = new Date()): number {
  const meta = LEAGUES_BY_ID.get(leagueId);
  const y = today.getUTCFullYear();
  const natural =
    !meta || meta.calendar === "europe"
      ? today.getUTCMonth() >= 6 ? y : y - 1
      : y;
  return Math.min(natural, FREE_TIER_MAX_SEASON);
}
