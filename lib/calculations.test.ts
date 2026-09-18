import { describe, expect, it } from "vitest";
import {
  aggregate,
  buildCumulativeDateMap,
  compareBarData,
  compareParetoData,
  diffPercent,
  filterByRange,
  getFrequentExpenses,
  getTopCategoriesByUsage,
  granularityLabel,
  isExpense,
  isSaving,
  paretoData,
  periodGranularity,
  quickRange,
  radarData,
  txDateStr,
  withSavingSegments,
} from "./calculations";
import type { Category, Transaction } from "./types";

const categories: Category[] = [
  { id: "yemek", name: "Yemek", color: "#FF7A6B" },
  { id: "ulasim", name: "Ulaşım", color: "#4F9DDE" },
  { id: "market", name: "Market", color: "#4CC2A0" },
];

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t",
    type: "expense",
    title: "Test",
    description: "",
    amount: 100,
    categoryId: "yemek",
    timestamp: new Date().toISOString(),
    recurringPaymentId: null,
    ...overrides,
  };
}

describe("txDateStr", () => {
  it("kullanıcının yerel gününü döndürür, UTC slice değil", () => {
    const localMoment = new Date(2026, 0, 15, 23, 30); // yerel: 15 Ocak 23:30
    expect(txDateStr(localMoment.toISOString())).toBe("2026-01-15");
  });

  it("yerel gün yarısından hemen sonrasını doğru güne yazar", () => {
    const localMoment = new Date(2026, 0, 16, 0, 15); // yerel: 16 Ocak 00:15
    expect(txDateStr(localMoment.toISOString())).toBe("2026-01-16");
  });
});

describe("filterByRange", () => {
  it("aralık içindeki işlemi dahil eder", () => {
    const t = tx({ timestamp: new Date(2026, 0, 15, 12, 0).toISOString() });
    expect(filterByRange([t], "2026-01-01", "2026-01-31")).toHaveLength(1);
  });

  it("aralığın son gününe yerel saatle gece yarısına yakın düşen işlemi dahil eder", () => {
    const t = tx({ timestamp: new Date(2026, 0, 31, 23, 45).toISOString() });
    expect(filterByRange([t], "2026-01-01", "2026-01-31")).toHaveLength(1);
  });

  it("aralığın hemen dışına, yerel saatle bir sonraki güne düşen işlemi hariç tutar", () => {
    const t = tx({ timestamp: new Date(2026, 1, 1, 0, 5).toISOString() });
    expect(filterByRange([t], "2026-01-01", "2026-01-31")).toHaveLength(0);
  });
});

describe("aggregate", () => {
  it("her kategori için işlemleri toplar, işlemi olmayan kategoriler 0 ile döner", () => {
    const txs = [
      tx({ categoryId: "yemek", amount: 100 }),
      tx({ categoryId: "yemek", amount: 50 }),
      tx({ categoryId: "ulasim", amount: 30 }),
    ];
    const result = aggregate(txs, categories);
    expect(result.find((c) => c.id === "yemek")?.total).toBe(150);
    expect(result.find((c) => c.id === "ulasim")?.total).toBe(30);
    expect(result.find((c) => c.id === "market")?.total).toBe(0);
  });

  it("bilinmeyen categoryId için de bir toplam üretir", () => {
    const txs = [tx({ categoryId: "silinmis-kategori", amount: 20 })];
    const result = aggregate(txs, categories);
    expect(result.find((c) => c.id === "silinmis-kategori")?.total).toBe(20);
  });
});

describe("paretoData", () => {
  it("büyükten küçüğe sıralar ve kümülatif yüzdeyi hesaplar", () => {
    const agg = aggregate(
      [
        tx({ categoryId: "yemek", amount: 300 }),
        tx({ categoryId: "ulasim", amount: 100 }),
        tx({ categoryId: "market", amount: 0 }),
      ],
      categories
    );
    const result = paretoData(agg);
    expect(result.map((c) => c.id)).toEqual(["yemek", "ulasim"]);
    expect(result[0].cumPct).toBe(75);
    expect(result[1].cumPct).toBe(100);
  });

  it("toplam 0 ise boş dizi döner", () => {
    const agg = aggregate([], categories);
    expect(paretoData(agg)).toEqual([]);
  });
});

