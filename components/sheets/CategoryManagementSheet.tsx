"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import ColorPicker from "@/components/ui/ColorPicker";
import type { Category, Transaction } from "@/lib/types";

interface CategoryManagementSheetProps {
  categories: Category[];
  transactions: Transaction[];
  onUpdateCategory: (id: string, input: { name: string; color: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

// Ayarlar'daki "Kategorileri Yönet" ekranı (16 Eylül 2026 eklentisi, bkz.
// Teknik Analiz Bölüm 5.13). Default kategoriler (7 tanesi) DB'de satır
// değil, lib/categories.ts'e hardcoded — bu yüzden tamamen salt-okunurdur
// ("Varsayılan" rozeti, Düzenle/Sil yok). Yalnızca custom (isCustom: true,
// DB'den gelen) kategoriler satır içinde (accordion tarzı, ayrı bir modal
// açmadan) düzenlenebilir/silinebilir.
export default function CategoryManagementSheet({
  categories,
  transactions,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagementSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(category: Category) {
    setExpandedId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setConfirmDeleteId(null);
    setError(null);
  }

  function closeEdit() {
    setExpandedId(null);
    setConfirmDeleteId(null);
    setError(null);
  }

  async function handleSave(id: string) {
    const name = editName.trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      await onUpdateCategory(id, { name, color: editColor });
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori güncellenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      await onDeleteCategory(id);
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori silinemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {categories.map((c) => {
        const isExpanded = expandedId === c.id;
        const isConfirmingDelete = confirmDeleteId === c.id;
        const affectedCount = transactions.filter((t) => t.categoryId === c.id).length;

        return (
          <div key={c.id} className="rounded-xl bg-surface2 p-3">
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="flex-1 text-sm font-semibold text-ink">{c.name}</span>
              {!c.isCustom ? (
                <span className="rounded-pill bg-card px-2.5 py-1 text-[10.5px] font-bold text-muted">
                  Varsayılan
                </span>
              ) : isExpanded ? (
                <button type="button" onClick={closeEdit} aria-label="Kapat" className="text-muted">
                  <X size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="flex items-center gap-1 rounded-pill bg-card px-2.5 py-1.5 text-xs font-semibold text-ink"
                >
                  <Pencil size={12} /> Düzenle
                </button>
              )}
            </div>

            {isExpanded && !isConfirmingDelete && (
              <div className="mt-3 flex flex-col gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl bg-card px-3 py-2.5 text-base font-semibold text-ink outline-none"
                />
                <ColorPicker value={editColor} onChange={setEditColor} />
                {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(c.id)}
                    disabled={!editName.trim() || submitting}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-2.5 text-sm font-bold text-white disabled:opacity-45"
                  >
                    <Check size={14} /> Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="flex items-center gap-1.5 rounded-pill bg-category-saglik/15 px-3 py-2.5 text-sm font-bold text-category-saglik"
                  >
                    <Trash2 size={14} /> Sil
                  </button>
                </div>
              </div>
            )}

            {isConfirmingDelete && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-xs font-medium text-muted">
                  {affectedCount > 0
                    ? `Bu kategoriye ait ${affectedCount} kayıt var, silinince hepsi "Diğer" kategorisine taşınacak. Emin misin?`
                    : "Bu kategoriye ait kayıt yok. Silmek istediğine emin misin?"}
                </p>
                {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(c.id)}
                    disabled={submitting}
                    className="flex-1 rounded-pill bg-category-saglik py-2.5 text-sm font-bold text-white disabled:opacity-45"
                  >
                    Sil
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 rounded-pill bg-card py-2.5 text-sm font-bold text-ink"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
