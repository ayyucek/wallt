"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import BottomTabBar, { type TabKey } from "@/components/layout/BottomTabBar";
import BottomSheet from "@/components/sheets/BottomSheet";
import AddExpenseSheet from "@/components/sheets/AddExpenseSheet";
import Toast from "@/components/ui/Toast";
import HeroTotal from "@/components/genel/HeroTotal";
import SavingsSummaryCard from "@/components/genel/SavingsSummaryCard";
import CategoryBarChart from "@/components/genel/CategoryBarChart";
import CategoryPieChart from "@/components/genel/CategoryPieChart";
import ParetoChart from "@/components/genel/ParetoChart";
import CategoryRadarChart from "@/components/genel/CategoryRadarChart";
import RecentTransactions from "@/components/genel/RecentTransactions";
import { CUSTOM_PALETTE, DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  aggregate,
  filterByRange,
  isExpense,
  isSaving,
  paretoData,
  radarData,
  withSavingsBar,
} from "@/lib/calculations";
import { formatCurrency, formatRangeLabel } from "@/lib/format";
import { addCategory, addTransaction, fetchCategories, fetchTransactions } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Category, Transaction } from "@/lib/types";

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

  const [rangeStart] = useState(thisMonthStartStr);
  const [rangeEnd] = useState(todayStr);

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
  const pareto = useMemo(() => paretoData(agg), [agg]);
  const radar = useMemo(() => radarData(agg), [agg]);
  const radarAverage = radar[0]?.average ?? 0;

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

  return (
    <>
      <TopBar
        onExportClick={() => setExportSheetOpen(true)}
        onShareClick={() => {}}
        onLogoutClick={handleLogout}
      />

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {loadError && (
          <p className="mt-6 rounded-card bg-card p-4 text-center text-sm font-semibold text-category-saglik shadow-card">
            Veriler yüklenemedi: {loadError}
          </p>
        )}
        {!loadError && loading && (
          <p className="mt-10 text-center text-sm text-muted">Yükleniyor…</p>
        )}
        {!loadError && !loading && activeTab === "genel" ? (
          <div>
            <HeroTotal
              total={totalExpenses}
              rangeLabel={formatRangeLabel(rangeStart, rangeEnd)}
              onFilterClick={() => setRangeSheetOpen(true)}
            />
            <SavingsSummaryCard total={totalSavings} />

            <section className="mb-4 rounded-card bg-card p-4 shadow-card">
              <h3 className="mb-1 text-sm font-bold text-ink">Kategoriye Göre Harcama</h3>
              <p className="mb-3 text-xs font-medium text-muted">En çok harcanandan en aza sıralı</p>
              <CategoryBarChart data={barData} />
            </section>

            <section className="mb-4 rounded-card bg-card p-4 shadow-card">
              <h3 className="mb-1 text-sm font-bold text-ink">Kategori Dağılımı</h3>
              <p className="mb-3 text-xs font-medium text-muted">Oransal dağılım</p>
              <CategoryPieChart data={pieData} />
            </section>

            <section className="mb-4 rounded-card bg-card p-4 shadow-card">
              <h3 className="mb-1 text-sm font-bold text-ink">Pareto / Kümülatif Etki</h3>
              <p className="mb-3 text-xs font-medium text-muted">
                Kategoriler büyükten küçüğe, %80 referans çizgisiyle
              </p>
              <ParetoChart data={pareto} />
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
        ) : (
          !loadError &&
          !loading && (
            <p className="mt-10 text-center text-sm text-muted">
              İstatistikler — içerik Faz 6&apos;da eklenecek
            </p>
          )
        )}
      </main>

      <Toast message={toast} />

      <BottomTabBar
        active={activeTab}
        onTabChange={setActiveTab}
        onAddClick={() => setAddSheetOpen(true)}
      />

      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="Harcama Ekle">
        <AddExpenseSheet
          categories={categories}
          onSubmit={handleAddTransaction}
          onAddCategory={handleAddCategory}
          onClose={() => setAddSheetOpen(false)}
        />
      </BottomSheet>

      <BottomSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title="Rapor Önizleme">
        <p className="text-sm text-muted">İçerik Faz 9&apos;da eklenecek.</p>
      </BottomSheet>

      <BottomSheet open={rangeSheetOpen} onClose={() => setRangeSheetOpen(false)} title="Zaman Aralığı">
        <p className="text-sm text-muted">Filtre içeriği Faz 5&apos;te eklenecek.</p>
      </BottomSheet>
    </>
  );
}
