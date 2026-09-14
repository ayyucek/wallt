"use client";

import { useState, type FormEvent } from "react";
import { Check, Plus, X } from "lucide-react";
import type { Category, Transaction, TransactionType } from "@/lib/types";

interface AddExpenseSheetProps {
  categories: Category[];
  initialCategoryId?: string;
  // Düzenleme modu (13 Eylül 2026 eklentisi): verilirse form bu kaydın
  // değerleriyle önceden doldurulur ve buton "Kaydet" olur. Sheet her
  // açılışta BottomSheet tarafından baştan mount edildiği için (bkz.
  // BottomSheet.tsx — kapalıyken child unmount olur), ayrı bir reset
  // efektine gerek kalmadan initial state doğrudan bundan okunabilir.
  editingTransaction?: Transaction;
  onSubmit: (input: Omit<Transaction, "id">) => Promise<void>;
  onAddCategory: (name: string) => Promise<Category>;
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
  onSubmit,
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
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSaving = entryType === "saving";
  const parsedAmount = parseFloat(amount);
  const canSubmit = Boolean(amount) && parsedAmount > 0 && title.trim() !== "" && dateTimeValue;

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setError(null);
    try {
      const category = await onAddCategory(name);
      setSelectedCategoryId(category.id);
      setNewCategoryName("");
      setAddingCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kategori eklenemedi.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        type: entryType,
        title: title.trim(),
        description: description.trim(),
        amount: parsedAmount,
        categoryId: selectedCategoryId,
        timestamp: new Date(dateTimeValue).toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt eklenemedi.");
      setSubmitting(false);
    }
  }

  return (
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

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted">
          {isSaving ? "Tasarruf Edilen Tutar (₺)" : "Tutar (₺)"}
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
          {!addingCategory && (
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="flex items-center gap-1 rounded-pill border border-dashed border-border-dashed px-3 py-2 text-xs font-semibold text-muted"
            >
              <Plus size={12} /> Yeni
            </button>
          )}
        </div>
        {addingCategory && (
          <div className="mt-2 flex gap-1.5">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Kategori adı"
              className="flex-1 rounded-xl bg-surface2 px-3 py-2 text-base font-semibold text-ink outline-none"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="rounded-pill bg-surface2 px-3 py-2 text-xs font-bold text-ink"
            >
              Ekle
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingCategory(false);
                setNewCategoryName("");
              }}
              className="rounded-pill bg-surface2 px-2.5 py-2 text-ink"
              aria-label="Vazgeç"
            >
              <X size={13} />
            </button>
          </div>
        )}
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
  );
}
