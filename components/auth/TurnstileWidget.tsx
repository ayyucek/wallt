"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile CAPTCHA widget'ı (Supabase Auth → Attack Protection).
// Site key herkese açıktır; secret key yalnızca Supabase panelindedir.
// Site key tanımlı değilse hiçbir şey render edilmez ve auth çağrıları
// captchaToken'sız çalışır (Supabase'de CAPTCHA kapalıyken uygulama bozulmaz).
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Turnstile yüklenemedi")));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  // Değeri her değiştiğinde widget sıfırlanır — token tek kullanımlıktır, her
  // auth denemesinden sonra yenisi alınmalıdır.
  resetSignal: number;
}

export default function TurnstileWidget({ onToken, resetSignal }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetSignal === 0 || !widgetId.current || !window.turnstile) return;
    window.turnstile.reset(widgetId.current);
  }, [resetSignal]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />;
}
