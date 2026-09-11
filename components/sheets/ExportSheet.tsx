"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, Share2 } from "lucide-react";
import ReportDocument from "@/components/pdf/ReportDocument";
import { formatCurrency, formatRangeLabel } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";

interface ExportSheetProps {
  rangeStart: string;
  rangeEnd: string;
  total: number;
  categories: CategoryTotal[]; // total > 0 olanlar, büyükten küçüğe sıralı
}

function fileName(rangeStart: string, rangeEnd: string): string {
  return `wallt-rapor-${rangeStart}-${rangeEnd}.pdf`;
}

export default function ExportSheet({ rangeStart, rangeEnd, total, categories }: ExportSheetProps) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rangeLabel = formatRangeLabel(rangeStart, rangeEnd);

  async function buildPdfBlob(): Promise<Blob> {
    const generatedAt = new Date().toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return pdf(
      <ReportDocument
        rangeLabel={rangeLabel}
        total={total}
        categories={categories}
        generatedAt={generatedAt}
      />
    ).toBlob();
  }

  async function handleDownload() {
    setError(null);
    setBusy("download");
    try {
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(rangeStart, rangeEnd);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF oluşturulamadı.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setError(null);
    setBusy("share");
    try {
      const blob = await buildPdfBlob();
      const file = new File([blob], fileName(rangeStart, rangeEnd), { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "WALLT Raporu", text: rangeLabel });
      } else {
        await handleDownload();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Paylaşılamadı.");
    } finally {
      setBusy(null);
    }
  }

  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-card p-4">
        <div className="mb-1 flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-semibold text-muted">Dönem</span>
          <span className="text-sm font-semibold text-ink">{rangeLabel}</span>
        </div>
        {categories.length === 0 ? (
          <p className="py-2 text-sm text-muted">Bu dönemde harcama yok.</p>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b border-border py-2 last:border-none"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span className="text-sm font-semibold text-ink">{c.name}</span>
              </div>
              <span className="text-sm font-semibold text-ink">{formatCurrency(c.total)}</span>
            </div>
          ))
        )}
        <div className="mt-1 flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-ink">Toplam</span>
          <span className="font-display text-base font-bold text-ink">{formatCurrency(total)}</span>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary disabled:opacity-50"
        >
          <Download size={14} /> {busy === "download" ? "..." : "İndir"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-surface2 py-3 text-sm font-bold text-ink disabled:opacity-50"
          >
            <Share2 size={14} /> {busy === "share" ? "..." : "Paylaş"}
          </button>
        )}
      </div>
    </div>
  );
}
