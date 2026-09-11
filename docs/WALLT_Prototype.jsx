import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ComposedChart, Line, ResponsiveContainer, PieChart, Pie,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Plus, X, Download, Share2, Printer, Info, Home, BarChart3, Filter, PieChart as PieChartIcon } from "lucide-react";

/* ---------------------------------- data ---------------------------------- */

const INK = "#F1EEFA";
const MUTED = "#A79FC7";
const GRADIENT_PRIMARY = "linear-gradient(135deg, #7B5FE0 0%, #4F7FE0 100%)";

const DEFAULT_CATEGORIES = [
  { id: "yemek", name: "Yemek", color: "#FF6F91" },
  { id: "ulasim", name: "Ulaşım", color: "#4F9DFF" },
  { id: "eglence", name: "Eğlence", color: "#A374E8" },
  { id: "market", name: "Market", color: "#4FD1A0" },
  { id: "fatura", name: "Fatura", color: "#FFC15E" },
  { id: "saglik", name: "Sağlık", color: "#E0568C" },
  { id: "diger", name: "Diğer", color: "#8B93B8" },
];

const CUSTOM_PALETTE = ["#E88D4F", "#39B7A3", "#E2678A", "#7C8CE0", "#5FB88A", "#E0A23D"];

const PERIOD_A_COLOR = "#FFA45C";
const PERIOD_B_COLOR = "#5AC8FA";
const SAVING_COLOR = "#34D399";

const SEED_PROFILE = {
  yemek: { prob: 0.85, min: 40, max: 320, titles: ["Öğle yemeği", "Akşam yemeği", "Kahve", "Kahvaltı", "Fast food"] },
  ulasim: { prob: 0.65, min: 15, max: 140, titles: ["Taksi", "Otobüs bileti", "Benzin", "Metro kartı yükleme"] },
  eglence: { prob: 0.32, min: 80, max: 750, titles: ["Sinema bileti", "Konser bileti", "Netflix", "Kitap"] },
  market: { prob: 0.45, min: 120, max: 850, titles: ["Haftalık market", "Meyve sebze", "Temizlik ürünleri"] },
  fatura: { prob: 0.09, min: 180, max: 1400, titles: ["Elektrik faturası", "İnternet faturası", "Kira", "Su faturası"] },
  saglik: { prob: 0.07, min: 60, max: 900, titles: ["Eczane", "Doktor muayenesi", "Diş hekimi"] },
  diger: { prob: 0.22, min: 20, max: 280, titles: ["Diğer harcama", "Hediye", "Bağış"] },
};

/* --------------------------------- helpers --------------------------------- */

const pad = (n) => String(n).padStart(2, "0");
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const startOfWeek = (d) => { const c = new Date(d); const day = c.getDay(); const diff = day === 0 ? -6 : 1 - day; return addDays(c, diff); };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

