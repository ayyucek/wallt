import type { ReactNode } from "react";
import { BarChart3, Home } from "lucide-react";
import Fab from "./Fab";

export type TabKey = "genel" | "istatistikler";

interface BottomTabBarProps {
  active: TabKey;
  onTabChange: (tab: TabKey) => void;
  onAddClick: () => void;
}

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