describe("isExpense / isSaving", () => {
  it("type 'saving' değilse harcama sayar", () => {
    const t = tx({ type: "expense" });
    expect(isExpense(t)).toBe(true);
    expect(isSaving(t)).toBe(false);
  });

  it("type 'saving' ise tasarruf sayar, harcama sayılmaz", () => {
    const t = tx({ type: "saving" });
    expect(isExpense(t)).toBe(false);
    expect(isSaving(t)).toBe(true);
  });
});

describe("radarData", () => {
  it("harcaması olan kategoriler için değer ve ortak ortalamayı döner", () => {
    const agg = aggregate(
      [
        tx({ categoryId: "yemek", amount: 300 }),
        tx({ categoryId: "ulasim", amount: 100 }),
        tx({ categoryId: "market", amount: 0 }),
      ],
      categories
    );
    const result = radarData(agg);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.average === 200)).toBe(true);
    expect(result.find((r) => r.category === "Yemek")?.value).toBe(300);
  });

  it("hiç harcama yoksa boş dizi döner", () => {
    const agg = aggregate([], categories);
    expect(radarData(agg)).toEqual([]);
  });
});

describe("withSavingSegments", () => {
  it("hiçbir kategoride tasarruf yoksa diziyi değiştirmeden döner", () => {
    const agg = aggregate([tx({ categoryId: "yemek", amount: 100 })], categories);
    const savingsAgg = aggregate([], categories);
    expect(withSavingSegments(agg, savingsAgg)).toEqual(agg);
  });

  it("ilgili kategorinin satırına savingSegment ekler, total'ı değiştirmez", () => {
    const agg = aggregate([tx({ categoryId: "yemek", amount: 100 })], categories);
    const savingsAgg = aggregate(
      [tx({ type: "saving", categoryId: "yemek", amount: 40 })],
      categories
    );
    const result = withSavingSegments(agg, savingsAgg);
    const yemek = result.find((c) => c.id === "yemek")!;
    expect(yemek.total).toBe(100);
    expect(yemek.savingSegment).toBe(40);
    // Tasarrufu olmayan kategoriler etkilenmez.
    const ulasim = result.find((c) => c.id === "ulasim")!;
    expect(ulasim.savingSegment).toBeUndefined();
  });

  it("harcaması olmayan ama tasarrufu olan bir kategoriye de segment ekler", () => {
    const agg = aggregate([], categories);
    const savingsAgg = aggregate(
      [tx({ type: "saving", categoryId: "ulasim", amount: 25 })],
      categories
    );
    const result = withSavingSegments(agg, savingsAgg);
    const ulasim = result.find((c) => c.id === "ulasim")!;
    expect(ulasim.total).toBe(0);
    expect(ulasim.savingSegment).toBe(25);
  });
});

// Sabit referans: 14 Ocak 2026 — bir Çarşamba.
const REFERENCE_TODAY = new Date(2026, 0, 14);

describe("quickRange", () => {
  it("'week': haftanın Pazartesi'sinden bugüne", () => {
    expect(quickRange("week", REFERENCE_TODAY)).toEqual({
      start: "2026-01-12",
      end: "2026-01-14",
      label: "Bu Hafta",
    });
  });

  it("'lastweek': geçen hafta Pazartesi'den Pazar'a", () => {
    expect(quickRange("lastweek", REFERENCE_TODAY)).toEqual({
      start: "2026-01-05",
      end: "2026-01-11",
      label: "Geçen Hafta",
    });
  });

  it("'month': ayın 1'inden bugüne", () => {
    expect(quickRange("month", REFERENCE_TODAY)).toEqual({
      start: "2026-01-01",
      end: "2026-01-14",
      label: "Bu Ay",
    });
  });

  it("'lastmonth': geçen ayın tamamı (yıl sınırını da doğru geçer)", () => {
    expect(quickRange("lastmonth", REFERENCE_TODAY)).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
      label: "Geçen Ay",
    });
  });

  it("'week': Pazar günü de doğru haftaya (bir önceki Pazartesi) düşer", () => {
    const sunday = new Date(2026, 0, 18); // 18 Ocak 2026 — Pazar
    expect(quickRange("week", sunday).start).toBe("2026-01-12");
  });
});