function toDatetimeLocalValue(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatCurrency(n) {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}
function formatDateTime(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}
function txDateStr(tx) { return tx.timestamp.slice(0, 10); }
function isExpense(t) { return t.type !== "saving"; }
function isSaving(t) { return t.type === "saving"; }
function filterByRange(txs, start, end) {
  return txs.filter((t) => { const d = txDateStr(t); return d >= start && d <= end; });
}

function aggregate(txs, categories) {
  const map = {};
  categories.forEach((c) => { map[c.id] = { ...c, total: 0 }; });
  txs.forEach((t) => {
    if (!map[t.categoryId]) map[t.categoryId] = { id: t.categoryId, name: t.categoryId, color: "#888", total: 0 };
    map[t.categoryId].total += t.amount;
  });
  return Object.values(map);
}

function paretoData(agg) {
  const sorted = agg.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const grand = sorted.reduce((s, c) => s + c.total, 0);
  let cum = 0;
  return sorted.map((c) => {
    cum += c.total;
    return { ...c, cumPct: grand ? +(cum / grand * 100).toFixed(1) : 0 };
  });
}

function generateSeedData(categories) {
  const txs = [];
  const today = new Date();
  const start = addDays(today, -75);
  for (let d = 0; d <= 75; d++) {
    const day = addDays(start, d);
    categories.forEach((cat) => {
      const w = SEED_PROFILE[cat.id];
      if (!w) return;
      if (Math.random() < w.prob) {
        const amount = Math.round((w.min + Math.random() * (w.max - w.min)) / 5) * 5;
        const ts = new Date(day);
        ts.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
        const title = w.titles[Math.floor(Math.random() * w.titles.length)];
        txs.push({
          id: `seed-${cat.id}-${d}-${Math.random().toString(36).slice(2)}`,
          title, description: "", amount, categoryId: cat.id, timestamp: ts.toISOString(),
        });
      }
    });
  }
  return txs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

const TODAY = new Date();
const TODAY_STR = toISODate(TODAY);
const THIS_MONTH_START = toISODate(startOfMonth(TODAY));
const LAST_MONTH_START = toISODate(startOfMonth(addDays(startOfMonth(TODAY), -1)));
const LAST_MONTH_END = toISODate(endOfMonth(addDays(startOfMonth(TODAY), -1)));
const THIS_WEEK_START = toISODate(startOfWeek(TODAY));
const LAST_WEEK_START = toISODate(addDays(startOfWeek(TODAY), -7));
const LAST_WEEK_END = toISODate(addDays(startOfWeek(TODAY), -1));

function formatRangeLabel(startStr, endStr) {
  const s = new Date(`${startStr}T00:00:00`);
  const e = new Date(`${endStr}T00:00:00`);
  const sStr = s.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  const eStr = e.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  return `${sStr} – ${eStr}`;
}

const TOOLTIP_STYLE = { background: "#241E42", border: "1px solid #3A3164", borderRadius: 14, fontSize: 12, padding: "10px 13px", boxShadow: "0 10px 28px rgba(0,0,0,.45)" };
const TOOLTIP_ITEM_STYLE = { color: INK, fontFamily: "'Inter',sans-serif", fontWeight: 600 };
const TOOLTIP_LABEL_STYLE = { color: INK, fontWeight: 700, marginBottom: 4, fontFamily: "'Baloo 2',sans-serif" };
const AXIS_TICK = { fill: MUTED, fontSize: 10, fontFamily: "'Inter',sans-serif" };
const GRID_STROKE = "#372E5C";

function buildCumulativeDateMap(period, txs) {
  const start = new Date(`${period.start}T00:00:00`);
  const end = new Date(`${period.end}T00:00:00`);
  const dayCount = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const dayTotals = new Array(dayCount).fill(0);
  txs.forEach((t) => {
    const d = new Date(`${txDateStr(t)}T00:00:00`);
    const idx = Math.round((d - start) / 86400000);
    if (idx >= 0 && idx < dayCount) dayTotals[idx] += t.amount;
  });
  let cum = 0;
  const cumPctByDay = dayTotals.map((amt) => { cum += amt; return total ? (cum / total) * 100 : 0; });
  return function percentToDate(pct) {
    if (!total) return null;
    for (let i = 0; i < cumPctByDay.length; i++) {
      if (cumPctByDay[i] >= pct) return addDays(start, i);
    }
    return addDays(start, dayCount - 1);
  };
}

function formatShortDate(d) {
  if (!d) return "";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function tooltipValueFormatter(value, name) {
  if (typeof name === "string" && name.toLowerCase().includes("kümülatif")) return [`%${value}`, name];
  return [formatCurrency(value), name];

}

/* ---------------------------------- styles ---------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

.wallt-shell{ min-height:100vh; background:#0F0B22; display:flex; justify-content:center; }

.wallt-app{
  --page:#1B1533; --card:#241E42; --surface2:#2C2550; --ink:${INK}; --muted:${MUTED};
  --amber:${PERIOD_A_COLOR}; --teal:${PERIOD_B_COLOR};
  font-family:'Inter',sans-serif;
  background:linear-gradient(165deg, #1B1533 0%, #1A1B3D 55%, #17203F 100%);
  color:var(--ink);
  width:100%; max-width:430px; height:100vh; position:relative; overflow-x:hidden;
  transform:translateZ(0); display:flex; flex-direction:column;
}
.wallt-app *{ box-sizing:border-box; }
.wallt-display{ font-family:'Baloo 2',sans-serif; }

.wallt-scroll{ flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px 16px 104px; }

.wallt-topbar{ display:flex; align-items:center; justify-content:space-between; padding:2px 0 4px; }
.wallt-brand{ display:flex; align-items:center; gap:8px; }
.wallt-brand-mark{ width:26px; height:26px; border-radius:9px; background:${GRADIENT_PRIMARY}; flex-shrink:0; }
.wallt-logo{ font-family:'Baloo 2',sans-serif; font-size:19px; font-weight:700; color:var(--ink); letter-spacing:0.5px; }
.wallt-icon-actions{ display:flex; gap:8px; }
.wallt-icon-btn{ display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%;
  background:var(--card); border:none; color:var(--ink); cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.35); }
.wallt-icon-btn:active{ transform:scale(.94); }

.wallt-tagline{ color:var(--muted); font-size:12.5px; margin:12px 0 20px; line-height:1.55; font-weight:500; }

.wallt-panel{ background:var(--card); border-radius:20px; padding:17px; box-shadow:0 6px 20px rgba(0,0,0,.28); }
.wallt-panel + .wallt-panel{ margin-top:16px; }
.wallt-panel h3{ margin:0 0 12px; font-size:13px; font-weight:700; color:var(--ink); }

.wallt-field{ margin-bottom:14px; }
.wallt-field:last-child{ margin-bottom:0; }
.wallt-label{ display:block; font-size:11.5px; color:var(--muted); margin-bottom:6px; font-weight:600; }
.wallt-input{ width:100%; background:var(--surface2); border:1.5px solid transparent; color:var(--ink);
  padding:11px 12px; border-radius:12px; font-family:'Inter',sans-serif; font-size:14.5px; font-weight:600; }
.wallt-input:focus{ outline:none; border-color:#7B5FE0; background:#332B5E; }
.wallt-input-text{ font-weight:600; }
.wallt-input-date{ font-family:'Inter',sans-serif; font-size:13px; color-scheme:dark; }
.wallt-textarea{ width:100%; background:var(--surface2); border:1.5px solid transparent; color:var(--ink);
  padding:10px 12px; border-radius:12px; font-family:'Inter',sans-serif; font-size:14px; font-weight:500; resize:vertical; min-height:50px; }
.wallt-textarea:focus{ outline:none; border-color:#7B5FE0; background:#332B5E; }

.wallt-chips{ display:flex; flex-wrap:wrap; gap:8px; }
.wallt-chip{ display:inline-flex; align-items:center; gap:6px; border:none; background:var(--surface2);
  color:var(--ink); padding:8px 13px; border-radius:100px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; }
.wallt-chip .dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.wallt-chip.active{ color:#fff; }
.wallt-chip-add{ background:none; border:1.5px dashed #4A4074; color:var(--muted); }
.wallt-inline-add{ display:flex; gap:6px; margin-top:8px; }
.wallt-inline-add input{ flex:1; }

.wallt-date-stack{ display:flex; flex-direction:column; gap:10px; }

.wallt-quickrange{ display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
.wallt-btn{
  display:inline-flex; align-items:center; gap:6px; background:var(--surface2); color:var(--ink);
  border:none; padding:9px 15px; border-radius:100px; font-family:'Inter',sans-serif; font-weight:600;
  font-size:12.5px; cursor:pointer;
}
.wallt-btn:active{ transform:scale(.96); }
.wallt-btn-primary{ background:${GRADIENT_PRIMARY}; color:#fff; font-weight:700;
  box-shadow:0 6px 16px rgba(79,127,224,.40); }
.wallt-btn:disabled{ opacity:.45; box-shadow:none; }

.wallt-hero-row{ display:flex; align-items:stretch; gap:10px; margin-bottom:20px; }
.wallt-hero-card{ flex:1; background:${GRADIENT_PRIMARY}; border-radius:20px; padding:16px 18px;
  box-shadow:0 10px 26px rgba(79,95,224,.35); }
.wallt-hero-label{ font-size:12px; color:rgba(255,255,255,.8); margin-bottom:3px; font-weight:600; }
.wallt-hero-num{ font-family:'Baloo 2',sans-serif; font-size:clamp(28px,8.5vw,38px); font-weight:700; line-height:1.1; color:#fff; }
.wallt-hero-range{ font-size:11.5px; color:rgba(255,255,255,.75); margin-top:5px; font-weight:600; }
.wallt-hero-filter{ flex-shrink:0; width:46px; border-radius:16px; background:var(--card); border:none;
  display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 6px 16px rgba(0,0,0,.35); color:var(--ink); }
.wallt-hero-filter:active{ transform:scale(.94); }

.wallt-legend{ display:flex; flex-wrap:wrap; gap:13px; margin-top:12px; }
.wallt-legend-item{ display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--ink); font-weight:600; }
.wallt-legend-item .dot{ width:9px; height:9px; border-radius:50%; }

.wallt-receipt-list{ max-height:320px; overflow-y:auto; margin-top:4px; }
.wallt-receipt-row{ padding:10px 2px; border-bottom:1px solid #342C58; }
.wallt-receipt-row:last-child{ border-bottom:none; }
.wallt-receipt-top{ display:flex; align-items:center; gap:9px; }
.wallt-receipt-row .dot{ width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.wallt-receipt-title{ flex:1; font-size:13.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wallt-receipt-amt{ font-family:'Baloo 2',sans-serif; font-size:14px; font-weight:600; flex-shrink:0; }
.wallt-receipt-meta{ display:flex; gap:6px; margin-top:2px; padding-left:18px; font-size:10.5px; color:var(--muted); font-weight:500; }
.wallt-receipt-desc{ padding-left:18px; font-size:11px; color:var(--muted); margin-top:2px; font-weight:500; }

.wallt-stats-row{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:18px; }
.wallt-stat{ background:var(--card); border-radius:16px; padding:12px 10px; box-shadow:0 6px 16px rgba(0,0,0,.28); }
.wallt-stat-label{ font-size:10px; color:var(--muted); margin-bottom:5px; line-height:1.2; font-weight:600; }
.wallt-stat-value{ font-family:'Baloo 2',sans-serif; font-size:16px; font-weight:600; }
.wallt-stat-a .wallt-stat-value{ color:#FFA45C; }
.wallt-stat-b .wallt-stat-value{ color:#5AC8FA; }

.wallt-period-card{ border-radius:18px; padding:15px; background:var(--card); box-shadow:0 6px 18px rgba(0,0,0,.28); }
.wallt-period-card + .wallt-period-card{ margin-top:14px; }
.wallt-period-summary-card{ flex:1; background:var(--card); border-radius:20px; padding:14px 16px; box-shadow:0 6px 20px rgba(0,0,0,.28); display:flex; flex-direction:column; gap:10px; justify-content:center; }
.wallt-period-summary-row{ display:flex; align-items:center; gap:8px; }
.wallt-period-summary-label{ font-size:12.5px; font-weight:700; color:var(--ink); }
.wallt-period-summary-range{ margin-left:auto; font-size:11px; color:var(--muted); font-weight:600; }
.wallt-period-head{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.wallt-period-swatch{ width:11px; height:11px; border-radius:50%; flex-shrink:0; }
.wallt-period-title{ font-size:12.5px; font-weight:700; }

.wallt-caption{ font-size:11.5px; color:var(--muted); line-height:1.55; font-weight:500; }
.wallt-info-row{ display:flex; gap:9px; align-items:flex-start; background:#1E2A52; border-radius:16px; padding:13px 15px; margin-bottom:18px; }
.wallt-info-row svg{ flex-shrink:0; margin-top:1px; color:#6FB8FA; }

.wallt-chart-title{ font-size:13.5px; font-weight:700; margin:0 0 4px; }
.wallt-chart-sub{ font-size:11px; color:var(--muted); margin:0 0 14px; font-weight:500; }

/* bottom tab bar */
.wallt-tabbar{ position:fixed; left:0; right:0; bottom:0; height:70px; background:var(--card);
  box-shadow:0 -6px 20px rgba(0,0,0,.35); display:flex; align-items:center; z-index:40; }
.wallt-tabbar-half{ flex:1; display:flex; height:100%; }
.wallt-tabbar-half:first-child{ padding-right:46px; }
.wallt-tabbar-half:last-child{ padding-left:46px; }
.wallt-tabbar-item{ flex:1; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:4px; background:none; border:none; color:var(--muted); font-family:'Inter',sans-serif; font-weight:600; font-size:10.5px; cursor:pointer; }
.wallt-tabbar-item.active{ color:#9B7BE0; }
.wallt-tabbar-item.tab-b.active{ color:#4F9DFF; }
.wallt-tabbar-item.tab-c.active{ color:#34D399; }
.wallt-tabbar-fab-slot{ position:absolute; left:50%; top:0; height:100%; width:64px; transform:translateX(-50%);
  display:flex; align-items:center; justify-content:center; }
.wallt-fab{ position:absolute; top:-26px; width:54px; height:54px; border-radius:50%;
  background:${GRADIENT_PRIMARY}; border:6px solid var(--page);
  color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
  box-shadow:0 4px 10px rgba(79,95,224,.4); }
.wallt-fab:active{ transform:scale(.94); }

/* toast */
.wallt-toast{ position:fixed; bottom:88px; left:50%; transform:translateX(-50%); background:#0F0B22; color:#F1EEFA;
  padding:10px 18px; border-radius:100px; font-size:12.5px; font-weight:600; z-index:50; box-shadow:0 8px 22px rgba(0,0,0,.45);
  max-width:88%; text-align:center; font-family:'Inter',sans-serif; }

/* bottom sheet modal */
@keyframes wallt-sheet-up{ from{ transform:translateY(100%); } to{ transform:translateY(0); } }
.wallt-sheet-overlay{ position:fixed; inset:0; background:rgba(6,4,18,.65); display:flex; align-items:flex-end; z-index:60; }
.wallt-sheet{ background:var(--page); border-radius:28px 28px 0 0;
  padding:10px 18px 26px; width:100%; max-height:88vh; overflow-y:auto; animation:wallt-sheet-up .22s cubic-bezier(.2,.8,.3,1); }
.wallt-sheet-grabber{ width:38px; height:5px; border-radius:100px; background:#4A4074; margin:0 auto 14px; }
.wallt-sheet-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.wallt-sheet-head h4{ margin:0; font-size:17px; font-family:'Baloo 2',sans-serif; font-weight:700; }
.wallt-sheet-close{ background:var(--card); border:none; border-radius:50%; width:30px; height:30px;
  display:flex; align-items:center; justify-content:center; color:var(--ink); cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,.35); }
.wallt-form-tabs{ display:flex; background:var(--surface2); border-radius:100px; padding:4px; margin-bottom:16px; gap:4px; }
.wallt-form-tab{ flex:1; text-align:center; padding:9px 4px; border-radius:100px; font-family:'Inter',sans-serif; font-size:13px; font-weight:700;
  background:none; border:none; color:var(--muted); cursor:pointer; }
.wallt-form-tab.active{ background:${GRADIENT_PRIMARY}; color:#fff; }
.wallt-form-tab.saving.active{ background:linear-gradient(135deg,#34D399,#22B8B0); }

.wallt-btn-primary.saving{ background:linear-gradient(135deg,#34D399,#22B8B0); box-shadow:0 6px 16px rgba(52,211,153,.35); }

.wallt-savings-card{ display:flex; align-items:center; justify-content:space-between; background:var(--card); border-radius:16px;
  padding:12px 16px; margin-bottom:18px; box-shadow:0 6px 16px rgba(0,0,0,.28); }
.wallt-savings-label{ display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:var(--muted); }
.wallt-savings-label .dot{ width:8px; height:8px; border-radius:50%; background:#34D399; flex-shrink:0; }
.wallt-savings-value{ font-family:'Baloo 2',sans-serif; font-size:17px; font-weight:600; color:#34D399; }

.wallt-receipt-saving .wallt-receipt-amt{ color:#34D399; }
.wallt-receipt-tag{ font-size:9.5px; font-weight:700; color:#34D399; background:rgba(52,211,153,.15); padding:2px 7px; border-radius:100px; margin-left:6px; }

.wallt-sheet-row{ display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid #342C58; font-size:13px; font-weight:600; }
.wallt-sheet-actions{ display:flex; gap:8px; margin-top:16px; }
`;

/* --------------------------------- component --------------------------------- */

export default function WalltPrototype() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState(() => generateSeedData(DEFAULT_CATEGORIES));
  const [view, setView] = useState("genel");
  const [toast, setToast] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRangeSheet, setShowRangeSheet] = useState(false);
  const [showPeriodSheet, setShowPeriodSheet] = useState(false);

  // entry form
  const [entryType, setEntryType] = useState("expense");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCat, setSelectedCat] = useState(DEFAULT_CATEGORIES[0].id);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [entryDateTime, setEntryDateTime] = useState(() => toDatetimeLocalValue(new Date()));

  // genel view range
  const [rangeStart, setRangeStart] = useState(THIS_MONTH_START);
  const [rangeEnd, setRangeEnd] = useState(TODAY_STR);

  // grafikler view range
  const [graphRangeStart, setGraphRangeStart] = useState(THIS_MONTH_START);
  const [graphRangeEnd, setGraphRangeEnd] = useState(TODAY_STR);
  const [showGraphRangeSheet, setShowGraphRangeSheet] = useState(false);

  // compare view ranges
  const [periodA, setPeriodA] = useState({ start: LAST_MONTH_START, end: LAST_MONTH_END, label: "Geçen Ay" });
  const [periodB, setPeriodB] = useState({ start: THIS_MONTH_START, end: TODAY_STR, label: "Bu Ay" });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  function handleAdd(e) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0 || !title.trim() || !entryDateTime) return;
    const cat = categories.find((c) => c.id === selectedCat) || categories[0];
    const ts = new Date(entryDateTime);
    const tx = {
      id: `tx-${Date.now()}`,
      type: entryType,
      title: title.trim(),
      description: description.trim(),
      amount: val,
      categoryId: cat.id,
      timestamp: ts.toISOString(),
    };
    setTransactions((prev) => [tx, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    setTitle("");
    setDescription("");
    setAmount("");
    setEntryDateTime(toDatetimeLocalValue(new Date()));
    setShowAddModal(false);
    setToast(entryType === "saving" ? `Tasarruf kaydedildi — ${formatCurrency(val)}` : `"${tx.title}" eklendi — ${formatCurrency(val)}`);
    setEntryType("expense");
  }

  function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const color = CUSTOM_PALETTE[categories.length % CUSTOM_PALETTE.length];
    setCategories((prev) => [...prev, { id, name, color }]);
    setSelectedCat(id);
    setNewCatName("");
    setAddingCat(false);
  }

  function openAddWithCategory(categoryId) {
    setEntryType("expense");
    setSelectedCat(categoryId);
    setShowAddModal(true);
  }

  function setQuickRange(preset) {
    if (preset === "week") { setRangeStart(THIS_WEEK_START); setRangeEnd(TODAY_STR); }
    if (preset === "lastweek") { setRangeStart(LAST_WEEK_START); setRangeEnd(LAST_WEEK_END); }
    if (preset === "month") { setRangeStart(THIS_MONTH_START); setRangeEnd(TODAY_STR); }
    if (preset === "lastmonth") { setRangeStart(LAST_MONTH_START); setRangeEnd(LAST_MONTH_END); }
  }

  function setQuickGraphRange(preset) {
    if (preset === "week") { setGraphRangeStart(THIS_WEEK_START); setGraphRangeEnd(TODAY_STR); }
    if (preset === "lastweek") { setGraphRangeStart(LAST_WEEK_START); setGraphRangeEnd(LAST_WEEK_END); }
    if (preset === "month") { setGraphRangeStart(THIS_MONTH_START); setGraphRangeEnd(TODAY_STR); }
    if (preset === "lastmonth") { setGraphRangeStart(LAST_MONTH_START); setGraphRangeEnd(LAST_MONTH_END); }
  }

  function setQuickPeriod(which, preset) {
    const setter = which === "A" ? setPeriodA : setPeriodB;
    if (preset === "week") setter({ start: THIS_WEEK_START, end: TODAY_STR, label: "Bu Hafta" });
    if (preset === "lastweek") setter({ start: LAST_WEEK_START, end: LAST_WEEK_END, label: "Geçen Hafta" });
    if (preset === "month") setter({ start: THIS_MONTH_START, end: TODAY_STR, label: "Bu Ay" });
    if (preset === "lastmonth") setter({ start: LAST_MONTH_START, end: LAST_MONTH_END, label: "Geçen Ay" });
  }

  const filteredGenel = useMemo(() => filterByRange(transactions, rangeStart, rangeEnd), [transactions, rangeStart, rangeEnd]);
  const filteredGenelExpenses = useMemo(() => filteredGenel.filter(isExpense), [filteredGenel]);
  const filteredGenelSavings = useMemo(() => filteredGenel.filter(isSaving), [filteredGenel]);
  const aggGenel = useMemo(() => aggregate(filteredGenelExpenses, categories), [filteredGenelExpenses, categories]);
  const aggGenelSorted = useMemo(() => [...aggGenel].sort((a, b) => b.total - a.total), [aggGenel]);
  const totalGenel = useMemo(() => filteredGenelExpenses.reduce((s, t) => s + t.amount, 0), [filteredGenelExpenses]);
  const totalSavingsGenel = useMemo(() => filteredGenelSavings.reduce((s, t) => s + t.amount, 0), [filteredGenelSavings]);
  const barChartData = useMemo(() => {
    if (totalSavingsGenel <= 0) return aggGenelSorted;
    return [...aggGenelSorted, { id: "__savings__", name: "Tasarruf", color: SAVING_COLOR, total: totalSavingsGenel, isSaving: true }];
  }, [aggGenelSorted, totalSavingsGenel]);

  const txA = useMemo(() => filterByRange(transactions, periodA.start, periodA.end).filter(isExpense), [transactions, periodA]);
  const txB = useMemo(() => filterByRange(transactions, periodB.start, periodB.end).filter(isExpense), [transactions, periodB]);
  const aggA = useMemo(() => aggregate(txA, categories), [txA, categories]);
  const aggB = useMemo(() => aggregate(txB, categories), [txB, categories]);
  const totalA = useMemo(() => txA.reduce((s, t) => s + t.amount, 0), [txA]);
  const totalB = useMemo(() => txB.reduce((s, t) => s + t.amount, 0), [txB]);
  const diffPct = totalA === 0 ? (totalB > 0 ? 100 : 0) : ((totalB - totalA) / totalA) * 100;

  const compareBarData = useMemo(() => {
    return categories.map((c) => ({
      name: c.name,
      A: aggA.find((a) => a.id === c.id)?.total || 0,
      B: aggB.find((b) => b.id === c.id)?.total || 0,
    })).filter((d) => d.A > 0 || d.B > 0);
  }, [categories, aggA, aggB]);

  const comparePareto = useMemo(() => {
    const merged = categories.map((c) => {
      const a = aggA.find((x) => x.id === c.id)?.total || 0;
      const b = aggB.find((x) => x.id === c.id)?.total || 0;
      return { ...c, a, b, combined: a + b };
    }).filter((c) => c.combined > 0).sort((x, y) => y.combined - x.combined);
    let cumA = 0, cumB = 0;
    return merged.map((c) => {
      cumA += c.a; cumB += c.b;
      return {
        ...c,
        cumPctA: totalA ? +(cumA / totalA * 100).toFixed(1) : 0,
        cumPctB: totalB ? +(cumB / totalB * 100).toFixed(1) : 0,
      };
    });
  }, [categories, aggA, aggB, totalA, totalB]);

  const periodADateAt = useMemo(() => buildCumulativeDateMap(periodA, txA), [periodA, txA]);

  const filteredGraph = useMemo(() => filterByRange(transactions, graphRangeStart, graphRangeEnd).filter(isExpense), [transactions, graphRangeStart, graphRangeEnd]);
  const aggGraph = useMemo(() => aggregate(filteredGraph, categories), [filteredGraph, categories]);
  const aggGraphSorted = useMemo(() => [...aggGraph].sort((a, b) => b.total - a.total), [aggGraph]);
  const pieGraph = useMemo(() => aggGraph.filter((c) => c.total > 0), [aggGraph]);
  const totalGraph = useMemo(() => filteredGraph.reduce((s, t) => s + t.amount, 0), [filteredGraph]);
  const avgGraph = pieGraph.length ? totalGraph / pieGraph.length : 0;
  const radarData = useMemo(() => pieGraph.map((c) => ({ category: c.name, value: c.total, average: avgGraph })), [pieGraph, avgGraph]);

  const recent = transactions.slice(0, 40);
  const canSubmit = amount && parseFloat(amount) > 0 && title.trim() && entryDateTime;

  const AddForm = (
    <form onSubmit={handleAdd}>
      <div className="wallt-form-tabs">
        <button type="button" className={`wallt-form-tab ${entryType === "expense" ? "active" : ""}`} onClick={() => setEntryType("expense")}>
          Harcama
        </button>
        <button type="button" className={`wallt-form-tab saving ${entryType === "saving" ? "active" : ""}`} onClick={() => setEntryType("saving")}>
          Tasarruf
        </button>
      </div>
      {entryType === "saving" && (
        <p className="wallt-caption" style={{ marginBottom: 14 }}>
          Harcamadığın parayı buraya yaz — bu, dönem boyunca ne kadar tasarruf ettiğini gösterecek.
        </p>
      )}
      <div className="wallt-field">
        <label className="wallt-label">Başlık</label>
        <input className="wallt-input wallt-input-text" type="text" placeholder={entryType === "saving" ? "örn. Kahve almadım" : "örn. Öğle yemeği"} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="wallt-field">
        <label className="wallt-label">Açıklama (opsiyonel)</label>
        <textarea className="wallt-textarea" placeholder="Ek not..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="wallt-field">
        <label className="wallt-label">{entryType === "saving" ? "Tasarruf Edilen Tutar (₺)" : "Tutar (₺)"}</label>
        <input className="wallt-input" type="number" min="0" step="1" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="wallt-field">
        <label className="wallt-label">Tarih ve Saat</label>
        <input className="wallt-input wallt-input-date" type="datetime-local" value={entryDateTime} onChange={(e) => setEntryDateTime(e.target.value)} />
        <p className="wallt-caption" style={{ marginTop: 6 }}>Varsayılan olarak şu an dolu gelir, istersen değiştirebilirsin.</p>
      </div>
      <div className="wallt-field">
        <label className="wallt-label">{entryType === "saving" ? "Hangi kategoriden tasarruf ettin?" : "Kategori"}</label>
        <div className="wallt-chips">
          {categories.map((c) => (
            <button
              type="button" key={c.id}
              className={`wallt-chip ${selectedCat === c.id ? "active" : ""}`}
              style={selectedCat === c.id ? { background: c.color } : undefined}
              onClick={() => setSelectedCat(c.id)}
            >
              <span className="dot" style={{ background: selectedCat === c.id ? "rgba(255,255,255,.85)" : c.color }} />{c.name}
            </button>
          ))}
          {!addingCat && (
            <button type="button" className="wallt-chip wallt-chip-add" onClick={() => setAddingCat(true)}>
              <Plus size={12} /> Yeni
            </button>
          )}
        </div>
        {addingCat && (
          <div className="wallt-inline-add">
            <input className="wallt-input wallt-input-text" placeholder="Kategori adı" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            <button type="button" className="wallt-btn" onClick={handleAddCategory}>Ekle</button>
            <button type="button" className="wallt-btn" onClick={() => { setAddingCat(false); setNewCatName(""); }}><X size={13} /></button>
          </div>
        )}
      </div>
      <div className="wallt-sheet-actions">
        <button type="submit" className={`wallt-btn wallt-btn-primary ${entryType === "saving" ? "saving" : ""}`} style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit}>
          <Plus size={14} /> {entryType === "saving" ? "Tasarruf Ekle" : "Harcama Ekle"}
        </button>
        <button type="button" className="wallt-btn" onClick={() => setShowAddModal(false)}>Vazgeç</button>
      </div>
    </form>
  );

  return (
    <div className="wallt-shell">
      <div className="wallt-app">
        <style>{CSS}</style>

        <div className="wallt-scroll">
          <div className="wallt-topbar">
            <div className="wallt-brand">
              <div className="wallt-brand-mark" />
              <div className="wallt-logo">WALLT</div>
            </div>
            <div className="wallt-icon-actions">
              <button className="wallt-icon-btn" onClick={() => setShowExport(true)} aria-label="Dışa Aktar"><Download size={16} /></button>
              <button className="wallt-icon-btn" onClick={() => setToast("Paylaşım seçenekleri açıldı (mock)")} aria-label="Paylaş"><Share2 size={16} /></button>
            </div>
          </div>
          <p className="wallt-tagline">
            PRD'deki temel akışları göstermek için hazırlanmış mobil-first prototip. Veriler örnek/mock veridir.
          </p>

          {view === "genel" && (
            <div>
              <div className="wallt-hero-row">
                <div className="wallt-hero-card">
                  <div className="wallt-hero-label">Seçili dönemde toplam harcama</div>
                  <div className="wallt-hero-num">{formatCurrency(totalGenel)}</div>
                  <div className="wallt-hero-range">{formatRangeLabel(rangeStart, rangeEnd)}</div>
                </div>
                <button className="wallt-hero-filter" onClick={() => setShowRangeSheet(true)} aria-label="Zaman aralığını filtrele">
                  <Filter size={18} />
                </button>
              </div>

              {totalSavingsGenel > 0 && (
                <div className="wallt-savings-card">
                  <div className="wallt-savings-label">
                    <span className="dot" />
                    Bu dönemde ettiğin tasarruf
                  </div>
                  <div className="wallt-savings-value">{formatCurrency(totalSavingsGenel)}</div>
                </div>
              )}

              <div className="wallt-panel">
                <p className="wallt-chart-title">Kategoriye Göre Harcama</p>
                <p className="wallt-chart-sub">En çok harcanandan en aza sıralı · bir bara dokunarak o kategoriye harcama ekleyebilirsin</p>
                <ResponsiveContainer width="100%" height={Math.max(180, barChartData.length * 42)}>
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <defs>
                      <pattern id="savingsSparkle" width="10" height="10" patternUnits="userSpaceOnUse">
                        <rect width="10" height="10" fill={SAVING_COLOR} fillOpacity="0.22" />
                        <circle cx="2" cy="2.5" r="0.7" fill="#fff" fillOpacity="0.9">
                          <animate attributeName="opacity" values="0.15;1;0.15" dur="1.6s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="7.5" cy="5.5" r="0.55" fill="#fff" fillOpacity="0.8">
                          <animate attributeName="opacity" values="1;0.15;1" dur="2.2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="4.5" cy="8.5" r="0.45" fill="#fff" fillOpacity="0.7">
                          <animate attributeName="opacity" values="0.2;0.9;0.2" dur="1.9s" repeatCount="indefinite" />
                        </circle>
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Bar dataKey="total" name="Toplam" radius={[0, 8, 8, 0]} cursor="pointer">
                      {barChartData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.isSaving ? "url(#savingsSparkle)" : entry.color}
                          stroke={entry.isSaving ? SAVING_COLOR : "none"}
                          strokeWidth={entry.isSaving ? 1.5 : 0}
                          strokeDasharray={entry.isSaving ? "5 4" : undefined}
                          onClick={() => !entry.isSaving && openAddWithCategory(entry.id)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="wallt-panel">
                <h3>Son Hareketler</h3>
                <div className="wallt-receipt-list">
                  {recent.length === 0 && <p className="wallt-caption">Henüz harcama yok.</p>}
                  {recent.map((t) => {
                    const cat = categories.find((c) => c.id === t.categoryId);
                    const saving = isSaving(t);
                    return (
                      <div className={`wallt-receipt-row ${saving ? "wallt-receipt-saving" : ""}`} key={t.id}>
                        <div className="wallt-receipt-top">
                          <span className="dot" style={{ background: saving ? SAVING_COLOR : (cat?.color || "#888") }} />
                          <span className="wallt-receipt-title">{t.title || cat?.name}</span>
                          <span className="wallt-receipt-amt">{saving ? "+" : ""}{formatCurrency(t.amount)}</span>
                        </div>
                        <div className="wallt-receipt-meta">
                          <span>{cat?.name || t.categoryId}</span><span>·</span><span>{formatDateTime(t.timestamp)}</span>
                          {saving && <span className="wallt-receipt-tag">Tasarruf</span>}
                        </div>
                        {t.description && <div className="wallt-receipt-desc">{t.description}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === "grafikler" && (
            <div>
              <div className="wallt-hero-row">
                <div className="wallt-hero-card">
                  <div className="wallt-hero-label">Seçili dönemde toplam harcama</div>
                  <div className="wallt-hero-num">{formatCurrency(totalGraph)}</div>
                  <div className="wallt-hero-range">{formatRangeLabel(graphRangeStart, graphRangeEnd)}</div>
                </div>
                <button className="wallt-hero-filter" onClick={() => setShowGraphRangeSheet(true)} aria-label="Zaman aralığını filtrele">
                  <Filter size={18} />
                </button>
              </div>

              <div className="wallt-panel">
                <p className="wallt-chart-title">Kategoriye Göre Harcama</p>
                <p className="wallt-chart-sub">Seçili dönem için en çok harcanandan en aza sıralı</p>
                <ResponsiveContainer width="100%" height={Math.max(180, aggGraphSorted.length * 42)}>
                  <BarChart data={aggGraphSorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Bar dataKey="total" name="Toplam" radius={[0, 8, 8, 0]}>
                      {aggGraphSorted.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="wallt-panel">
                <p className="wallt-chart-title">Kategori Dağılımı</p>
                <p className="wallt-chart-sub">Pie chart — oransal dağılım</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieGraph} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pieGraph.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="wallt-legend">
                  {pieGraph.map((c) => (
                    <div className="wallt-legend-item" key={c.id}><span className="dot" style={{ background: c.color }} />{c.name}</div>
                  ))}
                </div>
              </div>

              <div className="wallt-panel">
                <p className="wallt-chart-title">Kategori Ağırlık Haritası</p>
                <p className="wallt-chart-sub">Her kategorinin ağırlıklı ortalamaya göre konumu</p>
                {radarData.length >= 3 ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke={GRID_STROKE} />
                        <PolarAngleAxis dataKey="category" tick={AXIS_TICK} />
                        <PolarRadiusAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} />
                        <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                        <Radar name="Harcama" dataKey="value" stroke="#7B5FE0" fill="#7B5FE0" fillOpacity={0.38} strokeWidth={2} />
                        <Radar name="Ortalama" dataKey="average" stroke={MUTED} fill="none" strokeDasharray="5 4" strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="wallt-legend">
                      <div className="wallt-legend-item"><span className="dot" style={{ background: "#7B5FE0" }} />Harcama</div>
                      <div className="wallt-legend-item"><span className="dot" style={{ background: MUTED }} />Ortalama ({formatCurrency(avgGraph)})</div>
                    </div>
                  </>
                ) : (
                  <p className="wallt-caption">Bu grafiği görebilmek için seçili dönemde en az 3 kategoride harcama olmalı.</p>
                )}
              </div>
            </div>
          )}

          {view === "karsilastir" && (
            <div>
              <div className="wallt-info-row">
                <Info size={15} />
                <p className="wallt-caption" style={{ margin: 0 }}>
                  İki farklı dönemi seç; aşağıdaki üç grafik de iki dönemi üst üste bindirerek karşılaştırır.
                </p>
              </div>

              <div className="wallt-hero-row">
                <div className="wallt-period-summary-card">
                  <div className="wallt-period-summary-row">
                    <span className="wallt-period-swatch" style={{ background: PERIOD_A_COLOR }} />
                    <span className="wallt-period-summary-label">Dönem A · {periodA.label}</span>
                    <span className="wallt-period-summary-range">{formatRangeLabel(periodA.start, periodA.end)}</span>
                  </div>
                  <div className="wallt-period-summary-row">
                    <span className="wallt-period-swatch" style={{ background: PERIOD_B_COLOR }} />
                    <span className="wallt-period-summary-label">Dönem B · {periodB.label}</span>
                    <span className="wallt-period-summary-range">{formatRangeLabel(periodB.start, periodB.end)}</span>
                  </div>
                </div>
                <button className="wallt-hero-filter" onClick={() => setShowPeriodSheet(true)} aria-label="Dönemleri düzenle">
                  <Filter size={18} />
                </button>
              </div>


              <div className="wallt-stats-row">
                <div className="wallt-stat wallt-stat-a">
                  <div className="wallt-stat-label">Dönem A</div>
                  <div className="wallt-stat-value">{formatCurrency(totalA)}</div>
                </div>
                <div className="wallt-stat wallt-stat-b">
                  <div className="wallt-stat-label">Dönem B</div>
                  <div className="wallt-stat-value">{formatCurrency(totalB)}</div>
                </div>
                <div className="wallt-stat">
                  <div className="wallt-stat-label">Fark</div>
                  <div className="wallt-stat-value">{diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}%</div>
                </div>
              </div>

              <div className="wallt-panel">
                <p className="wallt-chart-title">Kategori Bazlı Karşılaştırma</p>
                <p className="wallt-chart-sub">Her kategori için iki dönem yan yana</p>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={compareBarData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={46} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                    <Bar dataKey="A" fill={PERIOD_A_COLOR} radius={[8, 8, 0, 0]} name={periodA.label} />
                    <Bar dataKey="B" fill={PERIOD_B_COLOR} radius={[8, 8, 0, 0]} name={periodB.label} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="wallt-legend">
                  <div className="wallt-legend-item"><span className="dot" style={{ background: PERIOD_A_COLOR }} />Dönem A</div>
                  <div className="wallt-legend-item"><span className="dot" style={{ background: PERIOD_B_COLOR }} />Dönem B</div>
                </div>
              </div>

              <div className="wallt-panel">
                <p className="wallt-chart-title">Pareto Karşılaştırma</p>
                <p className="wallt-chart-sub">Barlar tutar, çizgiler kümülatif % · sağ eksen Dönem A'da o orana ulaşılan tarihi gösterir</p>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={comparePareto} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={46} />
                    <YAxis yAxisId="left" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => formatShortDate(periodADateAt(v))} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip formatter={tooltipValueFormatter} contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                    <Bar yAxisId="left" dataKey="a" fill={PERIOD_A_COLOR} fillOpacity={0.85} radius={[6, 6, 0, 0]} name={periodA.label} />
                    <Bar yAxisId="left" dataKey="b" fill={PERIOD_B_COLOR} fillOpacity={0.85} radius={[6, 6, 0, 0]} name={periodB.label} />
                    <Line yAxisId="right" type="monotone" dataKey="cumPctA" stroke={PERIOD_A_COLOR} strokeWidth={2.5} dot={{ r: 3.5 }} name={`${periodA.label} kümülatif %`} />
                    <Line yAxisId="right" type="monotone" dataKey="cumPctB" stroke={PERIOD_B_COLOR} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3.5 }} name={`${periodB.label} kümülatif %`} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* bottom tab bar */}
        <div className="wallt-tabbar">
          <div className="wallt-tabbar-half">
            <button className={`wallt-tabbar-item ${view === "genel" ? "active" : ""}`} onClick={() => setView("genel")}>
              <Home size={19} /> Genel Bakış
            </button>
            <button className={`wallt-tabbar-item tab-c ${view === "grafikler" ? "active" : ""}`} onClick={() => setView("grafikler")}>
              <PieChartIcon size={19} /> Grafikler
            </button>
          </div>
          <div className="wallt-tabbar-half">
            <button className={`wallt-tabbar-item tab-b ${view === "karsilastir" ? "active" : ""}`} onClick={() => setView("karsilastir")}>
              <BarChart3 size={19} /> İstatistikler
            </button>
          </div>
          <div className="wallt-tabbar-fab-slot">
            <button className="wallt-fab" onClick={() => setShowAddModal(true)} aria-label="Harcama Ekle">
              <Plus size={24} />
            </button>
          </div>
        </div>

        {toast && <div className="wallt-toast">{toast}</div>}

        {showRangeSheet && (
          <div className="wallt-sheet-overlay" onClick={() => setShowRangeSheet(false)}>
            <div className="wallt-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="wallt-sheet-grabber" />
              <div className="wallt-sheet-head">
                <h4>Zaman Aralığı</h4>
                <button className="wallt-sheet-close" onClick={() => setShowRangeSheet(false)}><X size={16} /></button>
              </div>
              <div className="wallt-date-stack">
                <div className="wallt-field" style={{ margin: 0 }}>
                  <label className="wallt-label">Başlangıç</label>
                  <input className="wallt-input wallt-input-date" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                </div>
                <div className="wallt-field" style={{ margin: 0 }}>
                  <label className="wallt-label">Bitiş</label>
                  <input className="wallt-input wallt-input-date" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                </div>
              </div>
              <div className="wallt-quickrange">
                <button className="wallt-btn" onClick={() => setQuickRange("week")}>Bu Hafta</button>
                <button className="wallt-btn" onClick={() => setQuickRange("lastweek")}>Geçen Hafta</button>
                <button className="wallt-btn" onClick={() => setQuickRange("month")}>Bu Ay</button>
                <button className="wallt-btn" onClick={() => setQuickRange("lastmonth")}>Geçen Ay</button>
              </div>
              <div className="wallt-sheet-actions">
                <button className="wallt-btn wallt-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowRangeSheet(false)}>Tamam</button>
              </div>
            </div>
          </div>
        )}

        {showGraphRangeSheet && (
          <div className="wallt-sheet-overlay" onClick={() => setShowGraphRangeSheet(false)}>
            <div className="wallt-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="wallt-sheet-grabber" />
              <div className="wallt-sheet-head">
                <h4>Zaman Aralığı</h4>
                <button className="wallt-sheet-close" onClick={() => setShowGraphRangeSheet(false)}><X size={16} /></button>
              </div>
              <div className="wallt-date-stack">
                <div className="wallt-field" style={{ margin: 0 }}>
                  <label className="wallt-label">Başlangıç</label>
                  <input className="wallt-input wallt-input-date" type="date" value={graphRangeStart} onChange={(e) => setGraphRangeStart(e.target.value)} />
                </div>
                <div className="wallt-field" style={{ margin: 0 }}>
                  <label className="wallt-label">Bitiş</label>
                  <input className="wallt-input wallt-input-date" type="date" value={graphRangeEnd} onChange={(e) => setGraphRangeEnd(e.target.value)} />
                </div>
              </div>
              <div className="wallt-quickrange">
                <button className="wallt-btn" onClick={() => setQuickGraphRange("week")}>Bu Hafta</button>
                <button className="wallt-btn" onClick={() => setQuickGraphRange("lastweek")}>Geçen Hafta</button>
                <button className="wallt-btn" onClick={() => setQuickGraphRange("month")}>Bu Ay</button>
                <button className="wallt-btn" onClick={() => setQuickGraphRange("lastmonth")}>Geçen Ay</button>
              </div>
              <div className="wallt-sheet-actions">
                <button className="wallt-btn wallt-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowGraphRangeSheet(false)}>Tamam</button>
              </div>
            </div>
          </div>
        )}

        {showPeriodSheet && (
          <div className="wallt-sheet-overlay" onClick={() => setShowPeriodSheet(false)}>
            <div className="wallt-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="wallt-sheet-grabber" />
              <div className="wallt-sheet-head">
                <h4>Dönemleri Düzenle</h4>
                <button className="wallt-sheet-close" onClick={() => setShowPeriodSheet(false)}><X size={16} /></button>
              </div>
              <div className="wallt-period-card">
                <div className="wallt-period-head">
                  <span className="wallt-period-swatch" style={{ background: PERIOD_A_COLOR }} />
                  <span className="wallt-period-title">Dönem A · {periodA.label}</span>
                </div>
                <div className="wallt-date-stack" style={{ marginBottom: 10 }}>
                  <input className="wallt-input wallt-input-date" type="date" value={periodA.start} onChange={(e) => setPeriodA({ ...periodA, start: e.target.value, label: "Özel" })} />
                  <input className="wallt-input wallt-input-date" type="date" value={periodA.end} onChange={(e) => setPeriodA({ ...periodA, end: e.target.value, label: "Özel" })} />
                </div>
                <div className="wallt-quickrange">
                  <button className="wallt-btn" onClick={() => setQuickPeriod("A", "week")}>Bu Hafta</button>
                  <button className="wallt-btn" onClick={() => setQuickPeriod("A", "lastweek")}>Geçen Hafta</button>
                  <button className="wallt-btn" onClick={() => setQuickPeriod("A", "month")}>Bu Ay</button>
                  <button className="wallt-btn" onClick={() => setQuickPeriod("A", "lastmonth")}>Geçen Ay</button>
                </div>
              </div>
              <div className="wallt-period-card">
                <div className="wallt-period-head">
                  <span className="wallt-period-swatch" style={{ background: PERIOD_B_COLOR }} />
                  <span className="wallt-period-title">Dönem B · {periodB.label}</span>
                </div>
                <div className="wallt-date-stack" style={{ marginBottom: 10 }}>
                  <input className="wallt-input wallt-input-date" type="date" value={periodB.start} onChange={(e) => setPeriodB({ ...periodB, start: e.target.value, label: "Özel" })} />
                  <input className="wallt-input wallt-input-date" type="date" value={periodB.end} onChange={(e) => setPeriodB({ ...periodB, end: e.target.value, label: "Özel" })} />
                </div>
                <div className="wallt-quickrange">
                  <button className="wallt-btn" onClick={() => setQuickPeriod("B", "week")}>Bu Hafta</button>
                  <button className="wallt-btn" onClick={() => setQuickPeriod("B", "lastweek")}>Geçen Hafta</button>
                  <button className="wallt-btn" onClick={() => setQuickPeriod("B", "month")}>Bu Ay</button>
                  <button className="wallt-btn" onClick={() => setQuickPeriod("B", "lastmonth")}>Geçen Ay</button>
                </div>
              </div>
              <div className="wallt-sheet-actions">
                <button className="wallt-btn wallt-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowPeriodSheet(false)}>Tamam</button>
              </div>
            </div>
          </div>
        )}

        {showExport && (
          <div className="wallt-sheet-overlay" onClick={() => setShowExport(false)}>
            <div className="wallt-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="wallt-sheet-grabber" />
              <div className="wallt-sheet-head">
                <h4>Rapor Önizleme</h4>
                <button className="wallt-sheet-close" onClick={() => setShowExport(false)}><X size={16} /></button>
              </div>
              <div className="wallt-sheet-row"><span>Dönem</span><span>{rangeStart} – {rangeEnd}</span></div>
              {aggGenel.filter((c) => c.total > 0).map((c) => (
                <div className="wallt-sheet-row" key={c.id}><span>{c.name}</span><span>{formatCurrency(c.total)}</span></div>
              ))}
              <div className="wallt-sheet-row" style={{ borderBottom: "none", fontWeight: 700 }}>
                <span>Toplam</span><span>{formatCurrency(totalGenel)}</span>
              </div>
              <p className="wallt-caption" style={{ marginTop: 10 }}>Prototipte PDF üretimi simüle edilmiştir; gerçek üründe bu görünüm PDF olarak indirilebilir ve paylaşılabilir olacaktır.</p>
              <div className="wallt-sheet-actions">
                <button className="wallt-btn wallt-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { try { window.print(); } catch (err) { setToast("Yazdırma bu ortamda desteklenmiyor"); } }}><Printer size={14} /> Yazdır</button>
                <button className="wallt-btn" onClick={() => setShowExport(false)}>Kapat</button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="wallt-sheet-overlay" onClick={() => setShowAddModal(false)}>
            <div className="wallt-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="wallt-sheet-grabber" />
              <div className="wallt-sheet-head">
                <h4>Harcama Ekle</h4>
                <button className="wallt-sheet-close" onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>
              {AddForm}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
