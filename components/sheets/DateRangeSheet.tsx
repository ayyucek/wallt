import type { QuickRangeKey } from "@/lib/calculations";

interface DateRangeSheetProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onQuickSelect: (preset: QuickRangeKey) => void;
  onClose: () => void;
}

// PeriodPicker.tsx da aynı kısayolları kullanır, bu yüzden export edilir.
export const QUICK_OPTIONS: { key: QuickRangeKey; label: string }[] = [
  { key: "week", label: "Bu Hafta" },
  { key: "lastweek", label: "Geçen Hafta" },
  { key: "month", label: "Bu Ay" },
  { key: "lastmonth", label: "Geçen Ay" },
];

export default function DateRangeSheet({
  start,
  end,
  onStartChange,
  onEndChange,
  onQuickSelect,
  onClose,
}: DateRangeSheetProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Başlangıç</label>
          <input
            type="date"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Bitiş</label>
          <input
            type="date"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onQuickSelect(opt.key)}
            className="rounded-pill bg-surface2 px-3.5 py-2 text-xs font-semibold text-ink"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary"
      >
        Tamam
      </button>
    </div>
  );
}
