import Link from "next/link";
import { LEAGUES } from "../lib/leagues";

export default function LeagueChips({ activeId }: { activeId: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LEAGUES.map((l) => {
        const active = l.id === activeId;
        return (
          <Link
            key={l.id}
            href={`/players?league=${l.id}`}
            prefetch={false}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active
                ? "bg-emerald-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {l.shortName}
          </Link>
        );
      })}
    </div>
  );
}
