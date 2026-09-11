import { Plus } from "lucide-react";

interface FabProps {
  onClick: () => void;
}

export default function Fab({ onClick }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Harcama Ekle"
      className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-page bg-category-yemek text-white shadow-btn-primary active:scale-95"
    >
      <Plus size={24} />
    </button>
  );
}
