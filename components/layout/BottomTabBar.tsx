import type { ReactNode } from "react";
import { BarChart3, Home, Receipt } from "lucide-react";
import Fab from "./Fab";

export type TabKey = "genel" | "hareketler" | "istatistikler";

interface BottomTabBarProps {
  active: TabKey;
  onTabChange: (tab: TabKey) => void;
  onAddClick: () => void;
}

// İki eşit olmayan "yarım" + ortada FAB çentiği — prototipteki
// wallt-tabbar-half deseninin birebir aynısı (bkz. PRD 6.1, Teknik Analiz
// 5.2). Sol yarım iki sekmeyi paylaşır, sağ yarım tek sekmeyi taşır; FAB'ın
// konumu/boyutu sekme sayısından bağımsızdır.
export default function BottomTabBar({ active, onTabChange, onAddClick }: BottomTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[70px] items-center bg-card shadow-tabbar">
      <div className="flex h-full flex-1 justify-end pr-12">
        <TabButton
          label="Genel Bakış"
          icon={<Home size={19} />}
          active={active === "genel"}
          activeColor="text-tabA"
          onClick={() => onTabChange("genel")}
        />
        <TabButton
          label="Son Hareketler"
          icon={<Receipt size={19} />}
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
          label="İstatistikler"
          icon={<BarChart3 size={19} />}
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
      className={`flex h-full flex-1 flex-col items-center justify-center gap-1 font-sans text-[10.5px] font-semibold ${
        active ? activeColor : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
