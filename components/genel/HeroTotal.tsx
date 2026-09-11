import { Filter } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface HeroTotalProps {
  total: number;
  rangeLabel: string;
  onFilterClick: () => void;
}

export default function HeroTotal({ total, rangeLabel, onFilterClick }: HeroTotalProps) {
  return (
    <div className="mb-4 flex items-stretch gap-3">
      <div className="flex-1 rounded-card bg-card p-4 shadow-float">
        <p className="text-xs font-semibold text-muted">Seçili dönemde toplam harcama</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">{formatCurrency(total)}</p>
        <p className="mt-1 text-xs font-semibold text-muted">{rangeLabel}</p>
      </div>
      <button
        type="button"
        onClick={onFilterClick}
        aria-label="Zaman aralığını filtrele"
        className="flex w-12 flex-shrink-0 items-center justify-center rounded-card bg-card text-ink shadow-card active:scale-95"
      >
        <Filter size={18} />
      </button>
    </div>
  );
}
