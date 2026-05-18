import type {
  HeadlineStat,
  HitRateRow,
  ThresholdSummary,
  Window,
  Venue,
} from "../lib/player-trends";
import { WINDOW_LABEL, VENUE_LABEL } from "../lib/player-trends";

function fmtAvg(stat: string, v: number | null): string {
  if (v === null) return "–";
  if (stat === "Min") return Math.round(v).toString();
  return v.toFixed(2);
}

function fmtDelta(stat: string, d: number | null): string {
  if (d === null) return "";
  const sign = d > 0 ? "+" : "";
  if (stat === "Min") return `${sign}${Math.round(d)}`;
  return `${sign}${d.toFixed(2)}`;
}

function deltaTone(d: number | null): string {
  if (d === null) return "text-zinc-700";
  if (Math.abs(d) < 0.05) return "text-zinc-500";
  return d > 0 ? "text-emerald-400" : "text-red-400";
}

function deltaArrow(d: number | null): string {
  if (d === null) return "";
  if (Math.abs(d) < 0.05) return "·";
  return d > 0 ? "↑" : "↓";
}

function StatTile({ s }: { s: HeadlineStat }) {
  return (
    <div className="rounded-xl bg-zinc-900 ring-1 ring-zinc-800 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
        {s.label}
      </p>
      <p className="text-2xl font-bold text-white tabular-nums leading-none">
        {fmtAvg(s.label, s.avg)}
      </p>
      <p
        className={`text-[11px] mt-1.5 tabular-nums font-medium ${deltaTone(s.delta)}`}
      >
        {deltaArrow(s.delta)} {fmtDelta(s.label, s.delta)}
      </p>
    </div>
  );
}

function pctClass(p: number): string {
  if (p >= 0.7) return "bg-emerald-400";
  if (p >= 0.5) return "bg-emerald-500/70";
  if (p >= 0.3) return "bg-zinc-500";
  return "bg-zinc-700";
}

function HitRateBar({
  label,
  t,
}: {
  label: string;
  t: ThresholdSummary;
}) {
  const pct = t.total > 0 ? t.hits / t.total : 0;
  const pctText = t.total > 0 ? `${Math.round(pct * 100)}%` : "–";
  return (
    <div className="grid grid-cols-[5rem_1fr_4.5rem] items-center gap-3">
      <span className="text-xs text-zinc-300 tabular-nums">
        {label} <span className="text-zinc-600">&gt;{t.line}</span>
      </span>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full ${pctClass(pct)}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-right">
        <span className="text-zinc-200 font-semibold">{pctText}</span>
        <span className="text-zinc-600 ml-1.5">
          {t.hits}/{t.total}
        </span>
        {t.currentStreak >= 3 && (
          <span className="text-emerald-400/80 ml-1.5 text-[10px]">
            ·{t.currentStreak}🔥
          </span>
        )}
      </span>
    </div>
  );
}

const PRIMARY_STATS = new Set(["Sh", "SoT", "G", "A"]);

function formatMeetingDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlayerSummaryPanel({
  headline,
  hitRates,
  window,
  venue,
  sampleSize,
  baselineLabel,
  h2h,
}: {
  headline: HeadlineStat[];
  hitRates: HitRateRow[];
  window: Window;
  venue: Venue;
  sampleSize: number;
  baselineLabel: string;
  /** Extra context shown when window === "vs". */
  h2h?: {
    opponentName: string | null;
    lastMeeting: string | null;
  };
}) {
  const primary = hitRates.filter((r) => PRIMARY_STATS.has(r.label));
  const smallSample = window === "vs" && sampleSize > 0 && sampleSize < 4;
  const noOpponent = window === "vs" && !h2h?.opponentName;

  return (
    <section className="rounded-2xl bg-zinc-950 ring-1 ring-zinc-800/80 p-4 space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">
          {WINDOW_LABEL[window]}
          {window === "vs" && h2h?.opponentName && (
            <span className="text-zinc-300 font-semibold">
              {" "}
              · {h2h.opponentName}
            </span>
          )}
          {venue !== "all" && (
            <span className="text-zinc-500 font-normal">
              {" "}
              · {VENUE_LABEL[venue]}
            </span>
          )}
          <span className="text-zinc-600 font-normal ml-2 text-xs">
            n={sampleSize}
          </span>
          {smallSample && (
            <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-medium align-middle">
              Small sample
            </span>
          )}
        </h2>
        <p className="text-[11px] text-zinc-600">
          {window === "vs" && h2h?.lastMeeting
            ? `Last meeting: ${formatMeetingDate(h2h.lastMeeting)}`
            : `Δ vs ${baselineLabel}`}
        </p>
      </div>

      {noOpponent ? (
        <p className="text-sm text-zinc-500 py-6 text-center">
          Pick an opponent from the dropdown above to see head-to-head numbers.
        </p>
      ) : sampleSize === 0 ? (
        <p className="text-sm text-zinc-500 py-6 text-center">
          {window === "vs"
            ? "No prior meetings vs this opponent in the fetched window."
            : "No appearances in this slice."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {headline.map((s) => (
              <StatTile key={s.key} s={s} />
            ))}
          </div>

          {primary.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                Prop hit rates
              </p>
              <div className="space-y-1.5">
                {primary.flatMap((row) =>
                  row.thresholds.map((t) => (
                    <HitRateBar
                      key={`${row.stat}-${t.line}`}
                      label={row.label}
                      t={t}
                    />
                  )),
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
