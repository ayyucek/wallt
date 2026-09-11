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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[70px] items-center bg-card shadow-[0_-6px_20px_rgba(43,38,64,.08)]">
      <div className="flex h-full flex-1 justify-end pr-12">
        <TabButton
          label="Genel Bakış"
          icon={<Home size={19} />}
          active={active === "genel"}
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
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full flex-1 flex-col items-center justify-center gap-1 font-sans text-[10.5px] font-semibold ${
        active ? "text-ink" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
