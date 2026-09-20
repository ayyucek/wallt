"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "./PasswordInput";
import TurnstileWidget, { TURNSTILE_SITE_KEY } from "./TurnstileWidget";

type Mode = "signin" | "signup" | "forgot";

// Kayıt/sıfırlama için minimum şifre uzunluğu. Giriş alanına UYGULANMAZ —
// eski (6 karakterlik) şifreli mevcut kullanıcıların girişini engellemesin.
export const MIN_PASSWORD_LENGTH = 8;

// İstemci tarafı yavaşlatma: art arda başarısız denemelerde artan bekleme
// (brute-force'u ve yanlışlıkla spam'i yavaşlatır). Gerçek koruma Supabase'in
// sunucu tarafı rate limit'idir; bu yalnızca ek bir katmandır.
const FREE_ATTEMPTS = 3;
const MAX_COOLDOWN_SECONDS = 60;

function cooldownFor(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_COOLDOWN_SECONDS, 2 ** (failures - FREE_ATTEMPTS + 2));
}

// Supabase'in ham hata metinleri hesabın var/yok olduğunu ya da altyapı
// ayrıntılarını sızdırabilir; kullanıcıya kontrollü Türkçe mesajlar gösterilir.
function friendlyAuthError(message: string, mode: Mode): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene.";
  }
  if (mode === "signin") return "E-posta veya şifre hatalı.";
  if (m.includes("password")) return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  if (mode === "signup") return "Kayıt oluşturulamadı. Bilgilerini kontrol edip tekrar dene.";
  return "İşlem tamamlanamadı, lütfen tekrar dene.";
}

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const failures = useRef(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const captchaRequired = Boolean(TURNSTILE_SITE_KEY);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function registerFailure() {
    failures.current += 1;
    setCooldown(cooldownFor(failures.current));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    setError(null);
    setInfo(null);

    if (captchaRequired && !captchaToken) {
      setError("Lütfen robot olmadığını doğrula.");
      return;
    }
    const token = captchaToken ?? undefined;

    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }
    setLoading(true);

    // Ağ hatası (fetch reject) durumunda da loading sıfırlansın ve kullanıcı
    // bir mesaj görsün diye tüm akış try/catch/finally içinde.
    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: token },
        });
        if (error) {
          registerFailure();
          setError(friendlyAuthError(error.message, mode));
          return;
        }
        failures.current = 0;
        router.push("/");
        router.refresh();
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
          captchaToken: token,
        });
        // Supabase, email enumeration'ı önlemek için hesap var/yok fark etmeksizin
        // başarı döner (gerçek bir hesap yoksa sessizce hiçbir mail gitmez) — bu
        // yüzden mesaj kasıtlı olarak "eğer bu email'e kayıtlı bir hesap varsa"
        // ifadesiyle belirsiz tutuluyor, hesabın var/yok olduğunu ele vermiyor.
        if (error) {
          registerFailure();
          setError(friendlyAuthError(error.message, mode));
          return;
        }
        // Başarılı isteklerde de kısa bekleme: sıfırlama e-postası spam'ini önler.
        setCooldown(30);
        setInfo("Eğer bu email'e kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { captchaToken: token },
      });
      if (error) {
        registerFailure();
        setError(friendlyAuthError(error.message, mode));
        return;
      }

      // "Confirm email" kapalıysa signUp() doğrudan geçerli bir session döner —
      // bu durumda kullanıcıyı e-posta beklemeye zorlamadan direkt içeri alıyoruz.
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setInfo("Kayıt başarılı — e-postana gelen linke tıklayıp hesabını doğruladıktan sonra giriş yapabilirsin.");
      setMode("signin");
    } catch {
      setError("Bağlantı hatası, lütfen tekrar dene.");
    } finally {
      setLoading(false);
      // Turnstile token'ı tek kullanımlık: başarılı ya da başarısız her
      // denemeden sonra yeni bir doğrulama gerekir.
      setCaptchaToken(null);
      setCaptchaReset((n) => n + 1);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      {mode !== "forgot" && (
        <div className="mb-5 flex rounded-pill bg-surface2 p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 rounded-pill py-2 text-sm font-bold transition-colors ${
              mode === "signin"
                ? "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] text-white"
                : "text-muted"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-pill py-2 text-sm font-bold transition-colors ${
              mode === "signup"
                ? "bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] text-white"
                : "text-muted"
            }`}
          >
            Kayıt Ol
          </button>
        </div>
      )}

      {mode === "forgot" && (
        <p className="mb-5 text-sm font-bold text-ink">Şifreni mi unuttun?</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">E-posta</label>
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-base font-semibold text-ink outline-none"
            placeholder="ornek@email.com"
          />
        </div>

        {mode !== "forgot" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Şifre</label>
            <PasswordInput
              required
              minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
              maxLength={128}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="-mt-2 self-end text-xs font-semibold text-muted"
          >
            Şifremi unuttum?
          </button>
        )}

        <TurnstileWidget onToken={setCaptchaToken} resetSignal={captchaReset} />

        {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}
        {info && <p className="text-xs font-semibold text-category-market">{info}</p>}

        <button
          type="submit"
          disabled={loading || cooldown > 0 || (captchaRequired && !captchaToken)}
          className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary disabled:opacity-50"
        >
          {cooldown > 0
            ? `${cooldown} sn bekle`
            : loading
              ? "..."
            : mode === "signin"
              ? "Giriş Yap"
              : mode === "signup"
                ? "Kayıt Ol"
                : "Sıfırlama Bağlantısı Gönder"}
        </button>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="self-center text-xs font-semibold text-muted"
          >
            Girişe dön
          </button>
        )}
      </form>
    </div>
  );
}
