import { formatCurrency } from "@/lib/format";

interface SavingsSummaryCardProps {
  total: number;
}

export default function SavingsSummaryCard({ total }: SavingsSummaryCardProps) {
  if (total <= 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <span className="h-2 w-2 rounded-full bg-saving" />
        Bu dönemde ettiğin tasarruf
      </div>
      <span className="font-display text-base font-semibold text-saving">
        {formatCurrency(total)}
      </span>
    </div>
  );
}
