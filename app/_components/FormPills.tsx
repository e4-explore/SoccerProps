import type { Fixture } from "../lib/api-football";

type Result = "W" | "D" | "L";

const TONE: Record<Result, string> = {
  W: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40",
  D: "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700",
  L: "bg-red-500/15 text-red-300 ring-1 ring-red-500/40",
};

function fixtureResult(fixture: Fixture, teamId: number): Result | null {
  const { goals, teams } = fixture;
  if (goals.home == null || goals.away == null) return null;
  const isHome = teams.home.id === teamId;
  const teamGoals = isHome ? goals.home : goals.away;
  const oppGoals = isHome ? goals.away : goals.home;
  if (teamGoals > oppGoals) return "W";
  if (teamGoals < oppGoals) return "L";
  return "D";
}

function parseFormString(form: string): Result[] {
  return form
    .split("")
    .filter((c): c is Result => c === "W" || c === "D" || c === "L");
}

export default function FormPills({
  fixtures,
  teamId,
  form,
  size = "sm",
}: {
  fixtures?: Fixture[];
  teamId?: number;
  form?: string | null;
  size?: "sm" | "md";
}) {
  let results: Result[] = [];
  if (form) {
    results = parseFormString(form);
  } else if (fixtures && teamId != null) {
    results = fixtures
      .map((f) => fixtureResult(f, teamId))
      .filter((r): r is Result => r != null);
  }

  if (results.length === 0) {
    return <span className="text-xs text-zinc-600">No recent results</span>;
  }

  const dims =
    size === "md"
      ? "size-6 text-xs"
      : "size-5 text-[10px]";

  return (
    <div className="flex items-center gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          className={`${dims} ${TONE[r]} inline-flex items-center justify-center rounded font-bold tabular-nums`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
