import Image from "next/image";
import Link from "next/link";
import type { FixturePlayersTeamGroup } from "../lib/api-football";

const POSITION_RANK: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

function n(v: number | null | undefined): string {
  return v == null ? "–" : String(v);
}

export default function FixtureRoster({
  group,
  league,
  align = "left",
}: {
  group: FixturePlayersTeamGroup;
  league: number;
  align?: "left" | "right";
}) {
  const sorted = [...group.players].sort((a, b) => {
    const sa = a.statistics?.[0];
    const sb = b.statistics?.[0];
    const subA = sa?.games.substitute ? 1 : 0;
    const subB = sb?.games.substitute ? 1 : 0;
    if (subA !== subB) return subA - subB; // starters first
    const pa = POSITION_RANK[sa?.games.position ?? "Z"] ?? 9;
    const pb = POSITION_RANK[sb?.games.position ?? "Z"] ?? 9;
    if (pa !== pb) return pa - pb;
    return (sb?.games.minutes ?? 0) - (sa?.games.minutes ?? 0);
  });

  return (
    <div className="rounded-xl bg-zinc-900 overflow-hidden">
      <div
        className={`flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
      >
        <Image
          src={group.team.logo}
          alt={group.team.name}
          width={20}
          height={20}
          className="object-contain"
        />
        <Link
          href={`/players?league=${league}&team=${group.team.id}`}
          prefetch={false}
          className="text-sm font-semibold text-white hover:text-emerald-300 transition-colors"
        >
          {group.team.name}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
              <th className="text-left py-2 pl-3 pr-2">Player</th>
              <th className="text-center py-2 px-2 w-9">Min</th>
              <th className="text-center py-2 px-2 w-9">Sh</th>
              <th className="text-center py-2 px-2 w-9">SoT</th>
              <th className="text-center py-2 px-2 w-9">G</th>
              <th className="text-center py-2 px-2 w-9">A</th>
              <th className="text-center py-2 px-2 w-9">Tk</th>
              <th className="text-center py-2 px-2 w-9">Fls</th>
              <th className="text-center py-2 px-2 w-9">YC</th>
              <th className="text-center py-2 pl-2 pr-3 w-10">Rtg</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const s = p.statistics?.[0];
              const last = i === sorted.length - 1;
              const sub = s?.games.substitute;
              return (
                <tr
                  key={p.player.id}
                  className={`hover:bg-zinc-800/60 transition-colors ${last ? "" : "border-b border-zinc-800/40"} ${sub ? "opacity-70" : ""}`}
                >
                  <td className="py-2 pl-3 pr-2">
                    <Link
                      href={`/player/${league}/${group.team.id}/${p.player.id}`}
                      prefetch={false}
                      className="flex items-center gap-2"
                    >
                      {p.player.photo && (
                        <Image
                          src={p.player.photo}
                          alt={p.player.name}
                          width={20}
                          height={20}
                          className="rounded-full bg-zinc-800 object-cover"
                        />
                      )}
                      <span className="text-zinc-300 hover:text-emerald-300 transition-colors text-xs truncate max-w-[140px]">
                        {p.player.name}
                      </span>
                      {s?.games.position && (
                        <span className="text-[10px] text-zinc-600 tabular-nums">
                          {s.games.position}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-400 text-xs tabular-nums">
                    {n(s?.games.minutes)}
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                    {n(s?.shots.total)}
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                    {n(s?.shots.on)}
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-400 text-xs tabular-nums">
                    {n(s?.goals.total)}
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-400 text-xs tabular-nums">
                    {n(s?.goals.assists)}
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                    {n(s?.tackles.total)}
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-300 text-xs tabular-nums">
                    {n(s?.fouls.committed)}
                  </td>
                  <td className="py-2 px-2 text-center text-yellow-400 text-xs tabular-nums">
                    {s?.cards.yellow ?? 0}
                  </td>
                  <td className="py-2 pl-2 pr-3 text-center text-zinc-300 text-xs tabular-nums">
                    {s?.games.rating ? Number(s.games.rating).toFixed(1) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