describe("diffPercent", () => {
  it("iki pozitif toplam arasındaki yüzde farkı hesaplar", () => {
    expect(diffPercent(100, 150)).toBe(50);
    expect(diffPercent(200, 100)).toBe(-50);
  });

  it("Dönem A 0 ama Dönem B > 0 ise %100 döner", () => {
    expect(diffPercent(0, 50)).toBe(100);
  });

  it("her iki dönem de 0 ise %0 döner", () => {
    expect(diffPercent(0, 0)).toBe(0);
  });
});

describe("compareBarData", () => {
  it("her kategori için A/B toplamlarını eşler, ikisi de 0 olanları eler", () => {
    const aggA = aggregate([tx({ categoryId: "yemek", amount: 100 })], categories);
    const aggB = aggregate([tx({ categoryId: "ulasim", amount: 40 })], categories);
    const result = compareBarData(aggA, aggB, categories);
    expect(result).toEqual([
      { name: "Yemek", A: 100, B: 0 },
      { name: "Ulaşım", A: 0, B: 40 },
    ]);
  });
});

describe("compareParetoData", () => {
  it("kombine toplama göre büyükten küçüğe sıralar, her dönem kendi kümülatif %'sini hesaplar", () => {
    const aggA = aggregate(
      [tx({ categoryId: "yemek", amount: 50 }), tx({ categoryId: "ulasim", amount: 200 })],
      categories
    );
    const aggB = aggregate([tx({ categoryId: "yemek", amount: 250 })], categories);
    const result = compareParetoData(aggA, aggB, categories, 250, 250);

    expect(result.map((c) => c.id)).toEqual(["yemek", "ulasim"]);
    const yemek = result.find((c) => c.id === "yemek")!;
    expect(yemek).toMatchObject({ a: 50, b: 250, combined: 300, cumPctA: 20, cumPctB: 100 });
    const ulasim = result.find((c) => c.id === "ulasim")!;
    expect(ulasim).toMatchObject({ a: 200, b: 0, combined: 200, cumPctA: 100, cumPctB: 100 });
  });

  it("her iki dönemde de harcaması olmayan kategorileri eler", () => {
    const aggA = aggregate([], categories);
    const aggB = aggregate([], categories);
    expect(compareParetoData(aggA, aggB, categories, 0, 0)).toEqual([]);
  });
});

describe("periodGranularity", () => {
  it("≤2 hafta (14 gün) için gün bazında döner", () => {
    expect(periodGranularity("2026-01-01", "2026-01-15")).toBe("day");
  });

  it(">2 hafta ve ≤3 ay için hafta bazında döner", () => {
    expect(periodGranularity("2026-01-01", "2026-01-16")).toBe("week");
    expect(periodGranularity("2026-01-01", "2026-04-01")).toBe("week");
  });

  it(">3 ay ve ≤12 ay için ay bazında döner", () => {
    expect(periodGranularity("2026-01-01", "2026-04-15")).toBe("month");
    expect(periodGranularity("2026-01-01", "2027-01-01")).toBe("month");
  });

  it(">1 yıl için 10 dilime döner", () => {
    expect(periodGranularity("2026-01-01", "2027-01-02")).toBe("decile");
  });
});

describe("granularityLabel", () => {
  it("her granülerlik için okunabilir bir etiket döner", () => {
    expect(granularityLabel("day")).toBe("günlük");
    expect(granularityLabel("week")).toBe("haftalık");
    expect(granularityLabel("month")).toBe("aylık");
    expect(granularityLabel("decile")).toBe("10 dilimlik");
  });
});

