import type { MetadataRoute } from "next";

// Next.js native manifest dosya kuralı — bkz. Teknik Analiz Bölüm 1
// (next-pwa yerine bu yaklaşımı seçme gerekçesi orada belgelenmiştir).
//
// İkonlar public/icons/ altındaki statik PNG dosyalarıdır (tasarımcı tarafından
// sağlandı, 11 Eylül 2026). ⚠️ icon-192 ve icon-512 (purpose: "any") ile
// icon-maskable-512 setten eksik — bkz. Teknik Analiz Bölüm 1'deki not.
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
        src: "/icons/icon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
