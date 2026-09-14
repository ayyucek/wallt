"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMismatchError(null);
    setSessionError(null);

    if (password !== confirmPassword) {
      setMismatchError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      // Kurtarma bağlantısı geçersiz/süresi dolmuşsa updateUser burada hata
      // döner (proxy.ts sayfayı public bıraktığı için buraya kadar gelinebilir,
      // ama geçerli bir kurtarma oturumu olmadan şifre güncellenemez). Bu,
      // basit şifre-eşleşmiyor kontrolünden ayrı tutulur ki "bağlantının
      // süresi dolmuş olabilir" ipucu yalnızca gerçekten bu senaryoda görünsün.
      setSessionError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <p className="mb-5 text-sm font-bold text-ink">Yeni şifre belirle</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Yeni Şifre</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
            placeholder="••••••••"
          />
        </div>

        {mismatchError && <p className="text-xs font-semibold text-category-saglik">{mismatchError}</p>}
        {sessionError && (
          <p className="text-xs font-semibold text-category-saglik">
            {sessionError} Bağlantının süresi dolmuş olabilir — Giriş ekranından &ldquo;Şifremi
            unuttum?&rdquo; ile tekrar deneyebilirsin.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary disabled:opacity-50"
        >
          {loading ? "..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </div>
  );
}