describe("buildCumulativeDateMap", () => {
  it("gün bazında: %100'e ulaşılan günü döner", () => {
    const txs = [
      tx({ amount: 50, timestamp: new Date(2026, 0, 1, 12).toISOString() }),
      tx({ amount: 50, timestamp: new Date(2026, 0, 3, 12).toISOString() }),
    ];
    const at = buildCumulativeDateMap(txs, "2026-01-01", "2026-01-05");
    expect(at(50)).toBe("1 Oca");
    expect(at(100)).toBe("3 Oca");
  });

  it("hafta bazında: bucket sonundaki tarihi döner", () => {
    const txs = [
      tx({ amount: 100, timestamp: new Date(2026, 0, 5, 12).toISOString() }), // 1. hafta
      tx({ amount: 100, timestamp: new Date(2026, 0, 20, 12).toISOString() }), // 3. hafta
    ];
    const at = buildCumulativeDateMap(txs, "2026-01-01", "2026-02-15"); // 46 gün -> hafta
    expect(periodGranularity("2026-01-01", "2026-02-15")).toBe("week");
    expect(at(50)).toBe("7 Oca"); // 1. haftanın (gün 0-6) sonu
    expect(at(100)).toBe("21 Oca"); // 3. haftanın (gün 14-20) sonu
  });

  it("ay bazında: sadece ay adını döner", () => {
    const txs = [
      tx({ amount: 100, timestamp: new Date(2026, 0, 15, 12).toISOString() }),
      tx({ amount: 100, timestamp: new Date(2026, 2, 10, 12).toISOString() }),
    ];
    const at = buildCumulativeDateMap(txs, "2026-01-01", "2026-04-15");
    expect(periodGranularity("2026-01-01", "2026-04-15")).toBe("month");
    expect(at(50)).toBe("Oca");
    expect(at(100)).toBe("Mar");
  });

  it("10 dilim bazında: her dilim toplam sürenin onda biri kadardır", () => {
    const txs = [
      tx({ amount: 100, timestamp: new Date(2026, 0, 1, 12).toISOString() }),
      tx({ amount: 100, timestamp: new Date(2027, 0, 1, 12).toISOString() }),
    ];
    const at = buildCumulativeDateMap(txs, "2026-01-01", "2027-01-02");
    expect(periodGranularity("2026-01-01", "2027-01-02")).toBe("decile");
    expect(at(50)).not.toBe("");
    expect(at(100)).not.toBe("");
  });

  it("dönemde harcama yoksa boş string döner", () => {
    const at = buildCumulativeDateMap([], "2026-01-01", "2026-01-10");
    expect(at(50)).toBe("");
  });
});

