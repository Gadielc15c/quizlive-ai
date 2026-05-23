const MAP: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-rose-100 text-rose-700",
  waiting: "bg-amber-100 text-amber-700",
  live: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${MAP[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}
