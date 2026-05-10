import Image from "next/image";
import Link from "next/link";
import {
  getLeagueTeams,
  type LeagueTeamRow,
} from "../lib/api-football";
import { mockLeagueTeams } from "../lib/mock-data";

export default async function TeamGrid({
  league,
  season,
  activeTeamId,
}: {
  league: number;
  season: number;
  activeTeamId?: number;
}) {
  let teams: LeagueTeamRow[] = [];
  let error: string | null = null;
  let mocked = false;
  try {
    teams = await getLeagueTeams(league, season);
  } catch {
    mocked = true;
    teams = mockLeagueTeams(league);
  }

  if (teams.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        No teams returned for this league/season.
      </p>
    );
  }

  const sorted = [...teams].sort((a, b) =>
    a.team.name.localeCompare(b.team.name)
  );

  return (
    <div className="space-y-2">
      {mocked && (
        <p className="text-xs text-amber-400/80">Mock teams — API quota reached</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
      {sorted.map(({ team }) => {
        const active = team.id === activeTeamId;
        return (
          <Link
            key={team.id}
            href={`/players?league=${league}&team=${team.id}`}
            prefetch={false}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
              active
                ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            <Image
              src={team.logo}
              alt={team.name}
              width={20}
              height={20}
              className="object-contain shrink-0"
            />
            <span
              className={`text-sm truncate ${
                active ? "text-white font-medium" : "text-zinc-300"
              }`}
            >
              {team.name}
            </span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
