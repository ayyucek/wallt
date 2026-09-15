import type {
  Category,
  CategoryTotal,
  CompareBarEntry,
  CompareParetoEntry,
  DateRange,
  FrequentExpense,
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

// Genel Bakış bar chart'ına her kategorinin tasarruf tutarını ekler
// (bkz. CategoryBarChart.tsx). Ayrı bir satır ÜRETMEZ — sortedAgg'daki
// ilgili satıra `savingSegment` alanını iliştirir, böylece o kategorinin
// barının ucuna stacked bir segment olarak render edilebilir. savingsAgg,
// aggregate(savings, categories) çıktısıdır (savings = type "saving" olan
// işlemler). sortedAgg'ın harcama `total`'ları hiç değişmez.
export function withSavingSegments(
  sortedAgg: CategoryTotal[],
  savingsAgg: CategoryTotal[]
): CategoryTotal[] {
  return sortedAgg.map((c) => {
    const saving = savingsAgg.find((s) => s.id === c.id)?.total ?? 0;
    return saving > 0 ? { ...c, savingSegment: saving } : c;
  });
}

// Harcama Ekle sheet'indeki "Sık Kullanılanlar" şeridi (PRD 5.1.2). Anahtar
// type|başlık(trim+lowercase)|categoryId'dir — tutar anahtara DAHİL DEĞİL,
// çünkü aynı başlık+kategori her seferinde biraz farklı bir tutarla
// girilebilir (örn. "Market"); tutarı anahtara katmak bu doğal varyasyonu
// hiçbiri tek başına "sık" eşiğine ulaşamayan ayrı kombinasyonlara bölerdi.
// Dönen `amount`, o grup içindeki en son tarihli (timestamp'i en büyük)
// kaydın tutarıdır — kullanıcının en güncel harcama miktarını yansıtır.
// count >= 2 filtresi "sık" tanımını tek seferlik bir harcamayı kapsamayacak
// şekilde sağlar; az veri varsa boş dizi döner, UI şeridi göstermez.
//
// Timestamp EŞİTLİĞİ (>=, > değil): `timestamp` alanı bir `datetime-local`
// input'undan gelir ve dakika hassasiyetindedir — aynı dakika içinde art
// arda eklenen iki kayıt birebir aynı ISO string'e sahip olabilir. `>`
// (strict) kullanılsaydı eşitlik durumunda İLK karşılaşılan kayıt kazanırdı;
// `>=` ile SONRAKİ karşılaşılan (eşit veya daha yeni) kayıt kazanır. Bu,
// çağıranın transactions'ı insertion-order + stabil sort ile tuttuğu
// (bkz. page.tsx sortByTimestampDesc) gerçek kullanımda "aynı dakikada
// girilen ikinci kayıt, birincinin üzerine yazar" davranışını doğru verir.
export function getFrequentExpenses(transactions: Transaction[], limit = 5): FrequentExpense[] {
  const map = new Map<string, FrequentExpense & { lastTimestamp: string }>();
  transactions.forEach((t) => {
    const key = `${t.type}|${t.title.trim().toLowerCase()}|${t.categoryId}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (t.timestamp >= existing.lastTimestamp) {
        existing.lastTimestamp = t.timestamp;
        existing.amount = t.amount;
        existing.title = t.title.trim();
      }
    } else {
      map.set(key, {
        title: t.title.trim(),
        amount: t.amount,
        categoryId: t.categoryId,
        type: t.type,
        count: 1,
        lastTimestamp: t.timestamp,
      });
    }
  });
  return Array.from(map.values())
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count || (a.lastTimestamp < b.lastTimestamp ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({ title: e.title, amount: e.amount, categoryId: e.categoryId, type: e.type, count: e.count }));
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

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
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

// Pareto Karşılaştırma grafiğinin sağ ekseni: Dönem A'da o kümülatif yüzdeye
// hangi tarihte ulaşıldığını gösterir (bkz. Teknik Analiz 5.5). Çözünürlük,
// Dönem A'nın uzunluğuna göre adaptiftir — kısa dönemlerde gün bazında,
// uzun dönemlerde ay/10-dilim bazında, aksi halde eksen okunaksız olur.
export type DateGranularity = "day" | "week" | "month" | "decile";

const GRANULARITY_LABELS: Record<DateGranularity, string> = {
  day: "günlük",
  week: "haftalık",
  month: "aylık",
  decile: "10 dilimlik",
};

export function granularityLabel(granularity: DateGranularity): string {
  return GRANULARITY_LABELS[granularity];
}

// Eşikler gerçek takvim ayı aritmetiğiyle hesaplanır (addMonths), sabit gün
// sayıları (90/365 gibi) KULLANILMAZ — ay uzunluğu farklarından kaynaklanan
// kaymaları önler. ≤2 hafta = ≤14 gün fark.
export function periodGranularity(start: string, end: string): DateGranularity {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (e <= addDays(s, 14)) return "day";
  if (e <= addMonths(s, 3)) return "week";
  if (e <= addMonths(s, 12)) return "month";
  return "decile";
}

// Dönem A'nın transactionları + tarih aralığından, granülerliğe göre
// bucket'lanmış kümülatif toplamlar üretir ve verilen kümülatif yüzdeye
// (0-100) ilk ulaşan bucket'ın tarih etiketini döndüren bir formatter
// fonksiyonu döner. `transactions` zaten isExpense + döneme filtrelenmiş
// olmalıdır (page.tsx'teki txA gibi).
export function buildCumulativeDateMap(
  transactions: Transaction[],
  start: string,
  end: string
): (pct: number) => string {
  const granularity = periodGranularity(start, end);
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const dayCount = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);

  const dayIndexOf = (t: Transaction) =>
    Math.round((new Date(`${txDateStr(t.timestamp)}T00:00:00`).getTime() - s.getTime()) / 86400000);

  let buckets: { end: Date; cum: number }[];

  if (granularity === "day") {
    const totals = new Array(dayCount).fill(0);
    transactions.forEach((t) => {
      const idx = dayIndexOf(t);
      if (idx >= 0 && idx < dayCount) totals[idx] += t.amount;
    });
    let cum = 0;
    buckets = totals.map((amt, i) => {
      cum += amt;
      return { end: addDays(s, i), cum };
    });
  } else if (granularity === "week") {
    const bucketCount = Math.ceil(dayCount / 7);
    const totals = new Array(bucketCount).fill(0);
    transactions.forEach((t) => {
      const idx = dayIndexOf(t);
      if (idx >= 0 && idx < dayCount) totals[Math.floor(idx / 7)] += t.amount;
    });
    let cum = 0;
    buckets = totals.map((amt, i) => {
      cum += amt;
      const bucketEndDayIdx = Math.min(dayCount - 1, (i + 1) * 7 - 1);
      return { end: addDays(s, bucketEndDayIdx), cum };
    });
  } else if (granularity === "month") {
    const monthStarts: Date[] = [];
    for (let m = startOfMonth(s); m <= e; m = addMonths(m, 1)) monthStarts.push(m);
    const totals = new Array(monthStarts.length).fill(0);
    transactions.forEach((t) => {
      const d = new Date(`${txDateStr(t.timestamp)}T00:00:00`);
      for (let i = monthStarts.length - 1; i >= 0; i--) {
        if (d >= monthStarts[i]) {
          totals[i] += t.amount;
          break;
        }
      }
    });
    let cum = 0;
    buckets = totals.map((amt, i) => {
      cum += amt;
      const isLast = i === monthStarts.length - 1;
      const bucketEnd = isLast ? e : addDays(endOfMonth(monthStarts[i]), 0);
      return { end: bucketEnd, cum };
    });
  } else {
    const bucketCount = 10;
    const totalMs = e.getTime() - s.getTime();
    const totals = new Array(bucketCount).fill(0);
    transactions.forEach((t) => {
      const d = new Date(`${txDateStr(t.timestamp)}T00:00:00`);
      const offset = d.getTime() - s.getTime();
      const idx = totalMs > 0 ? Math.min(bucketCount - 1, Math.max(0, Math.floor((offset / totalMs) * bucketCount))) : 0;
      totals[idx] += t.amount;
    });
    let cum = 0;
    buckets = totals.map((amt, i) => {
      cum += amt;
      const bucketEndMs = s.getTime() + (totalMs * (i + 1)) / bucketCount;
      return { end: new Date(bucketEndMs), cum };
    });
  }

  const formatDate = (d: Date) =>
    granularity === "month"
      ? d.toLocaleDateString("tr-TR", { month: "short" })
      : d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

  return (pct: number) => {
    if (!total) return "";
    for (const bucket of buckets) {
      if ((bucket.cum / total) * 100 >= pct) return formatDate(bucket.end);
    }
    return formatDate(buckets[buckets.length - 1]?.end ?? e);
  };
}
