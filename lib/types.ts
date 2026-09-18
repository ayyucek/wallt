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
  amount: number; // TL, iki ondalık basamağa kadar (kuruş) desteklenir
  categoryId: string;
  timestamp: string; // ISO 8601 string, new Date().toISOString()
  // Düzenli Ödemeler (18 Eylül 2026 eklentisi, PRD 5.6) — bu transaction bir
  // RecurringPayment'tan otomatik üretildiyse onun id'si, aksi halde null.
  recurringPaymentId: string | null;
}

export interface DateRange {
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
  label: string; // "Bu Ay", "Geçen Hafta", "Özel" vb.
}

export interface CategoryTotal extends Category {
  total: number;
  // Bu kategoriden yapılan tasarrufun tutarı — bar chart'ta `total`
  // segmentinin ucuna eklenen ayrı bir stacked segment olarak gösterilir
  // (bkz. withSavingSegments). `total`'a dahil değildir, hero tutarını/
  // pareto/radar hesaplamalarını etkilemez.
  savingSegment?: number;
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

// Harcama Ekle sheet'indeki "Sık Kullanılanlar" şeridi (PRD 5.1.2). `amount`,
// bu title+categoryId kombinasyonundaki en son tarihli kaydın tutarıdır —
// bkz. getFrequentExpenses (lib/calculations.ts).
export interface FrequentExpense {
  title: string;
  amount: number;
  categoryId: string;
  type: TransactionType;
  count: number;
}

// Sık Kullanılanlar şeridinin top-3 kategori kısıtı (15 Eylül 2026, 2.
// revizyon) — bkz. getTopCategoriesByUsage (lib/calculations.ts).
export interface CategoryUsage {
  categoryId: string;
  count: number;
}

// Düzenli Ödemeler — Taksit ve Abonelik (18 Eylül 2026 eklentisi, PRD 5.6).
export type RecurringPaymentType = "installment" | "subscription";
export type RecurringPaymentStatus = "active" | "completed" | "cancelled";

export interface RecurringPayment {
  id: string;
  type: RecurringPaymentType;
  title: string;
  categoryId: string;
  amount: number; // aylık/taksit tutarı
  startDate: string; // "YYYY-MM-DD"
  installmentCount: number | null; // yalnızca "installment"
  installmentsPaid: number;
  paymentDay: number | null; // yalnızca "subscription" — ayın kaçı
  status: RecurringPaymentStatus;
  lastGeneratedDate: string | null; // "YYYY-MM-DD", en son üretilen ay
}
