import type { HitRateRow } from "../lib/player-trends";

interface StreakItem {
  label: string;
  detail: string;
  tone: "hot" | "cold" | "neutral";
}

const TONE: Record<StreakItem["tone"], string> = {
  hot: "bg-emerald-500/10 ring-emerald-500/40 text-emerald-300",
  cold: "bg-red-500/5 ring-red-500/30 text-red-300",
  neutral: "bg-zinc-900 ring-zinc-800 text-zinc-300",
};

function buildStreaks(rows: HitRateRow[]): StreakItem[] {
  const items: StreakItem[] = [];
  for (const row of rows) {
    for (const t of row.thresholds) {
      if (t.total < 3) continue;
      // Highlight: 3+ in a row hit, or hit rate ≥75% with sample, or 0 hits in 4+ tries (cold).
      if (t.currentStreak >= 3) {
        items.push({
          label: `${row.label} O${t.line}`,
          detail: `${t.currentStreak} games in a row`,
          tone: "hot",
        });
      } else if (t.total >= 5 && t.hits === 0) {
        items.push({
          label: `${row.label} O${t.line}`,
          detail: `0/${t.total} — cold`,
          tone: "cold",
        });
      } else if (t.total >= 5 && t.hits / t.total >= 0.8) {
        items.push({
          label: `${row.label} O${t.line}`,
          detail: `${t.hits}/${t.total} season`,
          tone: "hot",
        });
      }
    }
  }
  // Cap and sort: hot first, then cold
  const hot = items.filter((i) => i.tone === "hot");
  const cold = items.filter((i) => i.tone === "cold");
  return [...hot, ...cold].slice(0, 8);
}

export default function PlayerStreaks({ rows }: { rows: HitRateRow[] }) {
  const items = buildStreaks(rows);

  if (items.length === 0) {
    return (
      <p className="text-xs text-zinc-600">
        No standout streaks in this sample.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <div
          key={i}
          className={`rounded-lg ring-1 px-3 py-2 ${TONE[it.tone]}`}
        >
          <p className="text-xs font-semibold">{it.label}</p>
          <p className="text-[11px] opacity-80 mt-0.5">{it.detail}</p>
        </div>
      ))}
    </div>
  );
}
