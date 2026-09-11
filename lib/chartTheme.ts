// Recharts, Tailwind sınıfları değil ham renk değerleri kabul eder; bu yüzden
// Bölüm 4'teki ink/muted tokenlarının aynı değerlerini burada ham hex/rgba
// olarak tutuyoruz. Yeni bir renk icat edilmiyor.

export const CHART_MUTED = "#a79fc7";
export const CHART_INK = "#f1eefa";
export const CHART_GRID = "#372e5c";

// Dönem karşılaştırma (İstatistikler ekranı, PRD 7.1) — periodA/periodB
// Tailwind tokenlarının ham hex karşılıkları.
export const PERIOD_A = "#ffa45c";
export const PERIOD_B = "#5ac8fa";

// Koyu arka plan üzerinde bar/hücre hover vurgusu.
export const CHART_CURSOR_FILL = "rgba(255,255,255,0.05)";

export const CHART_TICK = {
  fill: CHART_MUTED,
  fontSize: 10,
  fontFamily: "Inter, sans-serif",
};

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#241e42",
  borderRadius: 12,
  border: "1px solid #3a3164",
  boxShadow: "0 10px 28px rgba(0,0,0,.45)",
  fontFamily: "Inter, sans-serif",
  fontSize: 12,
  color: "#f1eefa",
};
