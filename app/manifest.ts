import type { MetadataRoute } from "next";

// Next.js native manifest dosya kuralı — bkz. Teknik Analiz Bölüm 1
// (next-pwa yerine bu yaklaşımı seçme gerekçesi orada belgelenmiştir).
//
// İkonlar public/icons/ altındaki statik PNG dosyalarıdır (tasarımcı tarafından
// sağlandı, 11 Eylül 2026 — eksik kalan icon-192/icon-512/icon-maskable-512 seti
// aynı gün içinde tamamlandı).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WALLT",
    short_name: "WALLT",
    description: "Harcamalarını kategorilere ayırarak takip et.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0b22",
    theme_color: "#0f0b22",
    lang: "tr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
