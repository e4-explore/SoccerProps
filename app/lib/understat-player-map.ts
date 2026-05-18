/**
 * Manual mapping from API-Football player IDs to Understat player IDs.
 *
 * Why this is manual: Understat doesn't expose a clean cross-provider lookup,
 * and fuzzy-matching by name across providers is noisy (transfers, accents,
 * "Rodrigo" collisions). For a personal research tool, hand-maintaining a
 * dozen-or-so entries for the players you actually research is faster than
 * building a matcher.
 *
 * To add a player:
 *   1. On api-football, find the player's numeric ID (it's in the URL on this
 *      app's player page: /player/[league]/[team]/[playerId]).
 *   2. On understat.com, search the player and grab the numeric ID from the
 *      URL: https://understat.com/player/{id}.
 *   3. Add a line below.
 *
 * Notes:
 *   - Understat only covers EPL, La Liga, Serie A, Bundesliga, Ligue 1. Players
 *     in UCL/UEL/Eredivisie/Primeira/MLS/Brasileirão/Saudi won't have entries.
 *   - When a mapping is missing, the page falls back to dashes for xG/xA — no
 *     error.
 */
export const UNDERSTAT_PLAYER_MAP: Record<number, number> = {
  // Examples — replace/extend as needed:
  // 306: 1250,   // Mohamed Salah (api-football → understat)
  // 874: 318,    // Cristiano Ronaldo
  // 154: 2371,   // Kylian Mbappé
};

export function understatIdFor(apiFootballPlayerId: number): number | undefined {
  return UNDERSTAT_PLAYER_MAP[apiFootballPlayerId];
}
