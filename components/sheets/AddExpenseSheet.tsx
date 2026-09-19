"use client";

import { useState, type FormEvent } from "react";
import { Check, Plus } from "lucide-react";
import { CUSTOM_PALETTE } from "@/lib/categories";
import type {
  Category,
  FrequentExpense,
  RecurringPaymentType,
  Transaction,
  TransactionType,
} from "@/lib/types";
import ColorPicker from "@/components/ui/ColorPicker";
import BottomSheet from "./BottomSheet";
import FrequentChips from "./FrequentChips";

// Düzenli ödeme tanımlama akışı (Faz 2, PRD 5.6, Teknik Analiz 5.14) —
// AddExpenseSheet bu şekli page.tsx'e verir, storage.addRecurringPayment'a
// nasıl eşleneceğine (payment_day türetimi, installmentsPaid başlangıcı vb.)
// page.tsx karar verir; bu bileşen sadece formu toplar.
export interface RecurringPaymentDraft {
  type: RecurringPaymentType;
  title: string;
  description: string;
  categoryId: string;
  amount: number;
  startDate: string; // "YYYY-MM-DD", recurring_payments.start_date için
  timestamp: string; // ISO 8601, ilk transaction'ın occurred_at'i için
  installmentCount: number | null;
}

interface AddExpenseSheetProps {
  categories: Category[];
  initialCategoryId?: string;
  // Düzenleme modu (13 Eylül 2026 eklentisi): verilirse form bu kaydın
  // değerleriyle önceden doldurulur ve buton "Kaydet" olur. Sheet her
  // açılışta BottomSheet tarafından baştan mount edildiği için (bkz.
  // BottomSheet.tsx — kapalıyken child unmount olur), ayrı bir reset
  // efektine gerek kalmadan initial state doğrudan bundan okunabilir.
  editingTransaction?: Transaction;
  // Sık Kullanılanlar şeridi (15 Eylül 2026 eklentisi, PRD 5.1.2) — yalnızca
  // ekleme modunda (editingTransaction yokken) gösterilir. Harcama/Tasarruf
  // için ayrı ayrı hesaplanmış (top-3 kategori kısıtlı) listeler page.tsx'ten
  // gelir; hangisinin gösterileceğine bu bileşen kendi entryType state'ine
  // göre karar verir (2. revizyon).
  frequentExpensesByType?: Record<TransactionType, FrequentExpense[]>;
  onSubmit: (input: Omit<Transaction, "id">) => Promise<void>;
  // Düzenli ödeme toggle'ı açıkken submit bu prop'a yönlenir (Faz 2).
  // Yalnızca yeni kayıt ekleme modunda (editingTransaction yokken) kullanılır.
  onSubmitRecurring?: (input: RecurringPaymentDraft) => Promise<void>;
  onAddCategory: (name: string, color: string) => Promise<Category>;
  onClose: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Basamak ve en fazla bir nokta dışındaki karakterleri eler, ikinci noktayı
// yok sayar (örn. "12.3.4" yazılırsa "12.34" olarak kalır).
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

export default function AddExpenseSheet({
  categories,
  initialCategoryId,
  editingTransaction,
  frequentExpensesByType,
  onSubmit,
  onSubmitRecurring,
  onAddCategory,
  onClose,
}: AddExpenseSheetProps) {
  const [entryType, setEntryType] = useState<TransactionType>(editingTransaction?.type ?? "expense");
  const [title, setTitle] = useState(editingTransaction?.title ?? "");
  const [description, setDescription] = useState(editingTransaction?.description ?? "");
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount) : ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    editingTransaction?.categoryId ?? initialCategoryId ?? categories[0]?.id ?? ""
  );
  const [dateTimeValue, setDateTimeValue] = useState(() =>
    toDatetimeLocalValue(editingTransaction ? new Date(editingTransaction.timestamp) : new Date())
  );
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(CUSTOM_PALETTE[0]);
  const [newCategorySubmitting, setNewCategorySubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Düzenli ödeme toggle'ı (Faz 2) — yalnızca yeni harcama eklerken anlamlı,
  // bu yüzden isRecurring editingTransaction varken hiç true olamaz (toggle
  // aşağıda o durumda zaten render edilmiyor).
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurringPaymentType>("installment");
  const [installmentCount, setInstallmentCount] = useState("");

  const isSaving = entryType === "saving";
  const parsedAmount = parseFloat(amount);
  const parsedInstallmentCount = parseInt(installmentCount, 10);
  const canSubmitRecurring =
    !isRecurring ||
    (recurringType === "subscription" ||
      (Boolean(installmentCount) && Number.isInteger(parsedInstallmentCount) && parsedInstallmentCount >= 1));
  const canSubmit =
    Boolean(amount) && parsedAmount > 0 && title.trim() !== "" && Boolean(dateTimeValue) && canSubmitRecurring;

  // Chip'e dokununca başlık/tutar/kategori/tip formu doldurur — tarih HİÇ
  // dokunulmaz, her zaman "şu an" kalır (bkz. PRD 5.1.2). Alanlar normal
  // controlled input olduğundan kullanıcı dilediğini serbestçe değiştirebilir.
  function handleSelectFrequent(expense: FrequentExpense) {
    setEntryType(expense.type);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setSelectedCategoryId(expense.categoryId);
  }

  function openNewCategoryModal() {
    setNewCategoryName("");
    setNewCategoryColor(CUSTOM_PALETTE[categories.length % CUSTOM_PALETTE.length]);
    setNewCategoryModalOpen(true);
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setNewCategorySubmitting(true);
    try {
      const category = await onAddCategory(name, newCategoryColor);
      setSelectedCategoryId(category.id);
      setNewCategoryModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori eklenemedi.");
    } finally {
      setNewCategorySubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (isRecurring && onSubmitRecurring) {
        await onSubmitRecurring({
          type: recurringType,
          title: title.trim(),
          description: description.trim(),
          categoryId: selectedCategoryId,
          amount: parsedAmount,
          // dateTimeValue "YYYY-MM-DDTHH:MM" formatında ve zaten yerel saat —
          // ilk 10 karakteri almak txDateStr'daki gibi UTC kaymasından kaçınır.
          startDate: dateTimeValue.slice(0, 10),
          timestamp: new Date(dateTimeValue).toISOString(),
          installmentCount: recurringType === "installment" ? parsedInstallmentCount : null,
        });
      } else {
        await onSubmit({
          type: entryType,
          title: title.trim(),
          description: description.trim(),
          amount: parsedAmount,
          categoryId: selectedCategoryId,
          timestamp: new Date(dateTimeValue).toISOString(),
          // Düzenlenen kayıt bir düzenli ödemeden geldiyse bu form onu koparmaz
          // (recurringPaymentId sessizce korunur); brand-new bir kayıtta null.
          recurringPaymentId: editingTransaction?.recurringPaymentId ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt eklenemedi.");
      setSubmitting(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex rounded-pill bg-surface2 p-1">
        <button
          type="button"
          onClick={() => setEntryType("expense")}
          className={`flex-1 rounded-pill py-2 text-sm font-bold transition-colors ${
            entryType === "expense"
              ? "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] text-white"
              : "text-muted"
          }`}
        >
          Harcama
        </button>
        <button
          type="button"
          onClick={() => setEntryType("saving")}
          className={`flex-1 rounded-pill py-2 text-sm font-bold transition-colors ${
            isSaving ? "bg-[linear-gradient(135deg,#34D399,#22B8B0)] text-white" : "text-muted"
          }`}
        >
          Tasarruf
        </button>
      </div>

      {!editingTransaction && (
        <FrequentChips
          expenses={frequentExpensesByType?.[entryType] ?? []}
          categories={categories}
          onSelect={handleSelectFrequent}
        />
      )}

      {isSaving && (
        <p className="text-xs font-medium text-muted">
          Harcamadığın parayı buraya yaz — bu, dönem boyunca ne kadar tasarruf ettiğini gösterecek.
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Başlık</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isSaving ? "örn. Kahve almadım" : "örn. Öğle yemeği"}
          className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Açıklama (opsiyonel)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ek not..."
          rows={2}
          className="w-full resize-y rounded-xl bg-surface2 px-3 py-2.5 text-base font-medium text-ink outline-none"
        />
      </div>

      {!isSaving && !editingTransaction && (
        <div className="rounded-xl bg-surface2 p-3">
          <button
            type="button"
            onClick={() => setIsRecurring((v) => !v)}
            className="flex w-full items-center justify-between"
            aria-pressed={isRecurring}
          >
            <span className="text-sm font-semibold text-ink">Bu düzenli bir ödeme mi?</span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${
                isRecurring
                  ? "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))]"
                  : "bg-card"
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                  isRecurring ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>

          {isRecurring && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex rounded-pill bg-card p-1">
                <button
                  type="button"
                  onClick={() => setRecurringType("installment")}
                  className={`flex-1 rounded-pill py-1.5 text-xs font-bold transition-colors ${
                    recurringType === "installment"
                      ? "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] text-white"
                      : "text-muted"
                  }`}
                >
                  Taksit
                </button>
                <button
                  type="button"
                  onClick={() => setRecurringType("subscription")}
                  className={`flex-1 rounded-pill py-1.5 text-xs font-bold transition-colors ${
                    recurringType === "subscription"
                      ? "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] text-white"
                      : "text-muted"
                  }`}
                >
                  Abonelik
                </button>
              </div>

              {recurringType === "installment" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    Toplam Taksit Sayısı
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="örn. 12"
                    className="w-full rounded-xl bg-card px-3 py-2.5 text-base font-semibold text-ink outline-none"
                  />
                </div>
              ) : (
                <p className="text-xs font-medium text-muted">
                  Ödeme günü, aşağıda seçtiğin tarihin günü olarak kaydedilir.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">
          {isSaving
            ? "Tasarruf Edilen Tutar (₺)"
            : isRecurring && recurringType === "installment"
              ? "Aylık Taksit Tutarı (₺)"
              : "Tutar (₺)"}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
          placeholder="0"
          className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">Tarih ve Saat</label>
        <input
          type="datetime-local"
          value={dateTimeValue}
          onChange={(e) => setDateTimeValue(e.target.value)}
          className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
        />
        <p className="mt-1.5 text-xs font-medium text-muted">
          Varsayılan olarak şu an dolu gelir, istersen değiştirebilirsin.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">
          {isSaving ? "Hangi kategoriden tasarruf ettin?" : "Kategori"}
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = selectedCategoryId === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-xs font-semibold"
                style={active ? { background: c.color, color: "#fff" } : { background: "var(--color-surface2)", color: "var(--color-ink)" }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: active ? "rgba(255,255,255,.85)" : c.color }} />
                {c.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={openNewCategoryModal}
            className="flex items-center gap-1 rounded-pill border border-dashed border-border-dashed px-3 py-2 text-xs font-semibold text-muted"
          >
            <Plus size={12} /> Yeni Kategori
          </button>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-pill py-3 text-sm font-bold text-white disabled:opacity-45 disabled:shadow-none ${
            isSaving
              ? "bg-[linear-gradient(135deg,#34D399,#22B8B0)] shadow-btn-saving"
              : "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] shadow-btn-primary"
          }`}
        >
          {editingTransaction ? <Check size={14} /> : <Plus size={14} />}{" "}
          {submitting ? "..." : editingTransaction ? "Kaydet" : isSaving ? "Tasarruf Ekle" : "Harcama Ekle"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill bg-surface2 px-4 py-3 text-sm font-bold text-ink"
        >
          Vazgeç
        </button>
      </div>
    </form>

    {/* "+ Yeni Kategori" modalı — AddExpenseSheet'in kendi local state'iyle
        kontrol edilir (bkz. Teknik Analiz Bölüm 5.13). Nested bir BottomSheet
        olduğundan kendi fixed+z-index'i sayesinde dıştaki sheet'in üstünde
        sorunsuz render olur, BottomSheet.tsx'e dokunmaya gerek yok. */}
    <BottomSheet
      open={newCategoryModalOpen}
      onClose={() => setNewCategoryModalOpen(false)}
      title="Yeni Kategori"
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Kategori Adı</label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="örn. Spor"
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Renk</label>
          <ColorPicker value={newCategoryColor} onChange={setNewCategoryColor} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Önizleme</label>
          <span
            className="inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-xs font-semibold text-white"
            style={{ background: newCategoryColor }}
          >
            <span className="h-2 w-2 rounded-full bg-white/85" />
            {newCategoryName.trim() || "Kategori adı"}
          </span>
        </div>

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || newCategorySubmitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary disabled:opacity-45 disabled:shadow-none"
          >
            {newCategorySubmitting ? "..." : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={() => setNewCategoryModalOpen(false)}
            className="rounded-pill bg-surface2 px-4 py-3 text-sm font-bold text-ink"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </BottomSheet>
    </>
  );
}
