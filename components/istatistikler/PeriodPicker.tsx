import type { QuickRangeKey } from "@/lib/calculations";
import { QUICK_OPTIONS } from "@/components/sheets/DateRangeSheet";
import type { DateRange } from "@/lib/types";

interface PeriodPickerProps {
  which: "A" | "B";
  range: DateRange;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onQuickSelect: (preset: QuickRangeKey) => void;
}

const SWATCH_CLASS: Record<"A" | "B", string> = {
  A: "bg-periodA",
  B: "bg-periodB",
};

export default function PeriodPicker({
  which,
  range,
  onStartChange,
  onEndChange,
  onQuickSelect,
}: PeriodPickerProps) {
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${SWATCH_CLASS[which]}`} />
        <span className="text-sm font-bold text-ink">
          Dönem {which} · {range.label}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <input
          type="date"
          value={range.start}
          onChange={(e) => onStartChange(e.target.value)}
          className="w-full rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold text-ink outline-none"
        />
        <input
          type="date"
          value={range.end}
          onChange={(e) => onEndChange(e.target.value)}
          className="w-full rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold text-ink outline-none"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onQuickSelect(opt.key)}
            className="rounded-pill bg-surface2 px-3 py-1.5 text-[11px] font-semibold text-ink"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
