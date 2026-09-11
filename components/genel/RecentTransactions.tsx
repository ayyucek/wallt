import { SAVING_COLOR } from "@/lib/categories";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
}

export default function RecentTransactions({ transactions, categories }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 40);

  if (recent.length === 0) {
    return <p className="text-sm text-muted">Henüz harcama yok.</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      {recent.map((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        const saving = t.type === "saving";
        const dotColor = saving ? SAVING_COLOR : cat?.color ?? "#888888";
        return (
          <div key={t.id} className="border-b border-border py-2.5 last:border-none">
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
          </div>
        );
      })}
    </div>
  );
}
