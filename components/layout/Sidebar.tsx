import type { ReactNode } from "react";
import { BarChart3, Home, PieChart, Plus, Receipt } from "lucide-react";
import type { TabKey } from "./BottomTabBar";

interface SidebarProps {
  active: TabKey;
  onTabChange: (tab: TabKey) => void;
  onAddClick: () => void;
}

export default function Sidebar({ active, onTabChange, onAddClick }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-card p-5 lg:flex">
      <span className="font-display text-xl font-bold text-ink">WALLT</span>

      <nav className="mt-8 flex flex-col gap-1">
        <NavItem
          label="Genel Bakış"
          icon={<Home size={18} />}
          active={active === "genel"}
          onClick={() => onTabChange("genel")}
        />
        <NavItem
          label="Son Hareketler"
          icon={<Receipt size={18} />}
          active={active === "hareketler"}
          onClick={() => onTabChange("hareketler")}
        />
        <NavItem
          label="Grafikler"
          icon={<PieChart size={18} />}
          active={active === "grafikler"}
          onClick={() => onTabChange("grafikler")}
        />
        <NavItem
          label="İstatistikler"
          icon={<BarChart3 size={18} />}
          active={active === "istatistikler"}
          onClick={() => onTabChange("istatistikler")}
        />
      </nav>

      <button
        type="button"
        onClick={onAddClick}
        className="mt-8 flex items-center justify-center gap-2 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary active:scale-95"
      >
        <Plus size={16} /> Harcama Ekle
      </button>
    </aside>
  );
}

function NavItem({
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
      className={`flex items-center gap-2.5 rounded-pill px-3 py-2.5 text-left text-sm font-semibold ${
        active ? "bg-surface2 text-ink" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
