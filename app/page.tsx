"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import InstallHint from "@/components/pwa/InstallHint";
import BottomTabBar, { type TabKey } from "@/components/layout/BottomTabBar";
import Sidebar from "@/components/layout/Sidebar";
import BottomSheet from "@/components/sheets/BottomSheet";
import AddExpenseSheet from "@/components/sheets/AddExpenseSheet";
import DateRangeSheet from "@/components/sheets/DateRangeSheet";
import ExportSheet from "@/components/sheets/ExportSheet";
import Toast from "@/components/ui/Toast";
import HeroTotal from "@/components/genel/HeroTotal";
import SavingsSummaryCard from "@/components/genel/SavingsSummaryCard";
import CategoryBarChart from "@/components/genel/CategoryBarChart";
import CategoryRadarChart from "@/components/genel/CategoryRadarChart";
import RecentTransactions from "@/components/genel/RecentTransactions";
import PeriodPicker from "@/components/istatistikler/PeriodPicker";
import PeriodStats from "@/components/istatistikler/PeriodStats";
import CompareBarChart from "@/components/istatistikler/CompareBarChart";
import ComparePieChart from "@/components/istatistikler/ComparePieChart";
import CompareParetoChart from "@/components/istatistikler/CompareParetoChart";
import { CUSTOM_PALETTE, DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  aggregate,
  compareBarData,
  compareParetoData,
  diffPercent,
  filterByRange,
  isExpense,
  isSaving,
  quickRange,
  radarData,
  withSavingsBar,
  type QuickRangeKey,
} from "@/lib/calculations";
import { formatCurrency, formatRangeLabel } from "@/lib/format";
import { addCategory, addTransaction, fetchCategories, fetchTransactions } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Category, DateRange, Transaction } from "@/lib/types";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthStartStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Supabase'in PostgrestError'ı gerçek bir Error instance'ı değil, düz bir
// { message, details, hint, code } nesnesidir — bu yüzden err.message'a
// instanceof Error kontrolü olmadan da erişebilmemiz gerekiyor.
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Veriler yüklenemedi.";
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("genel");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [initialAddCategoryId, setInitialAddCategoryId] = useState<string | undefined>(undefined);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [txs, cats] = await Promise.all([fetchTransactions(), fetchCategories()]);
        if (cancelled) return;
        setTransactions(txs);
        setCategories(cats);
      } catch (err) {
        if (cancelled) return;
        setLoadError(errorMessage(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const [rangeStart, setRangeStart] = useState(thisMonthStartStr);
  const [rangeEnd, setRangeEnd] = useState(todayStr);

  function handleQuickRange(preset: QuickRangeKey) {
    const range = quickRange(preset);
    setRangeStart(range.start);
    setRangeEnd(range.end);
  }

  const [periodA, setPeriodA] = useState<DateRange>(() => quickRange("lastmonth"));
  const [periodB, setPeriodB] = useState<DateRange>(() => quickRange("month"));
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);

  function handlePeriodQuickSelect(which: "A" | "B", preset: QuickRangeKey) {
    const range = quickRange(preset);
    if (which === "A") setPeriodA(range);
    else setPeriodB(range);
  }

  function handlePeriodStartChange(which: "A" | "B", value: string) {
    const setter = which === "A" ? setPeriodA : setPeriodB;
    setter((prev) => ({ ...prev, start: value, label: "Özel" }));
  }

  function handlePeriodEndChange(which: "A" | "B", value: string) {
    const setter = which === "A" ? setPeriodA : setPeriodB;
    setter((prev) => ({ ...prev, end: value, label: "Özel" }));
  }

  const filtered = useMemo(
    () => filterByRange(transactions, rangeStart, rangeEnd),
    [transactions, rangeStart, rangeEnd]
  );
  const expenses = useMemo(() => filtered.filter(isExpense), [filtered]);
  const savings = useMemo(() => filtered.filter(isSaving), [filtered]);

  const agg = useMemo(() => aggregate(expenses, categories), [expenses, categories]);
  const aggSorted = useMemo(() => [...agg].sort((a, b) => b.total - a.total), [agg]);
  const totalExpenses = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses]);
  const totalSavings = useMemo(() => savings.reduce((s, t) => s + t.amount, 0), [savings]);
  const barData = useMemo(() => withSavingsBar(aggSorted, totalSavings), [aggSorted, totalSavings]);
  const pieData = useMemo(() => aggSorted.filter((c) => c.total > 0), [aggSorted]);
  const radar = useMemo(() => radarData(agg), [agg]);
  const radarAverage = radar[0]?.average ?? 0;

  const txA = useMemo(
    () => filterByRange(transactions, periodA.start, periodA.end).filter(isExpense),
    [transactions, periodA]
  );
  const txB = useMemo(
    () => filterByRange(transactions, periodB.start, periodB.end).filter(isExpense),
    [transactions, periodB]
  );
  const aggA = useMemo(() => aggregate(txA, categories), [txA, categories]);
  const aggB = useMemo(() => aggregate(txB, categories), [txB, categories]);
  const totalA = useMemo(() => txA.reduce((s, t) => s + t.amount, 0), [txA]);
  const totalB = useMemo(() => txB.reduce((s, t) => s + t.amount, 0), [txB]);
  const periodDiffPct = useMemo(() => diffPercent(totalA, totalB), [totalA, totalB]);
  const compareBar = useMemo(() => compareBarData(aggA, aggB, categories), [aggA, aggB, categories]);
  const comparePareto = useMemo(
    () => compareParetoData(aggA, aggB, categories, totalA, totalB),
    [aggA, aggB, categories, totalA, totalB]
  );
  const comparePieA = useMemo(() => aggA.filter((c) => c.total > 0), [aggA]);
  const comparePieB = useMemo(() => aggB.filter((c) => c.total > 0), [aggB]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleAddTransaction(input: Omit<Transaction, "id">) {
    const tx = await addTransaction(input);
    setTransactions((prev) =>
      [...prev, tx].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    );
    setAddSheetOpen(false);
    setToast(
      input.type === "saving"
        ? `Tasarruf kaydedildi — ${formatCurrency(input.amount)}`
        : `"${input.title}" eklendi — ${formatCurrency(input.amount)}`
    );
  }

  async function handleAddCategory(name: string): Promise<Category> {
    const color = CUSTOM_PALETTE[categories.length % CUSTOM_PALETTE.length];
    const category = await addCategory({ name, color });
    setCategories((prev) => [...prev, category]);
    return category;
  }

  function openAddSheet(categoryId?: string) {
    setInitialAddCategoryId(categoryId);
    setAddSheetOpen(true);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar
          active={activeTab}
          onTabChange={setActiveTab}
          onAddClick={() => openAddSheet()}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <TopBar
            onExportClick={() => setExportSheetOpen(true)}
            onShareClick={() => setExportSheetOpen(true)}
            onLogoutClick={handleLogout}
          />

          <main className="flex-1 overflow-y-auto px-4 pb-28 lg:px-8 lg:pb-8">
            <InstallHint />
            {loadError && (
              <p className="mt-6 rounded-card bg-card p-4 text-center text-sm font-semibold text-category-saglik shadow-card">
                Veriler yüklenemedi: {loadError}
              </p>
            )}
            {!loadError && loading && (
              <p className="mt-10 text-center text-sm text-muted">Yükleniyor…</p>
            )}
            {!loadError && !loading && activeTab === "genel" && (
              <div>
                <HeroTotal
                  total={totalExpenses}
                  rangeLabel={formatRangeLabel(rangeStart, rangeEnd)}
                  onFilterClick={() => setRangeSheetOpen(true)}
                />
                <SavingsSummaryCard total={totalSavings} />

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategoriye Göre Harcama</h3>
                  <p className="mb-3 text-xs font-medium text-muted">
                    En çok harcanandan en aza sıralı — bir bara dokunarak o kategoriye harcama ekleyebilirsin
                  </p>
                  <CategoryBarChart data={barData} onBarClick={openAddSheet} />
                </section>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategori Ağırlık Haritası</h3>
                  <p className="mb-3 text-xs font-medium text-muted">Her kategorinin ortalamaya göre konumu</p>
                  <CategoryRadarChart data={radar} average={radarAverage} />
                </section>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-3 text-sm font-bold text-ink">Son Hareketler</h3>
                  <RecentTransactions transactions={transactions} categories={categories} />
                </section>
              </div>
            )}

            {!loadError && !loading && activeTab === "istatistikler" && (
              <div>
                <div className="mb-4 flex items-stretch gap-3">
                  <div className="flex flex-1 flex-col justify-center gap-2 rounded-card bg-card p-4 shadow-card">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-periodA" />
                      <span className="text-xs font-bold text-ink">Dönem A · {periodA.label}</span>
                      <span className="ml-auto text-[11px] font-semibold text-muted">
                        {formatRangeLabel(periodA.start, periodA.end)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-periodB" />
                      <span className="text-xs font-bold text-ink">Dönem B · {periodB.label}</span>
                      <span className="ml-auto text-[11px] font-semibold text-muted">
                        {formatRangeLabel(periodB.start, periodB.end)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPeriodSheetOpen(true)}
                    aria-label="Dönemleri düzenle"
                    className="flex w-12 flex-shrink-0 items-center justify-center rounded-card bg-card text-ink shadow-card active:scale-95"
                  >
                    <Filter size={18} />
                  </button>
                </div>

                <PeriodStats totalA={totalA} totalB={totalB} diffPct={periodDiffPct} />

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategori Bazlı Karşılaştırma</h3>
                  <p className="mb-3 text-xs font-medium text-muted">Her kategori için iki dönem yan yana</p>
                  <CompareBarChart data={compareBar} periodALabel={periodA.label} periodBLabel={periodB.label} />
                </section>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategori Dağılımı Karşılaştırma</h3>
                  <p className="mb-3 text-xs font-medium text-muted">İç içe halkalar — iç: Dönem A, dış: Dönem B</p>
                  <ComparePieChart
                    dataA={comparePieA}
                    dataB={comparePieB}
                    periodALabel={periodA.label}
                    periodBLabel={periodB.label}
                  />
                </section>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Pareto Karşılaştırma</h3>
                  <p className="mb-3 text-xs font-medium text-muted">
                    Barlar tutar, çizgiler kümülatif % · Dönem A düz, Dönem B kesikli çizgi
                  </p>
                  <CompareParetoChart
                    data={comparePareto}
                    periodALabel={periodA.label}
                    periodBLabel={periodB.label}
                  />
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

      <Toast message={toast} />

      <div className="lg:hidden">
        <BottomTabBar
          active={activeTab}
          onTabChange={setActiveTab}
          onAddClick={() => openAddSheet()}
        />
      </div>

      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="Harcama Ekle">
        <AddExpenseSheet
          categories={categories}
          initialCategoryId={initialAddCategoryId}
          onSubmit={handleAddTransaction}
          onAddCategory={handleAddCategory}
          onClose={() => setAddSheetOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title="Rapor Önizleme">
        <ExportSheet
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={totalExpenses}
          categories={pieData}
        />
      </BottomSheet>

      <BottomSheet open={rangeSheetOpen} onClose={() => setRangeSheetOpen(false)} title="Zaman Aralığı">
        <DateRangeSheet
          start={rangeStart}
          end={rangeEnd}
          onStartChange={setRangeStart}
          onEndChange={setRangeEnd}
          onQuickSelect={handleQuickRange}
          onClose={() => setRangeSheetOpen(false)}
        />
      </BottomSheet>

      <BottomSheet
        open={periodSheetOpen}
        onClose={() => setPeriodSheetOpen(false)}
        title="Dönemleri Düzenle"
      >
        <div className="flex flex-col gap-3">
          <PeriodPicker
            which="A"
            range={periodA}
            onStartChange={(value) => handlePeriodStartChange("A", value)}
            onEndChange={(value) => handlePeriodEndChange("A", value)}
            onQuickSelect={(preset) => handlePeriodQuickSelect("A", preset)}
          />
          <PeriodPicker
            which="B"
            range={periodB}
            onStartChange={(value) => handlePeriodStartChange("B", value)}
            onEndChange={(value) => handlePeriodEndChange("B", value)}
            onQuickSelect={(preset) => handlePeriodQuickSelect("B", preset)}
          />
          <button
            type="button"
            onClick={() => setPeriodSheetOpen(false)}
            className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary"
          >
            Tamam
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
