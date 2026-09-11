import { DEFAULT_CATEGORIES } from "./categories";
import type { Category, Transaction } from "./types";

// Geliştirme ortamı için mock veri üretici. Prod'da kullanılmaz.

interface SeedProfile {
  prob: number;
  min: number;
  max: number;
  titles: string[];
}

const SEED_PROFILE: Record<string, SeedProfile> = {
  yemek: {
    prob: 0.85,
    min: 40,
    max: 320,
    titles: ["Öğle yemeği", "Akşam yemeği", "Kahve", "Kahvaltı", "Fast food"],
  },
  ulasim: {
    prob: 0.65,
    min: 15,
    max: 140,
    titles: ["Taksi", "Otobüs bileti", "Benzin", "Metro kartı yükleme"],
  },
  eglence: {
    prob: 0.32,
    min: 80,
    max: 750,
    titles: ["Sinema bileti", "Konser bileti", "Netflix", "Kitap"],
  },
  market: {
    prob: 0.45,
    min: 120,
    max: 850,
    titles: ["Haftalık market", "Meyve sebze", "Temizlik ürünleri"],
  },
  fatura: {
    prob: 0.09,
    min: 180,
    max: 1400,
    titles: ["Elektrik faturası", "İnternet faturası", "Kira", "Su faturası"],
  },
  saglik: {
    prob: 0.07,
    min: 60,
    max: 900,
    titles: ["Eczane", "Doktor muayenesi", "Diş hekimi"],
  },
  diger: {
    prob: 0.22,
    min: 20,
    max: 280,
    titles: ["Diğer harcama", "Hediye", "Bağış"],
  },
};

const SAVING_TITLES = [
  "Kahve almadım",
  "Taksi yerine yürüdüm",
  "Dışarıda yemedim",
  "İndirim kuponu kullandım",
];
const SAVING_PROB = 0.12;
const SAVING_MIN = 30;
const SAVING_MAX = 250;

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function randomTimeOn(day: Date): Date {
  const ts = new Date(day);
  ts.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
  return ts;
}

function roundToFive(n: number): number {
  return Math.round(n / 5) * 5;
}

export function generateSeedData(categories: Category[] = DEFAULT_CATEGORIES): Transaction[] {
  const txs: Transaction[] = [];
  const today = new Date();
  const start = addDays(today, -75);

  for (let d = 0; d <= 75; d++) {
    const day = addDays(start, d);

    categories.forEach((cat) => {
      const profile = SEED_PROFILE[cat.id];
      if (!profile || Math.random() >= profile.prob) return;
      const amount = roundToFive(profile.min + Math.random() * (profile.max - profile.min));
      const title = profile.titles[Math.floor(Math.random() * profile.titles.length)];
      txs.push({
        id: `seed-${cat.id}-${d}-${Math.random().toString(36).slice(2)}`,
        type: "expense",
        title,
        description: "",
        amount,
        categoryId: cat.id,
        timestamp: randomTimeOn(day).toISOString(),
      });
    });

    if (Math.random() < SAVING_PROB) {
      const amount = roundToFive(SAVING_MIN + Math.random() * (SAVING_MAX - SAVING_MIN));
      const cat = categories[Math.floor(Math.random() * categories.length)];
      txs.push({
        id: `seed-saving-${d}-${Math.random().toString(36).slice(2)}`,
        type: "saving",
        title: SAVING_TITLES[Math.floor(Math.random() * SAVING_TITLES.length)],
        description: "",
        amount,
        categoryId: cat.id,
        timestamp: randomTimeOn(day).toISOString(),
      });
    }
  }

  return txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
