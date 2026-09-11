"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "wallt-install-hint-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// "Ana ekrana ekle" onboarding ipucu (Faz 10). Android/Chrome'da beforeinstallprompt
// olayını yakalayıp bir "Yükle" butonu gösterir; iOS Safari bu olayı desteklemediği
// için (programatik kurulum imkânsız) manuel Paylaş → Ana Ekrana Ekle talimatı gösterilir.
export default function InstallHint() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;
    const ios = isIos();

    // setState çağrıları burada, cascading render uyarısına yol açan senkron bir
    // effect gövdesi yerine async bir fonksiyona sarılır (bkz. AddExpenseSheet'teki
    // Supabase yükleme deseniyle aynı yaklaşım).
    async function reveal() {
      setDismissed(false);
      if (ios) setShowIosHint(true);
    }
    reveal();

    if (ios) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!showIosHint && !deferredPrompt)) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-card bg-card p-3.5 shadow-card">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))]">
        <Share size={16} className="text-white" />
      </div>
      <p className="flex-1 text-xs font-semibold text-ink">
        {showIosHint
          ? "WALLT'ı ana ekranına eklemek için Paylaş simgesine dokunup \"Ana Ekrana Ekle\"yi seç."
          : "WALLT'ı ana ekranına ekleyip native bir app gibi kullan."}
      </p>
      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex-shrink-0 rounded-pill bg-[linear-gradient(135deg,var(--color-brand-start),var(--color-brand-end))] px-3.5 py-2 text-xs font-bold text-white shadow-btn-primary"
        >
          Yükle
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Kapat"
        className="flex-shrink-0 text-muted"
      >
        <X size={16} />
      </button>
    </div>
  );
}
