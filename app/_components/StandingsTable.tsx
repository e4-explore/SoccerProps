import Image from "next/image";
import Link from "next/link";
import type { StandingRow } from "../lib/api-football";

const ZONE_COLOR: Record<string, string> = {
  "Champions League": "bg-blue-500",
  "Europa League": "bg-orange-500",
  "Europa Conference League": "bg-emerald-500",
  Relegation: "bg-red-500",
};

function zoneColor(description: string | null): string | null {
  if (!description) return null;
  for (const [key, color] of Object.entries(ZONE_COLOR)) {
    if (description.includes(key)) return color;
  }
  return null;
}

export default function StandingsTable({
  rows,
  league,
}: {
  rows: StandingRow[];
  league: number;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 pl-3 pr-2 w-8">#</th>
            <th className="text-left py-2 px-2">Club</th>
            <th className="text-center py-2 px-2 w-7">P</th>
            <th className="text-center py-2 px-2 w-7">W</th>
            <th className="text-center py-2 px-2 w-7">D</th>
            <th className="text-center py-2 px-2 w-7">L</th>
            <th className="text-center py-2 px-2 w-8">GD</th>
            <th className="text-center py-2 pl-2 pr-3 w-8">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const zone = zoneColor(row.description);
            const isLast = i === rows.length - 1;
            return (
              <tr
                key={row.team.id}
                className={`hover:bg-zinc-800/60 transition-colors${isLast ? "" : " border-b border-zinc-800/40"}`}
              >
                <td className="py-2 pl-3 pr-2">
                  <div className="flex items-center gap-1.5">
                    {zone && (
                      <div className={`w-0.5 h-4 rounded-full ${zone}`} />
                    )}
                    <span className="text-zinc-500 tabular-nums text-xs w-4">
                      {row.rank}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  <Link
                    href={`/players?league=${league}&team=${row.team.id}`}
                    prefetch={false}
                    className="flex items-center gap-2 hover:text-emerald-300 transition-colors"
                  >
                    <Image
                      src={row.team.logo}
                      alt={row.team.name}
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                    <span className="text-white text-xs font-medium truncate max-w-[100px]">
                      {row.team.name}
                    </span>
                  </Link>
                </td>
                <td className="py-2 px-2 text-center text-zinc-400 text-xs tabular-nums">
                  {row.all.played}
                </td>
                <td className="py-2 px-2 text-center text-zinc-400 text-xs tabular-nums">
                  {row.all.win}
                </td>
                <td className="py-2 px-2 text-center text-zinc-400 text-xs tabular-nums">
                  {row.all.draw}
                </td>
                <td className="py-2 px-2 text-center text-zinc-400 text-xs tabular-nums">
                  {row.all.lose}
                </td>
                <td className="py-2 px-2 text-center text-xs tabular-nums">
                  <span
                    className={
                      row.goalsDiff > 0
                        ? "text-emerald-400"
                        : row.goalsDiff < 0
                          ? "text-red-400"
                          : "text-zinc-500"
                    }
                  >
                    {row.goalsDiff > 0 ? "+" : ""}
                    {row.goalsDiff}
                  </span>
                </td>
                <td className="py-2 pl-2 pr-3 text-center text-white text-xs font-bold tabular-nums">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
