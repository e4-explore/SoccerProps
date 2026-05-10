import type { HitRateRow, ThresholdSummary } from "../lib/player-trends";

function pct(hits: number, total: number): string {
  if (total === 0) return "–";
  return `${Math.round((hits / total) * 100)}%`;
}

function pctClass(hits: number, total: number): string {
  if (total === 0) return "text-zinc-700";
  const p = hits / total;
  if (p >= 0.7) return "text-emerald-400";
  if (p >= 0.5) return "text-emerald-500/70";
  if (p >= 0.3) return "text-zinc-400";
  return "text-zinc-600";
}

function ThresholdCell({ t }: { t: ThresholdSummary }) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-baseline gap-1.5">
        <span className="text-zinc-500 text-xs">O{t.line}</span>
        <span className={`${pctClass(t.hits, t.total)} font-semibold tabular-nums text-xs`}>
          {pct(t.hits, t.total)}
        </span>
      </div>
      <div className="text-[10px] text-zinc-600 tabular-nums">
        {t.hits}/{t.total}
        {t.currentStreak > 1 && (
          <span className="ml-1 text-emerald-400/80">· {t.currentStreak} in a row</span>
        )}
      </div>
    </div>
  );
}

export default function PlayerSplitsTable({ rows }: { rows: HitRateRow[] }) {
  return (
    <div className="rounded-xl bg-zinc-900 overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 pl-3 pr-2 w-14">Stat</th>
            <th className="text-right py-2 px-2 w-14">Avg</th>
            <th className="text-right py-2 px-2 w-14">Per 90</th>
            <th className="text-left py-2 px-2">Over lines</th>
            <th className="text-left py-2 px-2 w-32">
              Home <span className="text-zinc-700">vs</span> Away
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const last = i === rows.length - 1;
            const homeBest = row.homeAway.home.thresholds[0];
            const awayBest = row.homeAway.away.thresholds[0];
            return (
              <tr
                key={row.stat}
                className={last ? "" : "border-b border-zinc-800/40"}
              >
                <td className="py-2.5 pl-3 pr-2 text-zinc-300 text-xs font-medium">
                  {row.label}
                </td>
                <td className="py-2.5 px-2 text-right text-white text-xs tabular-nums">
                  {row.mean !== null ? row.mean.toFixed(2) : "–"}
                </td>
                <td className="py-2.5 px-2 text-right text-zinc-400 text-xs tabular-nums">
                  {row.mean90 !== null ? row.mean90.toFixed(2) : "–"}
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {row.thresholds.map((t) => (
                      <ThresholdCell key={t.line} t={t} />
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-xs">
                  {homeBest && awayBest ? (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={pctClass(homeBest.hits, homeBest.total) + " font-semibold tabular-nums"}>
                          {pct(homeBest.hits, homeBest.total)}
                        </span>
                        <span className="text-zinc-600 text-[10px] block tabular-nums">
                          {homeBest.hits}/{homeBest.total} H
                        </span>
                      </div>
                      <span className="text-zinc-700">·</span>
                      <div>
                        <span className={pctClass(awayBest.hits, awayBest.total) + " font-semibold tabular-nums"}>
                          {pct(awayBest.hits, awayBest.total)}
                        </span>
                        <span className="text-zinc-600 text-[10px] block tabular-nums">
                          {awayBest.hits}/{awayBest.total} A
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-600">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-zinc-800/60 text-[11px] text-zinc-600">
        Home/Away column shows the lowest line (most likely hit) for quick scanning. Streaks count consecutive most-recent appearances over the line.
      </div>
    </div>
  );
}
