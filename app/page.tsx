"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import BottomTabBar, { type TabKey } from "@/components/layout/BottomTabBar";
import BottomSheet from "@/components/sheets/BottomSheet";
import HeroTotal from "@/components/genel/HeroTotal";
import SavingsSummaryCard from "@/components/genel/SavingsSummaryCard";
import CategoryBarChart from "@/components/genel/CategoryBarChart";
import CategoryPieChart from "@/components/genel/CategoryPieChart";
import ParetoChart from "@/components/genel/ParetoChart";
import CategoryRadarChart from "@/components/genel/CategoryRadarChart";
import RecentTransactions from "@/components/genel/RecentTransactions";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  aggregate,
  filterByRange,
  isExpense,
  isSaving,
  paretoData,
  radarData,
  withSavingsBar,
} from "@/lib/calculations";
import { formatRangeLabel } from "@/lib/format";
import { generateSeedData } from "@/lib/seed";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonthStartStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("genel");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);

  // generateSeedData() Math.random() kullanır; server render ile client
  // hydration'ı aynı veriyi üretmeyeceğinden mock veri sadece mount sonrası
  // client'ta oluşturulur (aksi halde hydration mismatch oluşur).
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  useEffect(() => {
    // Bilinçli istisna: bu setState, dış/rastgele bir kaynağı (mock veri)
    // yalnızca client'ta senkronize ediyor — hydration mismatch'ten kaçınmak
    // için render sırasında hesaplanamaz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransactions(generateSeedData(DEFAULT_CATEGORIES));
  }, []);

  const [rangeStart] = useState(thisMonthStartStr);
  const [rangeEnd] = useState(todayStr);

  const filtered = useMemo(
    () => filterByRange(transactions, rangeStart, rangeEnd),
    [transactions, rangeStart, rangeEnd]
  );
  const expenses = useMemo(() => filtered.filter(isExpense), [filtered]);
  const savings = useMemo(() => filtered.filter(isSaving), [filtered]);

  const agg = useMemo(() => aggregate(expenses, DEFAULT_CATEGORIES), [expenses]);
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

  return (
    <>
      <TopBar
        onExportClick={() => setExportSheetOpen(true)}
        onShareClick={() => {}}
        onLogoutClick={handleLogout}
      />

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {activeTab === "genel" ? (
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
              <RecentTransactions transactions={transactions} categories={DEFAULT_CATEGORIES} />
            </section>
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-muted">
            İstatistikler — içerik Faz 6&apos;da eklenecek
          </p>
        )}
      </main>

      <BottomTabBar
        active={activeTab}
        onTabChange={setActiveTab}
        onAddClick={() => setAddSheetOpen(true)}
      />

      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="Harcama Ekle">
        <p className="text-sm text-muted">Form içeriği Faz 4&apos;te eklenecek.</p>
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
