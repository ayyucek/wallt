// Ondalık ayracı NOKTA (13 Eylül 2026 revizyonu — kuruş desteği). Binlik
// ayraç kasıtlı olarak eklenmiyor: tr-TR locale'i ondalık ayracı olarak
// virgül kullanır, bu da nokta-ondalık kararıyla çelişirdi; toFixed(2) en
// basit ve belirsizliksiz gösterim. *100/100 yuvarlaması, toplama
// işlemlerinde birikebilecek floating-point gürültüsünü (~1e-10 mertebesi,
// bir kuruşun milyarda biri) 2. ondalık basamağa gelmeden yutar.
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `₺${rounded.toFixed(2)}`;
}

export function formatDateTime(timestamp: string): string {
  const d = new Date(timestamp);
  const date = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function formatRangeLabel(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const sStr = s.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  const eStr = e.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${sStr} – ${eStr}`;
}
