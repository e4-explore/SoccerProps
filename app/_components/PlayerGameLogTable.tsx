import Image from "next/image";
import {
  pickGameStat,
  STAT_LABEL,
  type GameLogEntry,
  type StatKey,
} from "../lib/player-trends";

const COLUMNS: StatKey[] = [
  "minutes",
  "shots",
  "sot",
  "goals",
  "xg",
  "assists",
  "xa",
  "tackles",
  "fouls",
  "yellow",
  "passKey",
  "rating",
];

function fmt(stat: StatKey, value: number | null): string {
  if (value === null) return "–";
  if (stat === "rating") return value.toFixed(1);
  if (stat === "xg" || stat === "xa") return value.toFixed(2);
  return String(value);
}

export default function PlayerGameLogTable({
  games,
}: {
  games: GameLogEntry[];
}) {
  const filtered = games;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-zinc-900 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 3} className="py-8 text-center text-zinc-500 text-xs">
                  No matches in this slice.
                </td>
              </tr>
            ) : (
              filtered.map((g, i) => {
                const isLast = i === filtered.length - 1;
                const dateLabel = new Date(g.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                const dnp = (g.stats.games.minutes ?? 0) === 0;
                const sub = !dnp && g.stats.games.substitute;
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
                    className={`${isLast ? "" : "border-b border-zinc-800/40"} ${dnp ? "opacity-40" : sub ? "opacity-75" : ""}`}
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
                        {sub && (
                          <span className="text-[10px] text-zinc-600 ml-0.5">SUB</span>
                        )}
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
                      const v = pickGameStat(g, c);
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
