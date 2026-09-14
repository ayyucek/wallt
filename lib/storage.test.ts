import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// JWT clock-skew (PGRST303) retry davranışını doğrular — bkz. Teknik Analiz
// Bölüm 5.9. Supabase client'ı mock'layıp query builder'ın döndürdüğü
// { data, error } sonucunu kontrol ediyoruz.
const mockOrder = vi.fn();
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("./supabase/client", () => ({
  createClient: () => ({ from: mockFrom }),
}));

const PGRST303_ERROR = { code: "PGRST303", message: "JWT issued at future UTC: 2026-09-14T12:00:00Z" };

describe("fetchTransactions — JWT clock-skew retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockOrder.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("PGRST303 sonrası ~1.5sn bekleyip bir kez sessizce tekrar dener ve başarılı olursa veriyi döner", async () => {
    mockOrder
      .mockResolvedValueOnce({ data: null, error: PGRST303_ERROR })
      .mockResolvedValueOnce({ data: [], error: null });

    const { fetchTransactions } = await import("./storage");
    const promise = fetchTransactions();
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toEqual([]);
    expect(mockOrder).toHaveBeenCalledTimes(2);
  });

  it("retry de PGRST303 ile başarısız olursa orijinal hatayı fırlatır", async () => {
    mockOrder.mockResolvedValue({ data: null, error: PGRST303_ERROR });

    const { fetchTransactions } = await import("./storage");
    const promise = fetchTransactions();
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).rejects.toEqual(PGRST303_ERROR);
    expect(mockOrder).toHaveBeenCalledTimes(2);
  });

  it("PGRST303 olmayan hatalarda retry denemez, direkt fırlatır", async () => {
    const otherError = { code: "42501", message: "permission denied for table transactions" };
    mockOrder.mockResolvedValue({ data: null, error: otherError });

    const { fetchTransactions } = await import("./storage");
    await expect(fetchTransactions()).rejects.toEqual(otherError);
    expect(mockOrder).toHaveBeenCalledTimes(1);
  });
});
