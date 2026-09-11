export interface Category {
  id: string;
  name: string;
  color: string; // hex, örn. "#FF7A6B"
  isCustom?: boolean;
}

export type TransactionType = "expense" | "saving";

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  description: string; // boş string olabilir, opsiyonel
  amount: number; // TL, kuruş yok (tam sayı)
  categoryId: string;
  timestamp: string; // ISO 8601 string, new Date().toISOString()
}

export interface DateRange {
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
  label: string; // "Bu Ay", "Geçen Hafta", "Özel" vb.
}

export interface CategoryTotal extends Category {
  total: number;
  // Bar chart'ta harcama kategorilerine eklenen sentetik "Tasarruf" barını
  // ayırt etmek için (bkz. withSavingsBar). Gerçek kategorilerde yer almaz.
  isSaving?: boolean;
}

export interface ParetoEntry extends CategoryTotal {
  cumPct: number;
}

export interface RadarEntry {
  category: string;
  value: number;
  average: number;
}

// İstatistikler ekranı — dönem karşılaştırma (PRD 7.1)
export interface CompareBarEntry {
  name: string;
  A: number;
  B: number;
}

export interface CompareParetoEntry extends Category {
  a: number;
  b: number;
  combined: number;
  cumPctA: number;
  cumPctB: number;
}
