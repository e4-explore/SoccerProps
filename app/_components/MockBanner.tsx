export default function MockBanner({ message }: { message?: string }) {
  return (
    <div className="rounded-xl bg-amber-500/5 ring-1 ring-amber-500/30 p-4 text-sm">
      <div className="flex items-start gap-3">
        <div className="size-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
        <div className="space-y-1 min-w-0">
          <p className="text-amber-300 font-semibold">
            Daily API quota reached — showing mock data
          </p>
          {message && (
            <p className="text-xs text-amber-300/60 font-mono break-words">
              {message}
            </p>
          )}
          <p className="text-xs text-amber-200/60">
            Layout, navigation, and stats below are placeholder values so you
            can preview the UI. Real data resumes once the api-football quota
            resets (typically midnight UTC), or upgrade to lift the limit.
          </p>
        </div>
      </div>
    </div>
  );
}
