"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface TeamOption {
  id: number;
  name: string;
  logo: string;
}

export default function TeamSwitcher({
  league,
  teams,
  activeTeamId,
  subtitle,
}: {
  league: number;
  teams: TeamOption[];
  activeTeamId: number;
  subtitle?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const active = teams.find((t) => t.id === activeTeamId);
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex items-center gap-3">
      {active?.logo && (
        <Image
          src={active.logo}
          alt={active.name}
          width={32}
          height={32}
          className="object-contain shrink-0"
        />
      )}
      <div className="min-w-0">
        <div className="relative inline-flex items-center group">
          <select
            value={activeTeamId}
            onChange={(e) => {
              const next = e.target.value;
              startTransition(() => {
                router.push(`/players?league=${league}&team=${next}`);
              });
            }}
            disabled={isPending}
            aria-label="Switch team"
            className="appearance-none bg-transparent text-xl font-bold text-white pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded -mx-1 px-1 hover:text-emerald-300 transition-colors disabled:opacity-60"
          >
            {sorted.map((t) => (
              <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                {t.name}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`pointer-events-none absolute right-1 size-4 text-zinc-500 group-hover:text-emerald-300 transition ${isPending ? "animate-pulse" : ""}`}
          >
            <path
              d="M5.5 8l4.5 4.5L14.5 8"
              stroke="currentColor"
              strokeWidth="1.75"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
