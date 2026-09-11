import { describe, expect, it } from "vitest";
import {
  aggregate,
  filterByRange,
  isExpense,
  isSaving,
  paretoData,
  radarData,
  txDateStr,
  withSavingsBar,
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

describe("withSavingsBar", () => {
  it("toplam tasarruf 0 veya negatifse diziyi değiştirmeden döner", () => {
    const agg = aggregate([tx({ categoryId: "yemek", amount: 100 })], categories);
    expect(withSavingsBar(agg, 0)).toEqual(agg);
  });

  it("toplam tasarruf > 0 ise sona sentetik bir 'Tasarruf' barı ekler", () => {
    const agg = aggregate([tx({ categoryId: "yemek", amount: 100 })], categories);
    const result = withSavingsBar(agg, 250);
    const savingsEntry = result[result.length - 1];
    expect(savingsEntry).toMatchObject({
      id: "__savings__",
      name: "Tasarruf",
      total: 250,
      isSaving: true,
    });
  });
});
