import type { MetadataRoute } from "next";

// Next.js native manifest dosya kuralı — bkz. Teknik Analiz Bölüm 1
// (next-pwa yerine bu yaklaşımı seçme gerekçesi orada belgelenmiştir).
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
        src: "/manifest-icons/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/manifest-icons/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/manifest-icons/icon-512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
