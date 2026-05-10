import Image from "next/image";
import {
  pickStat,
  computeHitRates,
  STAT_LABEL,
  type GameLogEntry,
  type StatKey,
} from "../lib/player-trends";
import type { PlayerLite } from "../lib/api-football";

const COLUMNS: StatKey[] = [
  "minutes",
  "shots",
  "sot",
  "goals",
  "assists",
  "tackles",
  "fouls",
  "yellow",
  "passKey",
  "rating",
];

function fmt(stat: StatKey, value: number | null): string {
  if (value === null) return "–";
  if (stat === "rating") return value.toFixed(1);
  return String(value);
}

function pct(hits: number, total: number): string {
  if (total === 0) return "–";
  return `${Math.round((hits / total) * 100)}%`;
}

function pctClass(hits: number, total: number): string {
  if (total === 0) return "text-zinc-600";
  const p = hits / total;
  if (p >= 0.7) return "text-emerald-400";
  if (p >= 0.5) return "text-emerald-500/70";
  if (p >= 0.3) return "text-zinc-400";
  return "text-zinc-600";
}

export default function PlayerGameLog({
  player,
  games,
}: {
  player: PlayerLite;
  games: GameLogEntry[];
}) {
  const appeared = games.filter((g) => (g.stats.games.minutes ?? 0) > 0);
  const hitRates = computeHitRates(games);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {player.photo && (
          <Image
            src={player.photo}
            alt={player.name}
            width={56}
            height={56}
            className="rounded-full bg-zinc-900 object-cover"
          />
        )}
        <div>
          <h2 className="text-xl font-bold text-white">{player.name}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Last {games.length} matches · {appeared.length} appearances
          </p>
        </div>
      </div>

      {/* Hit rates */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Hit rates ({appeared.length}-game sample)
        </h3>
        <div className="rounded-xl bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left py-2 pl-3 pr-2 w-16">Stat</th>
                <th className="text-center py-2 px-2 w-14">Avg</th>
                <th className="text-left py-2 px-2">Over lines</th>
              </tr>
            </thead>
            <tbody>
              {hitRates.map((row, i) => {
                const last = i === hitRates.length - 1;
                return (
                  <tr
                    key={row.stat}
                    className={last ? "" : "border-b border-zinc-800/40"}
                  >
                    <td className="py-2 pl-3 pr-2 text-zinc-300 text-xs font-medium">
                      {row.label}
                    </td>
                    <td className="py-2 px-2 text-center text-white text-xs tabular-nums">
                      {row.mean !== null ? row.mean.toFixed(2) : "–"}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-2">
                        {row.thresholds.map(({ line, hits, total }) => (
                          <span
                            key={line}
                            className="text-xs flex items-baseline gap-1.5"
                          >
                            <span className="text-zinc-500">O{line}</span>
                            <span
                              className={`${pctClass(hits, total)} font-semibold tabular-nums`}
                            >
                              {pct(hits, total)}
                            </span>
                            <span className="text-zinc-600 tabular-nums">
                              ({hits}/{total})
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Game log */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Game log
        </h3>
        <div className="rounded-xl bg-zinc-900 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left py-2 pl-3 pr-2">Date</th>
                <th className="text-left py-2 px-2">Opp</th>
                <th className="text-center py-2 px-2 w-12">Result</th>
                {COLUMNS.map((c) => (
                  <th key={c} className="text-center py-2 px-2 w-10">
                    {STAT_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => {
                const isLast = i === games.length - 1;
                const dateLabel = new Date(g.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                const dnp = (g.stats.games.minutes ?? 0) === 0;
                const result =
                  g.goalsFor != null && g.goalsAgainst != null
                    ? `${g.goalsFor}-${g.goalsAgainst}`
                    : "–";
                const won =
                  g.goalsFor != null &&
                  g.goalsAgainst != null &&
                  g.goalsFor > g.goalsAgainst;
                const lost =
                  g.goalsFor != null &&
                  g.goalsAgainst != null &&
                  g.goalsFor < g.goalsAgainst;

                return (
                  <tr
                    key={g.fixtureId}
                    className={`${isLast ? "" : "border-b border-zinc-800/40"} ${dnp ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 pl-3 pr-2 text-zinc-400 text-xs">
                      {dateLabel}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-600 text-xs">
                          {g.isHome ? "vs" : "@"}
                        </span>
                        <Image
                          src={g.opponent.logo}
                          alt={g.opponent.name}
                          width={14}
                          height={14}
                          className="object-contain"
                        />
                        <span className="text-zinc-300 text-xs truncate max-w-[100px]">
                          {g.opponent.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center text-xs tabular-nums">
                      <span
                        className={
                          won
                            ? "text-emerald-400"
                            : lost
                              ? "text-red-400"
                              : "text-zinc-500"
                        }
                      >
                        {result}
                      </span>
                    </td>
                    {COLUMNS.map((c) => {
                      const v = pickStat(g.stats, c);
                      return (
                        <td
                          key={c}
                          className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums"
                        >
                          {fmt(c, v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
