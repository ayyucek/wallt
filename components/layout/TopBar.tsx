import { Download, LogOut, Share2 } from "lucide-react";

interface TopBarProps {
  onExportClick: () => void;
  onShareClick: () => void;
  onLogoutClick: () => void;
}

export default function TopBar({ onExportClick, onShareClick, onLogoutClick }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <span className="font-display text-xl font-bold text-ink">WALLT</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExportClick}
          aria-label="Dışa Aktar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-card active:scale-95"
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          onClick={onShareClick}
          aria-label="Paylaş"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-card active:scale-95"
        >
          <Share2 size={18} />
        </button>
        <button
          type="button"
          onClick={onLogoutClick}
          aria-label="Çıkış Yap"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-card active:scale-95"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
