"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH } from "./AuthForm";
import PasswordInput from "./PasswordInput";

// checking: kurtarma bağlantısındaki kod oturuma çevriliyor
// ready: geçerli kurtarma oturumu var, form gösterilir
// invalid: oturum kurulamadı (bağlantı başka tarayıcıda açıldı, kullanıldı ya da süresi doldu)
type LinkStatus = "checking" | "ready" | "invalid";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<LinkStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sayfa açılır açılmaz kurtarma oturumunu doğrular; böylece kullanıcı şifreyi
  // yazıp göndermeden ÖNCE bağlantının geçersiz olduğunu öğrenir. getSession(),
  // URL'deki kodun oturuma çevrilmesi (client başlatması) bitene kadar bekler.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setStatus("ready");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus((prev) => (prev === "ready" || data.session ? "ready" : "invalid"));
      })
      .catch(() => {
        if (!cancelled) setStatus((prev) => (prev === "ready" ? prev : "invalid"));
      });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMismatchError(null);
    setSessionError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMismatchError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }
    if (password !== confirmPassword) {
      setMismatchError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    let error: { message: string } | null;
    try {
      ({ error } = await supabase.auth.updateUser({ password }));
      // Şifre değişince bu cihaz dışındaki tüm oturumlar kapatılır: hesabı
      // ele geçirmiş biri eski oturumuyla erişimini sürdüremesin.
      if (!error) await supabase.auth.signOut({ scope: "others" });
    } catch {
      error = { message: "Bağlantı hatası." };
    } finally {
      setLoading(false);
    }

    if (error) {
      // Oturum sayfa açılışında doğrulandığı için buraya genelde ağ hatası ya da
      // oturumun bu arada sona ermesi ile gelinir; ham mesaj yerine kontrollü
      // bir Türkçe mesaj gösterilir.
      setSessionError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <p className="mb-5 text-sm font-bold text-ink">Yeni şifre belirle</p>

      {status === "checking" && (
        <p className="text-sm font-medium text-muted">Bağlantı doğrulanıyor…</p>
      )}

      {status === "invalid" && (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-category-saglik">
            Bu şifre sıfırlama bağlantısı geçersiz. Bağlantı süresi dolmuş ya da daha önce kullanılmış
            olabilir; ayrıca sıfırlamayı istediğin tarayıcıdan farklı bir tarayıcıda, gizli pencerede ya da
            başka bir cihazda açılmış olabilir.
          </p>
          <p className="text-xs font-medium text-muted">
            Giriş ekranından &ldquo;Şifremi unuttum?&rdquo; ile yeni bir bağlantı iste ve e-postandaki en
            yeni bağlantıya <strong>aynı tarayıcıda</strong> tıkla.
          </p>
          <Link
            href="/login"
            className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-center text-sm font-bold text-white shadow-btn-primary"
          >
            Giriş Ekranına Dön
          </Link>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Yeni Şifre</label>
            <PasswordInput
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Yeni Şifre (Tekrar)</label>
            <PasswordInput
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {mismatchError && <p className="text-xs font-semibold text-category-saglik">{mismatchError}</p>}
          {sessionError && (
            <p className="text-xs font-semibold text-category-saglik">
              {sessionError} Sorun sürerse Giriş ekranından &ldquo;Şifremi unuttum?&rdquo; ile yeni bir
              bağlantı iste.
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
      )}
    </div>
  );
}
