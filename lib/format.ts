export function formatCurrency(amount: number): string {
  return `₺${Math.round(amount).toLocaleString("tr-TR")}`;
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
