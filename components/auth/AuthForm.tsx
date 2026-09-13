"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "forgot";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      // Supabase, email enumeration'ı önlemek için hesap var/yok fark etmeksizin
      // başarı döner (gerçek bir hesap yoksa sessizce hiçbir mail gitmez) — bu
      // yüzden mesaj kasıtlı olarak "eğer bu email'e kayıtlı bir hesap varsa"
      // ifadesiyle belirsiz tutuluyor, hesabın var/yok olduğunu ele vermiyor.
      if (error) {
        setError(error.message);
        return;
      }
      setInfo("Eğer bu email'e kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm font-semibold text-ink outline-none"
            placeholder="ornek@email.com"
          />
        </div>

        {mode !== "forgot" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-surface2 px-3 py-2.5 text-sm font-semibold text-ink outline-none"
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

        {error && <p className="text-xs font-semibold text-category-saglik">{error}</p>}
        {info && <p className="text-xs font-semibold text-category-market">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] py-3 text-sm font-bold text-white shadow-btn-primary disabled:opacity-50"
        >
          {loading
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
