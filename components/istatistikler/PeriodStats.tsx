import { formatCurrency } from "@/lib/format";

interface PeriodStatsProps {
  totalA: number;
  totalB: number;
  diffPct: number;
}

export default function PeriodStats({ totalA, totalB, diffPct }: PeriodStatsProps) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      <div className="rounded-card bg-card p-3 shadow-card">
        <p className="text-[10px] font-semibold text-muted">Dönem A</p>
        <p className="font-display text-base font-semibold text-periodA">{formatCurrency(totalA)}</p>
      </div>
      <div className="rounded-card bg-card p-3 shadow-card">
        <p className="text-[10px] font-semibold text-muted">Dönem B</p>
        <p className="font-display text-base font-semibold text-periodB">{formatCurrency(totalB)}</p>
      </div>
      <div className="rounded-card bg-card p-3 shadow-card">
        <p className="text-[10px] font-semibold text-muted">Fark</p>
        <p className="font-display text-base font-semibold text-ink">
          {diffPct >= 0 ? "+" : ""}
          {diffPct.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
