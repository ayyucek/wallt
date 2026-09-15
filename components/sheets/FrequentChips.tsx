import { SAVING_COLOR } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { Category, FrequentExpense } from "@/lib/types";

interface FrequentChipsProps {
  expenses: FrequentExpense[];
  categories: Category[];
  onSelect: (expense: FrequentExpense) => void;
}

// Harcama Ekle sheet'inde, form alanlarının üstünde gösterilen yatay
// kaydırmalı "Sık Kullanılanlar" şeridi (PRD 5.1.2). `expenses` zaten
// getFrequentExpenses() tarafından "en az 2 tekrar" filtresinden geçmiş
// olduğundan, ayrı bir eşik burada tutulmuyor — liste boşsa şerit hiç
// render edilmez.
export default function FrequentChips({ expenses, categories, onSelect }: FrequentChipsProps) {
  if (expenses.length === 0) return null;

  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {expenses.map((expense) => {
        const cat = categories.find((c) => c.id === expense.categoryId);
        const dotColor = expense.type === "saving" ? SAVING_COLOR : cat?.color ?? "#888888";
        return (
          <button
            type="button"
            key={`${expense.type}|${expense.title.toLowerCase()}|${expense.categoryId}`}
            onClick={() => onSelect(expense)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-pill bg-surface2 px-3 py-2 text-xs font-semibold text-ink"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: dotColor }} />
            {expense.title}
            <span className="text-muted">· {formatCurrency(expense.amount)}</span>
          </button>
        );
      })}
    </div>
  );
}
