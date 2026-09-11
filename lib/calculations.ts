import { SAVING_COLOR } from "./categories";
import type { Category, CategoryTotal, ParetoEntry, RadarEntry, Transaction } from "./types";

export function isExpense(t: Transaction): boolean {
  return t.type !== "saving";
}

export function isSaving(t: Transaction): boolean {
  return t.type === "saving";
}

// timestamp'ten kullanıcının yerel saat dilimine göre "YYYY-MM-DD" günü üretir.
// Not: timestamp.slice(0, 10) KULLANMAYIN — ISO string UTC'dir ve tarayıcı saat
// dilimi UTC'den farklıysa gün sınırında ±1 günlük kaymaya yol açar.
export function txDateStr(timestamp: string): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterByRange(
  transactions: Transaction[],
  start: string,
  end: string
): Transaction[] {
  return transactions.filter((t) => {
    const d = txDateStr(t.timestamp);
    return d >= start && d <= end;
  });
}

export function aggregate(
  transactions: Transaction[],
  categories: Category[]
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  categories.forEach((c) => map.set(c.id, { ...c, total: 0 }));
  transactions.forEach((t) => {
    const existing = map.get(t.categoryId);
    if (existing) {
      existing.total += t.amount;
    } else {
      map.set(t.categoryId, {
        id: t.categoryId,
        name: t.categoryId,
        color: "#888888",
        total: t.amount,
      });
    }
  });
  return Array.from(map.values());
}

export function paretoData(agg: CategoryTotal[]): ParetoEntry[] {
  const sorted = agg.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const grand = sorted.reduce((sum, c) => sum + c.total, 0);
  let cumulative = 0;
  return sorted.map((c) => {
    cumulative += c.total;
    return {
      ...c,
      cumPct: grand ? Number(((cumulative / grand) * 100).toFixed(1)) : 0,
    };
  });
}

// Radar chart ("Kategori Ağırlık Haritası") verisi: her kategorinin harcama
// tutarını, harcaması olan kategorilerin ortalamasıyla birlikte döner.
// UI katmanı, en az 3 kategori dönmediyse grafiği gizlemelidir.
export function radarData(agg: CategoryTotal[]): RadarEntry[] {
  const withSpend = agg.filter((c) => c.total > 0);
  const average = withSpend.length
    ? withSpend.reduce((sum, c) => sum + c.total, 0) / withSpend.length
    : 0;
  return withSpend.map((c) => ({ category: c.name, value: c.total, average }));
}

// Genel Bakış bar chart'ına, toplam tasarruf > 0 ise sona eklenen sentetik
// "Tasarruf" barını üretir. sortedAgg zaten büyükten küçüğe sıralı olmalı.
export function withSavingsBar(
  sortedAgg: CategoryTotal[],
  totalSavings: number
): CategoryTotal[] {
  if (totalSavings <= 0) return sortedAgg;
  return [
    ...sortedAgg,
    {
      id: "__savings__",
      name: "Tasarruf",
      color: SAVING_COLOR,
      total: totalSavings,
      isSaving: true,
    },
  ];
}
