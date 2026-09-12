import type { ReactNode } from "react";
import { BarChart3, Home, PieChart, Receipt } from "lucide-react";
import Fab from "./Fab";

export type TabKey = "genel" | "hareketler" | "grafikler" | "istatistikler";

interface BottomTabBarProps {
  active: TabKey;
  onTabChange: (tab: TabKey) => void;
  onAddClick: () => void;
}

// İki eşit olmayan "yarım" + ortada FAB çentiği — prototipteki
// wallt-tabbar-half deseninin genişletilmiş hali (bkz. PRD 6.1, Teknik Analiz
// 5.2). 4 sekmeyle birlikte her yarım 2 sekme paylaşıyor. Dar mobil
// genişlikte 4 etiketli sekme + FAB sığmadığı için (12 Eylül 2026 revizyonu)
// bu bar artık ikon-only — etiketler yalnızca masaüstü Sidebar'da kalıyor.
export default function BottomTabBar({ active, onTabChange, onAddClick }: BottomTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[70px] items-center bg-card shadow-tabbar">
      <div className="flex h-full flex-1 justify-end pr-12">
        <TabButton
          label="Genel Bakış"
          icon={<Home size={20} />}
          active={active === "genel"}
          activeColor="text-tabA"
          onClick={() => onTabChange("genel")}
        />
        <TabButton
          label="Son Hareketler"
          icon={<Receipt size={20} />}
          active={active === "hareketler"}
          activeColor="text-tabC"
          onClick={() => onTabChange("hareketler")}
        />
      </div>
      <div className="relative flex h-full w-16 items-center justify-center">
        <Fab onClick={onAddClick} />
      </div>
      <div className="flex h-full flex-1 justify-start pl-12">
        <TabButton
          label="Grafikler"
          icon={<PieChart size={20} />}
          active={active === "grafikler"}
          activeColor="text-tabD"
          onClick={() => onTabChange("grafikler")}
        />
        <TabButton
          label="İstatistikler"
          icon={<BarChart3 size={20} />}
          active={active === "istatistikler"}
          activeColor="text-tabB"
          onClick={() => onTabChange("istatistikler")}
        />
      </div>
    </nav>
  );
}

function TabButton({
  label,
  icon,
  active,
  activeColor,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  activeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-full flex-1 items-center justify-center font-sans ${
        active ? activeColor : "text-muted"
      }`}
    >
      {icon}
    </button>
  );
}
