import { Pencil, Trash2 } from "lucide-react";

interface TransactionActionsSheetProps {
  onEdit: () => void;
  onDelete: () => void;
}

// Satıra dokununca açılan aksiyon menüsü (13 Eylül 2026 eklentisi) —
// harcama/tasarruf ayrımı gözetmeksizin aynı şekilde çalışır.
export default function TransactionActionsSheet({ onEdit, onDelete }: TransactionActionsSheetProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-2.5 rounded-pill bg-surface2 px-4 py-3 text-sm font-bold text-ink"
      >
        <Pencil size={16} /> Düzenle
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-2.5 rounded-pill bg-category-saglik/15 px-4 py-3 text-sm font-bold text-category-saglik"
      >
        <Trash2 size={16} /> Sil
      </button>
    </div>
  );
}
