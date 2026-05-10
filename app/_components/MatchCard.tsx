import Image from "next/image";
import Link from "next/link";
import type { Fixture } from "../lib/api-football";

const LIVE = new Set(["1H", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const DONE = new Set(["FT", "AET", "PEN"]);
const CANCELLED = new Set(["PST", "CANC", "ABD", "AWD", "WO"]);

function StatusBadge({ status }: { status: Fixture["fixture"]["status"] }) {
  const { short, elapsed } = status;

  if (LIVE.has(short)) {
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {elapsed != null ? `${elapsed}'` : short}
      </span>
    );
  }
  if (short === "HT") {
    return <span className="text-yellow-400 text-xs font-medium">HT</span>;
  }
  if (DONE.has(short)) {
    return <span className="text-zinc-500 text-xs">{short}</span>;
  }
  if (CANCELLED.has(short)) {
    return <span className="text-red-400 text-xs">{short}</span>;
  }
  return null;
}

export default function MatchCard({ fixture }: { fixture: Fixture }) {
  const { teams, goals, fixture: { status, date } } = fixture;
  const isLive = LIVE.has(status.short) || status.short === "HT";
  const showScore = isLive || DONE.has(status.short);

  const matchTime = new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  return (
    <Link
      href={`/fixture/${fixture.fixture.id}`}
      prefetch={false}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors${isLive ? " ring-1 ring-emerald-500/30" : ""}`}
    >
      {/* Home */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span
          className={`text-sm truncate ${teams.home.winner === true ? "font-semibold text-white" : "text-zinc-300"}`}
        >
          {teams.home.name}
        </span>
        <Image
          src={teams.home.logo}
          alt={teams.home.name}
          width={20}
          height={20}
          className="shrink-0 object-contain"
        />
      </div>

      {/* Score / Time */}
      <div className="flex flex-col items-center min-w-[64px] gap-0.5">
        {showScore ? (
          <span className="text-sm font-bold text-white tabular-nums tracking-wide">
            {goals.home ?? 0} – {goals.away ?? 0}
          </span>
        ) : (
          <span className="text-sm text-zinc-400">{matchTime}</span>
        )}
        <StatusBadge status={status} />
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Image
          src={teams.away.logo}
          alt={teams.away.name}
          width={20}
          height={20}
          className="shrink-0 object-contain"
        />
        <span
          className={`text-sm truncate ${teams.away.winner === true ? "font-semibold text-white" : "text-zinc-300"}`}
        >
          {teams.away.name}
        </span>
      </div>
    </Link>
  );
}
