"use client";

import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import BottomTabBar, { type TabKey } from "@/components/layout/BottomTabBar";
import BottomSheet from "@/components/sheets/BottomSheet";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("genel");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  return (
    <>
      <TopBar
        onExportClick={() => setExportSheetOpen(true)}
        onShareClick={() => {}}
      />

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {activeTab === "genel" ? (
          <p className="mt-10 text-center text-sm text-muted">
            Genel Bakış — içerik Faz 3&apos;te eklenecek
          </p>
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

      <BottomSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="Harcama Ekle"
      >
        <p className="text-sm text-muted">Form içeriği Faz 4&apos;te eklenecek.</p>
      </BottomSheet>

      <BottomSheet
        open={exportSheetOpen}
        onClose={() => setExportSheetOpen(false)}
        title="Rapor Önizleme"
      >
        <p className="text-sm text-muted">İçerik Faz 8&apos;de eklenecek.</p>
      </BottomSheet>
    </>
  );
}
