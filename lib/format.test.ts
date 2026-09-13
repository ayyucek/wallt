import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("ondalıklı bir tutarı nokta ayracıyla iki basamak gösterir", () => {
    expect(formatCurrency(43.12)).toBe("₺43.12");
  });

  it("tam sayı bir tutara da iki ondalık basamak ekler", () => {
    expect(formatCurrency(100)).toBe("₺100.00");
  });

  it("tek ondalık basamaklı bir tutarı iki basamağa tamamlar", () => {
    expect(formatCurrency(9.5)).toBe("₺9.50");
  });

  it("floating-point birikim gürültüsünü yutar (0.1 + 0.2 senaryosu)", () => {
    const accumulated = 0.1 + 0.2; // 0.30000000000000004
    expect(formatCurrency(accumulated)).toBe("₺0.30");
  });

  it("2. ondalık basamağı standart kurala göre yuvarlar", () => {
    expect(formatCurrency(43.126)).toBe("₺43.13");
  });

  it("binlik ayraç eklemez (nokta-ondalık kararıyla çelişmesin diye)", () => {
    expect(formatCurrency(1234.56)).toBe("₺1234.56");
  });
});
