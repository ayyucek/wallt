import type { ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-sheet bg-page px-5 pb-7 pt-3 [animation:sheet-up_.22s_cubic-bezier(.2,.8,.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-pill bg-muted/40" />
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-display text-lg font-bold text-ink">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink shadow-card"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
