"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

// Göz ikonlu şifre alanı: ikona dokununca şifre görünür/gizli olur. Giriş,
// kayıt ve şifre sıfırlama formlarında ortak kullanılır.
export default function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className="w-full rounded-xl bg-surface2 py-2.5 pl-3 pr-11 text-base font-semibold text-ink outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        aria-pressed={visible}
        // tabIndex: klavyeyle formda gezinirken şifre alanından sonra
        // doğrudan gönder butonuna geçilsin diye ikon atlanır.
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
