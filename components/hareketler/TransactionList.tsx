import { SAVING_COLOR } from "@/lib/categories";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onRowClick?: (transaction: Transaction) => void;
}

// Son Hareketler sekmesinin tek içeriği (11 Eylül 2026 — eskiden
// components/genel/RecentTransactions.tsx olarak Genel Bakış'a gömülüydü ve
// ilk 40 kayıtla sınırlıydı; artık seçili zaman aralığındaki tüm işlemleri
// gösterir, bkz. Teknik Analiz Bölüm 5.2).
// 13 Eylül 2026 eklentisi: satıra dokunmak, düzenle/sil aksiyon sheet'ini
// açar (bkz. TransactionActionsSheet.tsx) — kalıcı ikon/swipe yerine tercih
// edildi, satırları zaten yoğun olan listede sade tutar.
export default function TransactionList({ transactions, categories, onRowClick }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-muted">Henüz harcama yok.</p>;
  }

  return (
    <div>
      {transactions.map((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        const saving = t.type === "saving";
        const dotColor = saving ? SAVING_COLOR : cat?.color ?? "#888888";
        return (
          <button
            type="button"
            key={t.id}
            onClick={() => onRowClick?.(t)}
            className="w-full border-b border-border py-2.5 text-left last:border-none active:opacity-70"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
              <span className="flex-1 truncate text-sm font-semibold text-ink">{t.title || cat?.name}</span>
              <span
                className={`font-display text-sm font-semibold ${saving ? "text-saving" : "text-ink"}`}
              >
                {saving ? "+" : ""}
                {formatCurrency(t.amount)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 pl-4 text-[10.5px] font-medium text-muted">
              <span>{cat?.name ?? t.categoryId}</span>
              <span>·</span>
              <span>{formatDateTime(t.timestamp)}</span>
              {saving && (
                <span className="ml-1 rounded-pill bg-saving/15 px-1.5 py-0.5 text-[9.5px] font-bold text-saving">
                  Tasarruf
                </span>
              )}
            </div>
            {t.description && (
              <div className="mt-0.5 pl-4 text-[11px] font-medium text-muted">{t.description}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
