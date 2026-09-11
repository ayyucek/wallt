import type { Category } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "yemek", name: "Yemek", color: "#FF7A6B" },
  { id: "ulasim", name: "Ulaşım", color: "#4F9DDE" },
  { id: "eglence", name: "Eğlence", color: "#A374E8" },
  { id: "market", name: "Market", color: "#4CC2A0" },
  { id: "fatura", name: "Fatura", color: "#FFC15E" },
  { id: "saglik", name: "Sağlık", color: "#F0729D" },
  { id: "diger", name: "Diğer", color: "#9AA3B5" },
];

// Yeni custom kategoriye bu diziden sırayla renk atanır.
export const CUSTOM_PALETTE = [
  "#E88D4F",
  "#39B7A3",
  "#E2678A",
  "#7C8CE0",
  "#5FB88A",
  "#E0A23D",
];

// Tasarruf (saving) girişleri için sabit renk — kategori paletinden bağımsız.
export const SAVING_COLOR = "#34D399";
