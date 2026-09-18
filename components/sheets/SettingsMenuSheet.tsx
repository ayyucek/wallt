"use client";

import { ChevronRight, ListTree, Repeat } from "lucide-react";

interface SettingsMenuSheetProps {
  onManageCategories: () => void;
  onManageRecurringPayments: () => void;
}

// TopBar'daki dişli ikonu (aria-label="Ayarlar") artık doğrudan kategori
// yönetimini açmıyor — bu küçük menü araya giriyor, "Kategorileri Yönet" ve
// (Faz 5, PRD 5.6) "Düzenli Ödemeleri Yönet" arasında seçim sunuyor. İkisi de
// aynı satır stiliyle (ikon + etiket + chevron) tutarlı gösteriliyor.
export default function SettingsMenuSheet({
  onManageCategories,
  onManageRecurringPayments,
}: SettingsMenuSheetProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onManageCategories}
        className="flex items-center gap-3 rounded-xl bg-surface2 p-3 text-left"
      >
        <ListTree size={18} className="text-muted" />
        <span className="flex-1 text-sm font-semibold text-ink">Kategorileri Yönet</span>
        <ChevronRight size={16} className="text-muted" />
      </button>
      <button
        type="button"
        onClick={onManageRecurringPayments}
        className="flex items-center gap-3 rounded-xl bg-surface2 p-3 text-left"
      >
        <Repeat size={18} className="text-muted" />
        <span className="flex-1 text-sm font-semibold text-ink">Düzenli Ödemeleri Yönet</span>
        <ChevronRight size={16} className="text-muted" />
      </button>
    </div>
  );
}
