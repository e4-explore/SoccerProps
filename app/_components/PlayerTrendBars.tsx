import type { TrendSeries } from "../lib/player-trends";

function Sparkline({ values }: { values: (number | null)[] }) {
  if (values.length === 0) {
    return <div className="h-12 text-xs text-zinc-600">No data</div>;
  }

  const numeric = values.filter((v): v is number => v !== null);
  const max = Math.max(1, ...numeric);
  const width = 100;
  const height = 36;
  const barW = width / values.length;
  const gap = barW * 0.18;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-12"
      role="img"
      aria-label="Per-game trend"
    >
      {values.map((v, i) => {
        if (v === null) {
          // DNP marker — small dash at baseline
          return (
            <rect
              key={i}
              x={i * barW + gap / 2}
              y={height - 1}
              width={barW - gap}
              height={1}
              className="fill-zinc-700"
            />
          );
        }
        const h = Math.max(1, (v / max) * (height - 4));
        return (
          <rect
            key={i}
            x={i * barW + gap / 2}
            y={height - h}
            width={barW - gap}
            height={h}
            className="fill-emerald-400/80"
          />
        );
      })}
    </svg>
  );
}

export default function PlayerTrendBars({ series }: { series: TrendSeries[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
      {series.map((s) => {
        const numeric = s.values.filter((v): v is number => v !== null);
        const last = numeric.length > 0 ? numeric[numeric.length - 1] : null;
        const recentAvg =
          numeric.length > 0
            ? numeric.reduce((a, b) => a + b, 0) / numeric.length
            : null;
        return (
          <div
            key={s.stat}
            className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 px-3 py-3"
          >
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                {s.label}
              </p>
              <p className="text-xs text-zinc-500 tabular-nums">
                {recentAvg !== null ? recentAvg.toFixed(2) : "–"} avg
              </p>
            </div>
            <Sparkline values={s.values} />
            <div className="mt-1 flex items-baseline justify-between text-[10px] text-zinc-600">
              <span>oldest</span>
              <span>last: {last !== null ? last : "–"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
