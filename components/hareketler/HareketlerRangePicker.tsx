import type { QuickRangeKey } from "@/lib/calculations";
import { QUICK_OPTIONS } from "@/components/sheets/DateRangeSheet";

interface HareketlerRangePickerProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onQuickSelect: (preset: QuickRangeKey) => void;
  onAllTime: () => void;
}

export default function HareketlerRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  onQuickSelect,
  onAllTime,
}: HareketlerRangePickerProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted">Tarih Aralığı</label>
      <div className="flex flex-col gap-2.5">
        <input
          type="date"
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm font-semibold text-ink outline-none"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm font-semibold text-ink outline-none"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
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
        {/* Son Hareketler, tab oluşturulduğunda "tam geçmiş, sayfalama yok"
            kararıyla açılmıştı (bkz. Teknik Analiz 5.2) — varsayılan filtre
            Bu Ay'a daraltılınca bu karara geri dönebilmek için özel bir kısayol. */}
        <button
          type="button"
          onClick={onAllTime}
          className="rounded-pill border border-dashed border-border-dashed px-3.5 py-2 text-xs font-semibold text-muted"
        >
          Tüm Zamanlar
        </button>
      </div>
    </div>
  );
}