describe("getFrequentExpenses", () => {
  it("en az 2 tekrarı olan kombinasyonları count'a göre azalan sırada döner", () => {
    const txs = [
      tx({ title: "Öğle Yemeği", amount: 100, categoryId: "yemek" }),
      tx({ title: "Öğle Yemeği", amount: 120, categoryId: "yemek" }),
      tx({ title: "Öğle Yemeği", amount: 110, categoryId: "yemek" }),
      tx({ title: "Otobüs", amount: 20, categoryId: "ulasim" }),
      tx({ title: "Otobüs", amount: 20, categoryId: "ulasim" }),
    ];
    const result = getFrequentExpenses(txs);
    expect(result.map((e) => e.title)).toEqual(["Öğle Yemeği", "Otobüs"]);
    expect(result[0].count).toBe(3);
    expect(result[1].count).toBe(2);
  });

  it("tutarı anahtara katmaz — farklı tutarlarla girilen aynı başlık+kategori tek grup sayılır", () => {
    const txs = [
      tx({ title: "Market", amount: 80, categoryId: "market" }),
      tx({ title: "Market", amount: 95, categoryId: "market" }),
    ];
    const result = getFrequentExpenses(txs);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it("gösterilen tutar, grup içindeki en son tarihli kaydın tutarıdır", () => {
    const txs = [
      tx({ title: "Market", amount: 80, categoryId: "market", timestamp: "2026-09-01T10:00:00.000Z" }),
      tx({ title: "Market", amount: 95, categoryId: "market", timestamp: "2026-09-10T10:00:00.000Z" }),
      tx({ title: "Market", amount: 60, categoryId: "market", timestamp: "2026-09-05T10:00:00.000Z" }),
    ];
    const result = getFrequentExpenses(txs);
    expect(result[0].amount).toBe(95);
  });

  // Gerçek cihaz/browser testinde bulunan bir edge case: datetime-local input
  // dakika hassasiyetinde olduğundan aynı dakika içinde art arda eklenen iki
  // kayıt birebir aynı ISO timestamp'e sahip olabilir. Bu durumda dizide
  // SONRA gelen (daha yeni eklenen) kaydın tutarı kazanmalı.
  it("timestamp'ler birebir eşitse, dizide sonra gelen kayıt kazanır", () => {
    const txs = [
      tx({ title: "Kahve", amount: 25, categoryId: "yemek", timestamp: "2026-09-15T16:26:00.000Z" }),
      tx({ title: "Kahve", amount: 30, categoryId: "yemek", timestamp: "2026-09-15T16:26:00.000Z" }),
    ];
    const result = getFrequentExpenses(txs);
    expect(result[0].amount).toBe(30);
  });

  it("başlığı trim+lowercase normalize eder (\"Yemek\" ile \"yemek \" aynı gruba girer)", () => {
    const txs = [
      tx({ title: "Kahve", categoryId: "yemek" }),
      tx({ title: "kahve ", categoryId: "yemek" }),
    ];
    const result = getFrequentExpenses(txs);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it("aynı başlık farklı kategoride ayrı grup sayılır", () => {
    const txs = [
      tx({ title: "Hediye", categoryId: "yemek" }),
      tx({ title: "Hediye", categoryId: "yemek" }),
      tx({ title: "Hediye", categoryId: "market" }),
      tx({ title: "Hediye", categoryId: "market" }),
    ];
    const result = getFrequentExpenses(txs);
    expect(result).toHaveLength(2);
  });

  it("tek seferlik (tekrarsız) kombinasyonları eler", () => {
    const txs = [tx({ title: "Tek Seferlik", amount: 500 })];
    expect(getFrequentExpenses(txs)).toEqual([]);
  });

  it("veri yokken boş dizi döner", () => {
    expect(getFrequentExpenses([])).toEqual([]);
  });

  it("limit parametresine uyar", () => {
    const titles = ["A", "B", "C", "D", "E", "F"];
    const txs = titles.flatMap((title) => [tx({ title }), tx({ title })]);
    expect(getFrequentExpenses(txs, 3)).toHaveLength(3);
    expect(getFrequentExpenses(txs)).toHaveLength(5);
  });
});

describe("getTopCategoriesByUsage", () => {
  it("işlem sayısına göre azalan sırada ilk `limit` kategoriyi döner", () => {
    const txs = [
      tx({ categoryId: "market" }),
      tx({ categoryId: "market" }),
      tx({ categoryId: "market" }),
      tx({ categoryId: "yemek" }),
      tx({ categoryId: "yemek" }),
      tx({ categoryId: "ulasim" }),
    ];
    const result = getTopCategoriesByUsage(txs, "expense");
    expect(result.map((c) => c.categoryId)).toEqual(["market", "yemek", "ulasim"]);
    expect(result[0].count).toBe(3);
  });

  it("sadece verilen type'a ait transaction'ları sayar", () => {
    const txs = [
      tx({ categoryId: "market", type: "expense" }),
      tx({ categoryId: "market", type: "expense" }),
      tx({ categoryId: "saglik", type: "saving" }),
      tx({ categoryId: "saglik", type: "saving" }),
      tx({ categoryId: "saglik", type: "saving" }),
    ];
    const expenseResult = getTopCategoriesByUsage(txs, "expense");
    const savingResult = getTopCategoriesByUsage(txs, "saving");
    expect(expenseResult).toEqual([{ categoryId: "market", count: 2 }]);
    expect(savingResult).toEqual([{ categoryId: "saglik", count: 3 }]);
  });

  it("eşit sayıda kullanılan kategorilerde en son kullanılan öne alınır", () => {
    const txs = [
      tx({ categoryId: "market", timestamp: "2026-09-01T10:00:00.000Z" }),
      tx({ categoryId: "market", timestamp: "2026-09-01T11:00:00.000Z" }),
      tx({ categoryId: "yemek", timestamp: "2026-09-10T10:00:00.000Z" }),
      tx({ categoryId: "yemek", timestamp: "2026-09-10T11:00:00.000Z" }),
    ];
    // İkisi de 2'şer kez kullanılmış (eşit count); "yemek"in son kullanımı
    // (9-10) "market"inkinden (9-01) daha yeni, o yüzden önce gelmeli.
    const result = getTopCategoriesByUsage(txs, "expense");
    expect(result.map((c) => c.categoryId)).toEqual(["yemek", "market"]);
  });

  it("limit parametresine uyar", () => {
    const txs = ["a", "b", "c", "d", "e"].flatMap((categoryId) => [tx({ categoryId }), tx({ categoryId })]);
    expect(getTopCategoriesByUsage(txs, "expense", 2)).toHaveLength(2);
    expect(getTopCategoriesByUsage(txs, "expense")).toHaveLength(3);
  });

  it("veri yokken boş dizi döner", () => {
    expect(getTopCategoriesByUsage([], "expense")).toEqual([]);
  });
});
