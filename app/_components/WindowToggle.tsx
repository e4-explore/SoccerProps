import Link from "next/link";
import Image from "next/image";
import { BreadcrumbDropdown } from "./BreadcrumbDropdown";
import {
  WINDOW_LABEL,
  VENUE_LABEL,
  type Window,
  type Venue,
  type OpponentMeta,
} from "../lib/player-trends";

const WINDOWS: Window[] = ["last5", "last10", "last20", "season", "vs"];
const VENUES: Venue[] = ["all", "home", "away", "starts"];

function buildHref(
  basePath: string,
  window: Window,
  venue: Venue,
  opponentId?: number,
): string {
  const qs = new URLSearchParams();
  if (window !== "last10") qs.set("window", window);
  if (venue !== "all") qs.set("venue", venue);
  if (window === "vs" && opponentId !== undefined) {
    qs.set("opponent", String(opponentId));
  }
  const q = qs.toString();
  return q ? `${basePath}?${q}` : basePath;
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
        active
          ? "bg-emerald-500 text-zinc-950 font-semibold"
          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
    >
      {children}
    </Link>
  );
}

export default function WindowToggle({
  basePath,
  window,
  venue,
  sampleSize,
  opponentId,
  opponents,
  currentOpponent,
}: {
  basePath: string;
  window: Window;
  venue: Venue;
  sampleSize: number;
  opponentId?: number;
  /** Opponents the player has faced in the fetched window. */
  opponents: OpponentMeta[];
  /** Resolved opponent (for the inline label). */
  currentOpponent?: OpponentMeta;
}) {
  const opponentDropdownOptions = opponents.map((o) => ({
    href: buildHref(basePath, "vs", venue, o.id),
    label: `${o.name} · ${o.meetings} ${o.meetings === 1 ? "meeting" : "meetings"}`,
    logo: o.logo,
    active: o.id === opponentId,
  }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-zinc-600 mr-1">
          Window
        </span>
        {WINDOWS.map((w) => {
          // For "vs", preserve the current opponent in the URL so toggling
          // back to vs after browsing season/last5 keeps the picked opponent.
          const opp = w === "vs" ? opponentId : undefined;
          return (
            <Chip
              key={w}
              href={buildHref(basePath, w, venue, opp)}
              active={w === window}
            >
              {WINDOW_LABEL[w]}
            </Chip>
          );
        })}
        <span className="text-xs text-zinc-600 ml-1 tabular-nums">
          n={sampleSize}
        </span>
      </div>

      {window === "vs" && (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-600">
            Opponent
          </span>
          {currentOpponent ? (
            <span className="flex items-center gap-1.5 text-xs text-zinc-300">
              <Image
                src={currentOpponent.logo}
                alt=""
                width={14}
                height={14}
                className="object-contain"
              />
              <span className="font-medium">{currentOpponent.name}</span>
            </span>
          ) : (
            <span className="text-xs text-zinc-500 italic">none selected</span>
          )}
          {opponents.length > 0 && (
            <BreadcrumbDropdown
              label={currentOpponent ? "swap" : "pick"}
              options={opponentDropdownOptions}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-zinc-600 mr-1">
          Venue
        </span>
        {VENUES.map((v) => (
          <Chip
            key={v}
            href={buildHref(basePath, window, v, opponentId)}
            active={v === venue}
          >
            {VENUE_LABEL[v]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
