"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CUSTOM_PALETTE } from "@/lib/categories";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// Yeni kategori modalı (AddExpenseSheet) ve Kategorileri Yönet ekranı
// (CategoryManagementSheet) arasında paylaşılan tek renk seçici — kod tekrarı
// olmasın diye buraya çıkarıldı (bkz. Teknik Analiz Bölüm 5.13). Preset
// swatch'a dokunmak `onChange`'i anında tetikler; custom hex input ise
// geçerli bir #RRGGBB olana kadar sadece local state'te tutulur (yazarken
// ara adımlarda hata göstermemek için).
export default function ColorPicker({ value, onChange, presets = CUSTOM_PALETTE }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value);
  // `value` dışarıdan (örn. bir swatch'a tıklanınca ya da düzenlenen kategori
  // değişince) değiştiğinde local buffer'ı senkronlar — render sırasında
  // state güncellemesi, React'in "adjusting state when a prop changes"
  // deseni (useEffect yerine, gereksiz ekstra render'ı önler).
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setHexInput(value);
  }

  function handleHexChange(raw: string) {
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    setHexInput(normalized);
    if (HEX_PATTERN.test(normalized)) onChange(normalized);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {presets.map((hex) => {
          const active = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              aria-label={hex}
              className="flex h-9 w-9 items-center justify-center rounded-full outline-none"
              style={{ background: hex, boxShadow: active ? "0 0 0 2px var(--color-page), 0 0 0 4px " + hex : "none" }}
            >
              {active && <Check size={15} color="#fff" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-9 w-9 flex-shrink-0 rounded-full border border-border"
          style={{ background: HEX_PATTERN.test(hexInput) ? hexInput : "transparent" }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className="flex-1 rounded-xl bg-surface2 px-3 py-2 text-base font-semibold text-ink outline-none"
        />
      </div>
    </div>
  );
}
