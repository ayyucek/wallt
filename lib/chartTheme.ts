// Recharts, Tailwind sınıfları değil ham renk değerleri kabul eder; bu yüzden
// Bölüm 4'teki ink/muted tokenlarının aynı değerlerini burada ham hex/rgba
// olarak tutuyoruz. Yeni bir renk icat edilmiyor.

export const CHART_MUTED = "#9891a8";
export const CHART_INK = "#2b2640";
export const CHART_GRID = "rgba(152, 145, 168, 0.25)";

export const CHART_TICK = {
  fill: CHART_MUTED,
  fontSize: 10,
  fontFamily: "Inter, sans-serif",
};

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 6px 20px rgba(43,38,64,.12)",
  fontFamily: "Inter, sans-serif",
  fontSize: 12,
};
