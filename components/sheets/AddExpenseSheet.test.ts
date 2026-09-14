import { describe, expect, it } from "vitest";
import { sanitizeAmountInput } from "./AddExpenseSheet";

// Tutar alanı type="number"'dan type="text" + inputMode="decimal"'e geçti
// (bkz. Teknik Analiz Bölüm 5.10 — iOS'ta number input'un klavye
// accessory'si komşu alanlarla karışıyordu). Native number input artık
// karakter filtrelemesini yapmadığı için bunu elle doğruluyoruz.
describe("sanitizeAmountInput", () => {
  it("rakam ve tek noktayı olduğu gibi bırakır", () => {
    expect(sanitizeAmountInput("43.12")).toBe("43.12");
  });

  it("harf ve sembolleri eler", () => {
    expect(sanitizeAmountInput("₺43a.1b2x")).toBe("43.12");
  });

  it("ikinci noktayı yok sayar", () => {
    expect(sanitizeAmountInput("12.3.4")).toBe("12.34");
  });

  it("boş girdiyi boş döner", () => {
    expect(sanitizeAmountInput("")).toBe("");
  });
});
