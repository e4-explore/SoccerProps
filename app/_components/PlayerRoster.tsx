import Image from "next/image";
import Link from "next/link";
import type { PlayerLogs } from "../lib/player-trends";
import { pickStat, type StatKey } from "../lib/player-trends";

const POSITION_RANK: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

interface RosterRow {
  player: PlayerLogs["player"];
  apps: number;
  minutes: number;
  position: string | null;
  totals: Partial<Record<StatKey, number>>;
}

function buildRow(logs: PlayerLogs): RosterRow {
  const apps = logs.games.filter((g) => (g.stats.games.minutes ?? 0) > 0).length;
  const minutes = logs.games.reduce(
    (sum, g) => sum + (g.stats.games.minutes ?? 0),
    0
  );
  const position =
    logs.games.find((g) => g.stats.games.position)?.stats.games.position ?? null;
  const totals: Partial<Record<StatKey, number>> = {};
  const cols: StatKey[] = ["shots", "sot", "goals", "assists", "tackles", "fouls", "yellow"];
  for (const col of cols) {
    totals[col] = logs.games.reduce((sum, g) => sum + (pickStat(g.stats, col) ?? 0), 0);
  }
  return { player: logs.player, apps, minutes, position, totals };
}

export default function PlayerRoster({
  league,
  team,
  logs,
  activePlayerId,
}: {
  league: number;
  team: number;
  logs: Map<number, PlayerLogs>;
  activePlayerId?: number;
}) {
  const rows = [...logs.values()].map(buildRow);
  rows.sort((a, b) => {
    const pa = POSITION_RANK[a.position ?? "Z"] ?? 9;
    const pb = POSITION_RANK[b.position ?? "Z"] ?? 9;
    if (pa !== pb) return pa - pb;
    return b.minutes - a.minutes;
  });

  if (rows.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        No player stats available for this team&rsquo;s recent fixtures.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 pl-3 pr-2">Player</th>
            <th className="text-center py-2 px-2 w-8">Pos</th>
            <th className="text-center py-2 px-2 w-10">Apps</th>
            <th className="text-center py-2 px-2 w-10">Min</th>
            <th className="text-center py-2 px-2 w-9">Sh</th>
            <th className="text-center py-2 px-2 w-9">SoT</th>
            <th className="text-center py-2 px-2 w-9">G</th>
            <th className="text-center py-2 px-2 w-9">A</th>
            <th className="text-center py-2 px-2 w-9">Tk</th>
            <th className="text-center py-2 px-2 w-9">Fls</th>
            <th className="text-center py-2 pl-2 pr-3 w-9">YC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const last = i === rows.length - 1;
            const active = r.player.id === activePlayerId;
            return (
              <tr
                key={r.player.id}
                className={`hover:bg-zinc-800/60 transition-colors ${last ? "" : "border-b border-zinc-800/40"} ${active ? "bg-emerald-500/10" : ""}`}
              >
                <td className="py-2 pl-3 pr-2">
                  <Link
                    href={`/players?league=${league}&team=${team}&player=${r.player.id}`}
                    prefetch={false}
                    className="flex items-center gap-2"
                  >
                    {r.player.photo && (
                      <Image
                        src={r.player.photo}
                        alt={r.player.name}
                        width={20}
                        height={20}
                        className="rounded-full bg-zinc-800 object-cover"
                      />
                    )}
                    <span
                      className={`text-xs truncate max-w-[160px] ${active ? "text-white font-medium" : "text-zinc-300"}`}
                    >
                      {r.player.name}
                    </span>
                  </Link>
                </td>
                <td className="py-2 px-2 text-center text-zinc-500 text-xs">
                  {r.position ?? "–"}
                </td>
                <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                  {r.apps}
                </td>
                <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                  {r.minutes}
                </td>
                <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                  {r.totals.shots ?? 0}
                </td>
                <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                  {r.totals.sot ?? 0}
                </td>
                <td className="py-2 px-2 text-center text-emerald-400 text-xs tabular-nums">
                  {r.totals.goals ?? 0}
                </td>
                <td className="py-2 px-2 text-center text-emerald-400 text-xs tabular-nums">
                  {r.totals.assists ?? 0}
                </td>
                <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                  {r.totals.tackles ?? 0}
                </td>
                <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                  {r.totals.fouls ?? 0}
                </td>
                <td className="py-2 pl-2 pr-3 text-center text-yellow-400 text-xs tabular-nums">
                  {r.totals.yellow ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
