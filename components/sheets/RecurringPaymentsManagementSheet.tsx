"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Category, RecurringPayment } from "@/lib/types";

interface RecurringPaymentsManagementSheetProps {
  recurringPayments: RecurringPayment[];
  categories: Category[];
  onUpdate: (id: string, input: { amount: number; paymentDay: number | null }) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

// Ayarlar'daki "Düzenli Ödemeleri Yönet" ekranı (Faz 5, PRD 5.6, Teknik
// Analiz 5.14) — CategoryManagementSheet ile aynı accordion/inline-edit liste
// stili. Taksit ve Abonelik AYRI sekmelere bölünmez, tek listede tip
// rozetiyle (TransactionList'teki 🔁 rozetle aynı biçim) ayrılır.
// completed/cancelled kayıtlar listede kalır (soluk, salt okunur) — yalnızca
// status==='active' olanlarda Düzenle/İptal Et aksiyonları gösterilir.
export default function RecurringPaymentsManagementSheet({
  recurringPayments,
  categories,
  onUpdate,
  onCancel,
}: RecurringPaymentsManagementSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (recurringPayments.length === 0) {
    return <p className="text-sm text-muted">Henüz düzenli ödeme yok.</p>;
  }

  function openEdit(payment: RecurringPayment) {
    setExpandedId(payment.id);
    setEditAmount(String(payment.amount));
    setEditPaymentDay(payment.paymentDay !== null ? String(payment.paymentDay) : "");
    setConfirmCancelId(null);
    setError(null);
  }

  function closeEdit() {
    setExpandedId(null);
    setConfirmCancelId(null);
    setError(null);
  }

  async function handleSave(payment: RecurringPayment) {
    const amount = parseFloat(editAmount);
    if (!(amount > 0)) return;
    const paymentDay =
      payment.type === "subscription" ? parseInt(editPaymentDay, 10) || payment.paymentDay : null;
    setSubmitting(true);
    setError(null);
    try {
      await onUpdate(payment.id, { amount, paymentDay });
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCancel(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      await onCancel(id);
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İptal edilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {recurringPayments.map((p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        const isExpanded = expandedId === p.id;
        const isConfirmingCancel = confirmCancelId === p.id;
        const isActive = p.status === "active";
        const remaining =
          p.type === "installment" && p.installmentCount !== null
            ? p.installmentCount - p.installmentsPaid
            : null;

        const typeLabel = p.type === "installment" ? "Taksit" : "Abonelik";
        const summary =
          p.type === "installment"
            ? `${p.installmentsPaid}/${p.installmentCount} taksit ödendi`
            : `Her ayın ${p.paymentDay}. günü${isActive ? ", aktif" : ""}`;
        const statusPillLabel =
          p.status === "completed" ? "Tamamlandı" : p.status === "cancelled" ? "İptal edildi" : null;

        return (
          <div key={p.id} className={`rounded-xl bg-surface2 p-3 ${isActive ? "" : "opacity-55"}`}>
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: cat?.color ?? "#888888" }} />
              <span className="flex-1 text-sm font-semibold text-ink">{p.title}</span>
              <span className="font-display text-sm font-semibold text-ink">{formatCurrency(p.amount)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[22px] text-[10.5px] font-medium text-muted">
              <span className="rounded-pill bg-brand-start/15 px-1.5 py-0.5 text-[9.5px] font-bold text-brand-start">
                🔁 {typeLabel}
              </span>
              <span>{summary}</span>
              {statusPillLabel && (
                <span className="rounded-pill bg-card px-2 py-0.5 text-[9.5px] font-bold text-muted">
                  {statusPillLabel}
                </span>
              )}
            </div>

            {isActive && !isExpanded && (
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="mt-3 flex items-center gap-1 rounded-pill bg-card px-2.5 py-1.5 text-xs font-semibold text-ink"
              >
                <Pencil size={12} /> Düzenle
              </button>
            )}
            {isExpanded && !isConfirmingCancel && (
              <button type="button" onClick={closeEdit} aria-label="Kapat" className="mt-3 text-muted">
                <X size={16} />
              </button>
            )}

            {isExpanded && !isConfirmingCancel && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">
                    {p.type === "installment" ? "Aylık Taksit Tutarı (₺)" : "Tutar (₺)"}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full rounded-xl bg-card px-3 py-2.5 text-base font-semibold text-ink outline-none"
                  />
                </div>
                {p.type === "subscription" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted">Ödeme Günü</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editPaymentDay}
                      onChange={(e) => setEditPaymentDay(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full rounded-xl bg-card px-3 py-2.5 text-base font-semibold text-ink outline-none"
                    />
                  </div>
                )}
                {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(p)}
                    disabled={!editAmount || parseFloat(editAmount) <= 0 || submitting}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-2.5 text-sm font-bold text-white disabled:opacity-45"
                  >
                    <Check size={14} /> Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelId(p.id)}
                    className="flex items-center gap-1.5 rounded-pill bg-category-saglik/15 px-3 py-2.5 text-sm font-bold text-category-saglik"
                  >
                    İptal Et
                  </button>
                </div>
              </div>
            )}

            {isConfirmingCancel && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-xs font-medium text-muted">
                  Bu {p.type === "installment" ? "taksiti" : "aboneliği"} iptal edersen bir daha otomatik
                  harcama üretilmeyecek, geçmiş kayıtların silinmeyecek.
                  {remaining !== null && remaining > 0 && ` Kalan ${remaining} taksit artık takip edilmeyecek.`}
                </p>
                {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmCancel(p.id)}
                    disabled={submitting}
                    className="flex-1 rounded-pill bg-category-saglik py-2.5 text-sm font-bold text-white disabled:opacity-45"
                  >
                    İptal Et
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelId(null)}
                    className="flex-1 rounded-pill bg-card py-2.5 text-sm font-bold text-ink"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
