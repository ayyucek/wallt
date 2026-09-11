import { SAVING_COLOR } from "./categories";
import type {
  Category,
  CategoryTotal,
  CompareBarEntry,
  CompareParetoEntry,
  DateRange,
  ParetoEntry,
  RadarEntry,
  Transaction,
} from "./types";

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

export type QuickRangeKey = "week" | "lastweek" | "month" | "lastmonth";

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// Hafta Pazartesi başlar (TR konvansiyonu): Pazar (0) için 6 gün geri git,
// diğer günler için haftanın başındaki Pazartesi'ye kadar geri git.
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// DateRangeSheet'teki hızlı seçim kısayolları (PRD 5.4): Bu Hafta / Geçen
// Hafta / Bu Ay / Geçen Ay. `today` test edilebilirlik için parametrik.
export function quickRange(key: QuickRangeKey, today: Date = new Date()): DateRange {
  const todayStr = toISODate(today);
  switch (key) {
    case "week":
      return { start: toISODate(startOfWeek(today)), end: todayStr, label: "Bu Hafta" };
    case "lastweek":
      return {
        start: toISODate(addDays(startOfWeek(today), -7)),
        end: toISODate(addDays(startOfWeek(today), -1)),
        label: "Geçen Hafta",
      };
    case "month":
      return { start: toISODate(startOfMonth(today)), end: todayStr, label: "Bu Ay" };
    case "lastmonth": {
      const prevMonthAnchor = addDays(startOfMonth(today), -1);
      return {
        start: toISODate(startOfMonth(prevMonthAnchor)),
        end: toISODate(endOfMonth(prevMonthAnchor)),
        label: "Geçen Ay",
      };
    }
  }
}

// İstatistikler ekranı — dönem karşılaştırma (PRD 7.1). aggA/aggB, her iki
// dönem için ayrı ayrı çağrılmış aggregate() çıktısıdır.

export function diffPercent(totalA: number, totalB: number): number {
  if (totalA === 0) return totalB > 0 ? 100 : 0;
  return ((totalB - totalA) / totalA) * 100;
}

export function compareBarData(
  aggA: CategoryTotal[],
  aggB: CategoryTotal[],
  categories: Category[]
): CompareBarEntry[] {
  return categories
    .map((c) => ({
      name: c.name,
      A: aggA.find((a) => a.id === c.id)?.total ?? 0,
      B: aggB.find((b) => b.id === c.id)?.total ?? 0,
    }))
    .filter((d) => d.A > 0 || d.B > 0);
}

export function compareParetoData(
  aggA: CategoryTotal[],
  aggB: CategoryTotal[],
  categories: Category[],
  totalA: number,
  totalB: number
): CompareParetoEntry[] {
  const merged = categories
    .map((c) => {
      const a = aggA.find((x) => x.id === c.id)?.total ?? 0;
      const b = aggB.find((x) => x.id === c.id)?.total ?? 0;
      return { ...c, a, b, combined: a + b };
    })
    .filter((c) => c.combined > 0)
    .sort((x, y) => y.combined - x.combined);

  let cumA = 0;
  let cumB = 0;
  return merged.map((c) => {
    cumA += c.a;
    cumB += c.b;
    return {
      ...c,
      cumPctA: totalA ? Number(((cumA / totalA) * 100).toFixed(1)) : 0,
      cumPctB: totalB ? Number(((cumB / totalB) * 100).toFixed(1)) : 0,
    };
  });
}
