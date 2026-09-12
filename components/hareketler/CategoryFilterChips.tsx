import type { Category } from "@/lib/types";

interface CategoryFilterChipsProps {
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClearAll: () => void;
}

// Çoklu seçim: boş dizi "tümü" anlamına gelir (AddExpenseSheet'teki tek
// seçimli kategori chip'lerinin aksine, burada birden fazla kategori aynı
// anda aktif olabilir — bkz. PRD Bölüm 6.1.1/Teknik Analiz 5.2).
export default function CategoryFilterChips({
  categories,
  selectedIds,
  onToggle,
  onClearAll,
}: CategoryFilterChipsProps) {
  const allSelected = selectedIds.length === 0;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted">Kategori</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-pill px-3 py-2 text-xs font-semibold"
          style={
            allSelected
              ? { background: "var(--color-ink)", color: "var(--color-page)" }
              : { background: "var(--color-surface2)", color: "var(--color-ink)" }
          }
        >
          Tümü
        </button>
        {categories.map((c) => {
          const active = selectedIds.includes(c.id);
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onToggle(c.id)}
              className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-xs font-semibold"
              style={
                active
                  ? { background: c.color, color: "#fff" }
                  : { background: "var(--color-surface2)", color: "var(--color-ink)" }
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: active ? "rgba(255,255,255,.85)" : c.color }}
              />
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
