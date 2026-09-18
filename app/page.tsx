"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import InstallHint from "@/components/pwa/InstallHint";
import BottomTabBar, { type TabKey } from "@/components/layout/BottomTabBar";
import Sidebar from "@/components/layout/Sidebar";
import BottomSheet from "@/components/sheets/BottomSheet";
import AddExpenseSheet, { type RecurringPaymentDraft } from "@/components/sheets/AddExpenseSheet";
import DateRangeSheet from "@/components/sheets/DateRangeSheet";
import ExportSheet from "@/components/sheets/ExportSheet";
import CategoryManagementSheet from "@/components/sheets/CategoryManagementSheet";
import Toast from "@/components/ui/Toast";
import HeroTotal from "@/components/genel/HeroTotal";
import SavingsSummaryCard from "@/components/genel/SavingsSummaryCard";
import CategoryBarChart from "@/components/genel/CategoryBarChart";
import CategoryPieChart from "@/components/genel/CategoryPieChart";
import CategoryRadarChart from "@/components/genel/CategoryRadarChart";
import TransactionList from "@/components/hareketler/TransactionList";
import TransactionActionsSheet from "@/components/hareketler/TransactionActionsSheet";
import HareketlerRangePicker from "@/components/hareketler/HareketlerRangePicker";
import CategoryFilterChips from "@/components/hareketler/CategoryFilterChips";
import PeriodPicker from "@/components/istatistikler/PeriodPicker";
import PeriodStats from "@/components/istatistikler/PeriodStats";
import CompareBarChart from "@/components/istatistikler/CompareBarChart";
import CompareParetoChart from "@/components/istatistikler/CompareParetoChart";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  aggregate,
  compareBarData,
  compareParetoData,
  buildCumulativeDateMap,
  granularityLabel,
  periodGranularity,
  diffPercent,
  filterByRange,
  getFrequentExpenses,
  getTopCategoriesByUsage,
  isExpense,
  isSaving,
  quickRange,
  radarData,
  withSavingSegments,
  type QuickRangeKey,
} from "@/lib/calculations";
import { formatCurrency, formatRangeLabel } from "@/lib/format";
import {
  addCategory,
  addRecurringPayment,
  addTransaction,
  checkAndGenerateRecurringPayments,
  deleteCategory,
  deleteTransaction,
  fetchCategories,
  fetchRecurringPayments,
  fetchTransactions,
  updateCategory,
  updateTransaction,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  DateRange,
  FrequentExpense,
  RecurringPayment,
  Transaction,
  TransactionType,
} from "@/lib/types";

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
  if (typeof err === "object" && err !== null) {
    const code = "code" in err ? String((err as { code: unknown }).code) : "";
    const rawMessage = "message" in err ? String((err as { message: unknown }).message) : "";
    // lib/storage.ts bu hatayı bir kez sessizce yeniden dener; buraya kadar
    // geldiyse (retry de başarısız oldu) kullanıcıya ham "JWT issued at
    // future..." metnini göstermek yerine anlaşılır bir Türkçe mesaj basıyoruz
    // (bkz. Teknik Analiz Bölüm 5.9).
    if (code === "PGRST303" || rawMessage.includes("JWT issued at future")) {
      return "Cihazının saati yanlış görünüyor. Ayarlar'dan tarih/saati otomatik güncellemeyi aç ve tekrar dene.";
    }
    if (rawMessage) return rawMessage;
  }
  if (err instanceof Error) return err.message;
  return "Veriler yüklenemedi.";
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("genel");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [initialAddCategoryId, setInitialAddCategoryId] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [actionsSheetTransaction, setActionsSheetTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [txs, cats, recurring] = await Promise.all([
          fetchTransactions(),
          fetchCategories(),
          fetchRecurringPayments(),
        ]);
        if (cancelled) return;

        // Açılışta bir kez: kaçırılan taksit/abonelik ayları var mı kontrol
        // edilir (Faz 3, Teknik Analiz 5.14). Üretim olduysa transactions ve
        // recurring_payments güncel id/alanlarla yeniden fetch edilir — RPC
        // void döndüğü için üretilen kayıtları başka türlü öğrenemeyiz.
        const didGenerate = await checkAndGenerateRecurringPayments(recurring);
        if (cancelled) return;

        if (didGenerate) {
          const [freshTxs, freshRecurring] = await Promise.all([
            fetchTransactions(),
            fetchRecurringPayments(),
          ]);
          if (cancelled) return;
          setTransactions(freshTxs);
          setCategories(cats);
          setRecurringPayments(freshRecurring);
        } else {
          setTransactions(txs);
          setCategories(cats);
          setRecurringPayments(recurring);
        }
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

  // Sık Kullanılanlar şeridi (PRD 5.1.2) — seçili tarih aralığından bağımsız,
  // tüm geçmişten hesaplanır: "sık kullanılan" kavramı o an filtrelenmiş
  // döneme değil, kullanıcının genel alışkanlığına bakmalı. Harcama ve
  // Tasarruf için AYRI hesaplanır (15 Eylül 2026, 2. revizyon) — her type'ın
  // kendi top-3 kategorisiyle sınırlı bir liste elde eder; AddExpenseSheet
  // kendi entryType state'ine göre bunlardan doğru olanı seçer.
  const frequentExpensesByType = useMemo(() => {
    const result: Record<TransactionType, FrequentExpense[]> = { expense: [], saving: [] };
    (["expense", "saving"] as TransactionType[]).forEach((type) => {
      const topCategoryIds = new Set(getTopCategoriesByUsage(transactions, type).map((c) => c.categoryId));
      result[type] = getFrequentExpenses(transactions.filter((t) => t.type === type)).filter((e) =>
        topCategoryIds.has(e.categoryId)
      );
    });
    return result;
  }, [transactions]);

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
  const savingsAgg = useMemo(() => aggregate(savings, categories), [savings, categories]);
  const barData = useMemo(() => withSavingSegments(aggSorted, savingsAgg), [aggSorted, savingsAgg]);
  const pieData = useMemo(() => aggSorted.filter((c) => c.total > 0), [aggSorted]);

  const [grafiklerRangeStart, setGrafiklerRangeStart] = useState(thisMonthStartStr);
  const [grafiklerRangeEnd, setGrafiklerRangeEnd] = useState(todayStr);
  const [grafiklerRangeSheetOpen, setGrafiklerRangeSheetOpen] = useState(false);

  function handleGrafiklerQuickRange(preset: QuickRangeKey) {
    const range = quickRange(preset);
    setGrafiklerRangeStart(range.start);
    setGrafiklerRangeEnd(range.end);
  }

  const grafiklerFiltered = useMemo(
    () => filterByRange(transactions, grafiklerRangeStart, grafiklerRangeEnd),
    [transactions, grafiklerRangeStart, grafiklerRangeEnd]
  );
  const grafiklerExpenses = useMemo(() => grafiklerFiltered.filter(isExpense), [grafiklerFiltered]);
  const grafiklerSavings = useMemo(() => grafiklerFiltered.filter(isSaving), [grafiklerFiltered]);
  const grafiklerAgg = useMemo(
    () => aggregate(grafiklerExpenses, categories),
    [grafiklerExpenses, categories]
  );
  const grafiklerAggSorted = useMemo(
    () => [...grafiklerAgg].sort((a, b) => b.total - a.total),
    [grafiklerAgg]
  );
  const grafiklerSavingsAgg = useMemo(
    () => aggregate(grafiklerSavings, categories),
    [grafiklerSavings, categories]
  );
  const grafiklerBarData = useMemo(
    () => withSavingSegments(grafiklerAggSorted, grafiklerSavingsAgg),
    [grafiklerAggSorted, grafiklerSavingsAgg]
  );
  const grafiklerPieData = useMemo(
    () => grafiklerAggSorted.filter((c) => c.total > 0),
    [grafiklerAggSorted]
  );
  const grafiklerRadar = useMemo(() => radarData(grafiklerAgg), [grafiklerAgg]);
  const grafiklerRadarAverage = grafiklerRadar[0]?.average ?? 0;

  // Son Hareketler'in kendi tarih + kategori filtresi (12 Eylül 2026 eklentisi)
  // — Genel Bakış/Grafikler'in aralıklarından tamamen bağımsız. "Tüm
  // Zamanlar" sabit bir epoch'a (2000-01-01) döner; gerçekçi bir kullanıcı
  // verisinin bundan önce olması beklenmez, bu yüzden min tarihi hesaplamaya
  // gerek yok.
  const [hareketlerRangeStart, setHareketlerRangeStart] = useState(thisMonthStartStr);
  const [hareketlerRangeEnd, setHareketlerRangeEnd] = useState(todayStr);
  const [hareketlerCategoryIds, setHareketlerCategoryIds] = useState<string[]>([]);
  const [hareketlerFilterSheetOpen, setHareketlerFilterSheetOpen] = useState(false);

  function handleHareketlerQuickRange(preset: QuickRangeKey) {
    const range = quickRange(preset);
    setHareketlerRangeStart(range.start);
    setHareketlerRangeEnd(range.end);
  }

  function handleHareketlerAllTime() {
    setHareketlerRangeStart("2000-01-01");
    setHareketlerRangeEnd(todayStr());
  }

  function toggleHareketlerCategory(id: string) {
    setHareketlerCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const hareketlerFiltered = useMemo(() => {
    const byRange = filterByRange(transactions, hareketlerRangeStart, hareketlerRangeEnd);
    return hareketlerCategoryIds.length === 0
      ? byRange
      : byRange.filter((t) => hareketlerCategoryIds.includes(t.categoryId));
  }, [transactions, hareketlerRangeStart, hareketlerRangeEnd, hareketlerCategoryIds]);

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
  const periodADateAt = useMemo(
    () => buildCumulativeDateMap(txA, periodA.start, periodA.end),
    [txA, periodA]
  );
  const periodAGranularityLabel = useMemo(
    () => granularityLabel(periodGranularity(periodA.start, periodA.end)),
    [periodA]
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function sortByTimestampDesc(list: Transaction[]): Transaction[] {
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async function handleSubmitTransaction(input: Omit<Transaction, "id">) {
    if (editingTransaction) {
      const tx = await updateTransaction(editingTransaction.id, input);
      setTransactions((prev) => sortByTimestampDesc(prev.map((t) => (t.id === tx.id ? tx : t))));
      setAddSheetOpen(false);
      setToast(`"${tx.title}" güncellendi`);
      return;
    }

    const tx = await addTransaction(input);
    setTransactions((prev) => sortByTimestampDesc([...prev, tx]));
    setAddSheetOpen(false);
    setToast(
      input.type === "saving"
        ? `Tasarruf kaydedildi — ${formatCurrency(input.amount)}`
        : `"${input.title}" eklendi — ${formatCurrency(input.amount)}`
    );
  }

  // Düzenli ödeme tanımlama (Faz 2, PRD 5.6, Teknik Analiz 5.14) — ilk taksit/
  // abonelik dönemi burada elle oluşturulur: hem recurring_payments satırı hem
  // "bugünün" (startDate) transaction'ı tek kullanıcı etkileşiminde yazılır.
  // last_generated_date bilerek startDate'e (bugüne) set edilir ki Faz 3'teki
  // otomatik üretim bu ilk dönemi asla tekrar üretmesin.
  async function handleSubmitRecurring(input: RecurringPaymentDraft) {
    const paymentDay =
      input.type === "subscription" ? parseInt(input.startDate.slice(8, 10), 10) : null;
    const installmentsPaid = input.type === "installment" ? 1 : 0;

    const recurringPayment = await addRecurringPayment({
      type: input.type,
      title: input.title,
      categoryId: input.categoryId,
      amount: input.amount,
      startDate: input.startDate,
      installmentCount: input.installmentCount,
      paymentDay,
      installmentsPaid,
      lastGeneratedDate: input.startDate,
    });
    setRecurringPayments((prev) => [...prev, recurringPayment]);

    const tx = await addTransaction({
      type: "expense",
      title: input.title,
      description: input.description,
      amount: input.amount,
      categoryId: input.categoryId,
      timestamp: input.timestamp,
      recurringPaymentId: recurringPayment.id,
    });
    setTransactions((prev) => sortByTimestampDesc([...prev, tx]));
    setAddSheetOpen(false);
    setToast(`"${input.title}" düzenli ödeme olarak eklendi — ${formatCurrency(input.amount)}`);
  }

  function openEditSheet(transaction: Transaction) {
    setEditingTransaction(transaction);
    setInitialAddCategoryId(undefined);
    setAddSheetOpen(true);
    setActionsSheetTransaction(null);
  }

  function requestDeleteTransaction(transaction: Transaction) {
    setDeletingTransaction(transaction);
    setActionsSheetTransaction(null);
  }

  async function handleConfirmDelete() {
    if (!deletingTransaction) return;
    const tx = deletingTransaction;
    await deleteTransaction(tx.id);
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    setDeletingTransaction(null);
    setToast(`"${tx.title}" silindi`);
  }

  async function handleAddCategory(name: string, color: string): Promise<Category> {
    const category = await addCategory({ name, color });
    setCategories((prev) => [...prev, category]);
    return category;
  }

  async function handleUpdateCategory(id: string, input: { name: string; color: string }): Promise<void> {
    const updated = await updateCategory(id, input);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  // Silme öncesi bağlı kayıt sayısı zaten bellekteki transactions'tan
  // hesaplanıyor (bkz. CategoryManagementSheet) — burada sadece storage.ts'in
  // toplu taşı+sil işlemini çağırıp local state'i (hem categories hem
  // transactions) DB ile senkron tutuyoruz.
  async function handleDeleteCategory(id: string): Promise<void> {
    await deleteCategory(id, "diger");
    setTransactions((prev) => prev.map((t) => (t.categoryId === id ? { ...t, categoryId: "diger" } : t)));
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function openAddSheet(categoryId?: string) {
    setEditingTransaction(undefined);
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
            onSettingsClick={() => setCategoryManagementOpen(true)}
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
                  {/* key: sheet açılışında bara dokunma hem sheet'i açıyor hem de
                      Recharts'ın kendi tooltip/hover state'ini tetikliyor; sheet
                      kapandığında bu state "takılı" kalabiliyordu (bkz. Teknik
                      Analiz Bölüm 5.10) — addSheetOpen değiştiğinde chart'ı
                      remount ederek tooltip'i garantili sıfırlıyoruz. */}
                  <CategoryBarChart key={String(addSheetOpen)} data={barData} onBarClick={openAddSheet} />
                </section>
              </div>
            )}

            {!loadError && !loading && activeTab === "hareketler" && (
              <div>
                <div className="mb-4 flex items-stretch gap-3">
                  <div className="flex flex-1 flex-col justify-center gap-1 rounded-card bg-card p-4 shadow-card">
                    <span className="text-xs font-semibold text-muted">
                      {formatRangeLabel(hareketlerRangeStart, hareketlerRangeEnd)}
                    </span>
                    {hareketlerCategoryIds.length > 0 && (
                      <span className="text-[11px] font-semibold text-muted">
                        {hareketlerCategoryIds.length} kategori seçili
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHareketlerFilterSheetOpen(true)}
                    aria-label="Filtrele"
                    className="flex w-12 flex-shrink-0 items-center justify-center rounded-card bg-card text-ink shadow-card active:scale-95"
                  >
                    <Filter size={18} />
                  </button>
                </div>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Son Hareketler</h3>
                  <TransactionList
                    transactions={hareketlerFiltered}
                    categories={categories}
                    onRowClick={setActionsSheetTransaction}
                  />
                </section>
              </div>
            )}

            {!loadError && !loading && activeTab === "grafikler" && (
              <div>
                <div className="mb-4 flex items-stretch gap-3">
                  <div className="flex flex-1 flex-col justify-center gap-1 rounded-card bg-card p-4 shadow-card">
                    <span className="text-xs font-semibold text-muted">Seçili dönem</span>
                    <span className="text-sm font-bold text-ink">
                      {formatRangeLabel(grafiklerRangeStart, grafiklerRangeEnd)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGrafiklerRangeSheetOpen(true)}
                    aria-label="Zaman aralığını filtrele"
                    className="flex w-12 flex-shrink-0 items-center justify-center rounded-card bg-card text-ink shadow-card active:scale-95"
                  >
                    <Filter size={18} />
                  </button>
                </div>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategoriye Göre Harcama</h3>
                  <p className="mb-3 text-xs font-medium text-muted">En çok harcanandan en aza sıralı</p>
                  <CategoryBarChart key={String(addSheetOpen)} data={grafiklerBarData} onBarClick={openAddSheet} />
                </section>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategori Dağılımı</h3>
                  <p className="mb-3 text-xs font-medium text-muted">Oransal dağılım</p>
                  <CategoryPieChart data={grafiklerPieData} />
                </section>

                <section className="mb-4 rounded-card bg-card p-4 shadow-card">
                  <h3 className="mb-1 text-sm font-bold text-ink">Kategori Ağırlık Haritası</h3>
                  <p className="mb-3 text-xs font-medium text-muted">Her kategorinin ortalamaya göre konumu</p>
                  <CategoryRadarChart data={grafiklerRadar} average={grafiklerRadarAverage} />
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
                  <h3 className="mb-1 text-sm font-bold text-ink">Pareto Karşılaştırma</h3>
                  <p className="mb-3 text-xs font-medium text-muted">
                    Barlar tutar, çizgiler kümülatif % · Dönem A düz, Dönem B kesikli çizgi
                  </p>
                  <CompareParetoChart
                    data={comparePareto}
                    periodALabel={periodA.label}
                    periodBLabel={periodB.label}
                    periodADateAt={periodADateAt}
                    periodAGranularityLabel={periodAGranularityLabel}
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

      <BottomSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title={
          editingTransaction
            ? editingTransaction.type === "saving"
              ? "Tasarrufu Düzenle"
              : "Harcamayı Düzenle"
            : "Harcama Ekle"
        }
      >
        <AddExpenseSheet
          categories={categories}
          initialCategoryId={initialAddCategoryId}
          editingTransaction={editingTransaction}
          frequentExpensesByType={frequentExpensesByType}
          onSubmit={handleSubmitTransaction}
          onSubmitRecurring={handleSubmitRecurring}
          onAddCategory={handleAddCategory}
          onClose={() => setAddSheetOpen(false)}
        />
      </BottomSheet>

      <BottomSheet
        open={actionsSheetTransaction !== null}
        onClose={() => setActionsSheetTransaction(null)}
        title={actionsSheetTransaction?.title || "İşlem"}
      >
        {actionsSheetTransaction && (
          <TransactionActionsSheet
            onEdit={() => openEditSheet(actionsSheetTransaction)}
            onDelete={() => requestDeleteTransaction(actionsSheetTransaction)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={deletingTransaction !== null}
        onClose={() => setDeletingTransaction(null)}
        title="Emin misin?"
      >
        {deletingTransaction && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-muted">
              &ldquo;{deletingTransaction.title}&rdquo; kaydını silmek istediğine emin misin? Bu işlem
              geri alınamaz.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-pill bg-category-saglik py-3 text-sm font-bold text-white"
              >
                Sil
              </button>
              <button
                type="button"
                onClick={() => setDeletingTransaction(null)}
                className="flex-1 rounded-pill bg-surface2 py-3 text-sm font-bold text-ink"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title="Rapor Önizleme">
        <ExportSheet
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={totalExpenses}
          categories={pieData}
        />
      </BottomSheet>

      <BottomSheet
        open={categoryManagementOpen}
        onClose={() => setCategoryManagementOpen(false)}
        title="Kategorileri Yönet"
      >
        <CategoryManagementSheet
          categories={categories}
          transactions={transactions}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
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
        open={hareketlerFilterSheetOpen}
        onClose={() => setHareketlerFilterSheetOpen(false)}
        title="Filtrele"
      >
        <div className="flex flex-col gap-4">
          <HareketlerRangePicker
            start={hareketlerRangeStart}
            end={hareketlerRangeEnd}
            onStartChange={setHareketlerRangeStart}
            onEndChange={setHareketlerRangeEnd}
            onQuickSelect={handleHareketlerQuickRange}
            onAllTime={handleHareketlerAllTime}
          />
          <CategoryFilterChips
            categories={categories}
            selectedIds={hareketlerCategoryIds}
            onToggle={toggleHareketlerCategory}
            onClearAll={() => setHareketlerCategoryIds([])}
          />
          <button
            type="button"
            onClick={() => setHareketlerFilterSheetOpen(false)}
            className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary"
          >
            Tamam
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={grafiklerRangeSheetOpen}
        onClose={() => setGrafiklerRangeSheetOpen(false)}
        title="Zaman Aralığı"
      >
        <DateRangeSheet
          start={grafiklerRangeStart}
          end={grafiklerRangeEnd}
          onStartChange={setGrafiklerRangeStart}
          onEndChange={setGrafiklerRangeEnd}
          onQuickSelect={handleGrafiklerQuickRange}
          onClose={() => setGrafiklerRangeSheetOpen(false)}
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
