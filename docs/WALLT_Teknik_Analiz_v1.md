# WALLT — Teknik Analiz Dokümanı

**Versiyon:** 1.0
**Tarih:** 5 Eylül 2026
**Amaç:** Bu doküman, WALLT PRD'sinde tanımlanan ürünü gerçek bir codebase'e dönüştürürken kullanılacak teknik kararları, veri modelini, tasarım sistemini ve build sırasını tanımlar. **AI-destekli (vibe coding) geliştirme göz önünde bulundurularak yazılmıştır** — her bölüm, bir AI pair-programmer'a (Claude Code vb.) doğrudan verilebilecek kadar somut ve az yoruma açık tutulmuştur.

Bu dokümanı Claude Code'a (veya başka bir AI kodlama aracına) proje başlangıcında context olarak verip, "Faz 0'dan başlayarak sırayla ilerleyelim" demen yeterli.

---

## 1. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | React tabanlı, dosya-bazlı routing, SSR gerekmese de gelecekte backend eklemeyi kolaylaştırır |
| Dil | **TypeScript** | Vibe coding'de AI'nin ürettiği kodun tutarlılığını tip hataları üzerinden erken yakalamak için — "sessiz" mantık hatalarını azaltır |
| Stil | **Tailwind CSS** + özel tema (bkz. Bölüm 4) | AI modelleri Tailwind sınıflarını çok iyi biliyor, tutarlı üretim sağlıyor; özel tema ile marka kimliği korunuyor |
| Grafik | **Recharts** | Prototipte zaten kullanıldı, iyi dokümante, AI'nin API'sine aşina olduğu bir kütüphane |
| İkonlar | **lucide-react** | Prototiple birebir aynı, geçiş sorunsuz |
| State yönetimi | **React hooks (useState/useMemo/useContext)** | v1 kapsamı için Redux/Zustand gereksiz karmaşıklık; veri büyürse Zustand'a geçiş kolay |
| Kimlik Doğrulama & Kalıcılık | **Supabase** (Postgres + Auth, `@supabase/supabase-js` + `@supabase/ssr`) | Email+şifre girişi ve bulut tabanlı veri saklama v1 kapsamına alındı (5 Eylül 2026 revizyonu, bkz. PRD Bölüm 5.5/10); RLS (Row Level Security) ile her kullanıcı yalnızca kendi verisini görür/yazar, ayrı bir backend yazmaya gerek kalmaz |
| Form/Tarih | Native HTML input (`date`, `datetime-local`) | Prototipte test edildi, ek kütüphane gerektirmiyor |
| PDF Export | **`@react-pdf/renderer`** | Gerçek, indirilebilir/paylaşılabilir bir `.pdf` dosyası üretir (11 Eylül 2026 revizyonu — `window.print()` değil, bkz. Bölüm 9) |
| PWA | Next.js native `manifest.ts` dosya kuralı + `public/icons/` altında statik PNG ikonlar (tasarımcı tarafından sağlandı) + elle yazılmış minimal (cache'siz) service worker | "Ana ekrana ekle" deneyimi için (PRD Bölüm 11.1). **11 Eylül 2026 revizyonu:** İlk seçim olan `next-pwa` paketi 2022'den beri güncellenmemiş ve App Router'dan (dolayısıyla Next.js 16/Turbopack'ten) önceki bir dönemde kalmış — kullanılabilir değil. Next.js 16'nın kendi dosya kuralları manifest üretimini paketsiz karşılıyor; offline destek v1 kapsamında olmadığından (bkz. PRD Bölüm 12, soru 4) karmaşık bir cache stratejisine gerek yok — service worker yalnızca Chrome/Android'in kurulabilirlik kriterini karşılamak için var, hiçbir isteği önbelleğe almaz. **11 Eylül 2026, 2. revizyon:** İkonlar ilk etapta `next/og`'un `ImageResponse`'ıyla programatik üretiliyordu; tasarımcı gerçek statik PNG seti sağlayınca (`public/icons/icon-{16..384}.png` + `icon-maskable-192.png`) bu dinamik üretim tamamen kaldırıldı, `layout.tsx`'teki `metadata.icons` alanı ve `manifest.ts`'in `icons[]` dizisi bu dosyalara işaret edecek şekilde güncellendi. **11 Eylül 2026, 3. revizyon:** Eksik kalan `icon-192.png` (maskable olmayan), `icon-512.png` ve `icon-maskable-512.png` tasarımcı tarafından tamamlandı; `manifest.ts`'in `icons[]` dizisi artık kanonik çifti kullanıyor — `icon-192.png`/`icon-512.png` (purpose: "any") ve `icon-maskable-192.png`/`icon-maskable-512.png` (purpose: "maskable"). Set artık eksiksiz. |

**Not:** Bu tercihler PRD'nin "Teknik Yaklaşım" bölümündeki web-first + AI-destekli geliştirme kararıyla uyumludur. Native geçiş (React Native/Expo) bu doküman kapsamında değildir; v3 fazında ayrı bir doküman olarak ele alınmalıdır.

**Mimari değişiklik notu (5 Eylül 2026 revizyonu):** Bu dokümanın ilk sürümü local-first (IndexedDB, `idb-keyval`) bir kalıcılık stratejisi tanımlıyordu. PM kararıyla kullanıcı hesabı + bulut senkronizasyonu v1'e alındı ve kalıcılık katmanı Supabase'e geçti. Bunun kod üzerindeki somut etkileri Bölüm 3, 6 ve 9'da işaretlenmiştir.

---

## 2. Proje Yapısı

```
wallt/
├── app/
│   ├── layout.tsx                # metadata.icons/apple public/icons/*'a, viewport/appleWebApp Faz 10'a işaret eder
│   ├── page.tsx                 # Genel Bakış + İstatistikler tab'ları burada state ile yönetilir
│   ├── globals.css              # Tailwind + font importları
│   ├── manifest.ts               # PWA manifest (Faz 10, MetadataRoute.Manifest) — icons[] public/icons/*'a işaret eder
│   └── login/
│       └── page.tsx              # email+şifre giriş/kayıt ekranı
├── proxy.ts                      # Next.js 16'da middleware.ts'in yeni adı; oturumu tazeler + route korur
├── public/
│   ├── icons/                     # statik PWA/favicon PNG'leri (tasarımcı tarafından sağlandı, 11 Eylül 2026)
│   │   ├── icon-16.png … icon-512.png   # 16/32/48/72/96/128/144/152/180/192/384/512
│   │   └── icon-maskable-192.png, icon-maskable-512.png
│   └── sw.js                     # minimal, cache'siz service worker (Faz 10 — bkz. Bölüm 1)
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx             # 3. ikon (Çıkış Yap) Faz 7'de eklendi
│   │   ├── BottomTabBar.tsx
│   │   ├── Sidebar.tsx            # masaüstü (≥lg) navigasyonu, ara responsive fazında eklendi
│   │   └── Fab.tsx
│   ├── auth/
│   │   └── AuthForm.tsx           # giriş/kayıt formu (prototipte karşılığı yok, Faz 7'de net-new)
│   ├── pwa/
│   │   ├── ServiceWorkerRegister.tsx  # public/sw.js'i client'ta register eder (Faz 10)
│   │   └── InstallHint.tsx        # "ana ekrana ekle" onboarding ipucu (Faz 10)
│   ├── sheets/
│   │   ├── BottomSheet.tsx       # ortak sheet wrapper (grabber, animasyon, overlay)
│   │   ├── AddExpenseSheet.tsx
│   │   ├── DateRangeSheet.tsx
│   │   └── ExportSheet.tsx        # Rapor Önizleme + İndir/Paylaş butonları
│   ├── pdf/
│   │   └── ReportDocument.tsx     # @react-pdf/renderer döküman tanımı (Faz 9)
│   ├── genel/                     # Genel Bakış'a özgü + Grafikler sekmesiyle paylaşılan grafik bileşenleri
│   │   ├── HeroTotal.tsx
│   │   ├── SavingsSummaryCard.tsx
│   │   ├── CategoryBarChart.tsx
│   │   ├── CategoryPieChart.tsx    # 11 Eylül'de silindi, 12 Eylül'de Grafikler için geri getirildi
│   │   └── CategoryRadarChart.tsx
│   ├── hareketler/
│   │   └── TransactionList.tsx    # eskiden genel/RecentTransactions.tsx, 11 Eylül 2026'da taşındı (bkz. 5.2)
│   ├── istatistikler/
│   │   ├── PeriodPicker.tsx
│   │   ├── PeriodStats.tsx
│   │   ├── CompareBarChart.tsx
│   │   └── CompareParetoChart.tsx
│   └── ui/
│       ├── Chip.tsx
│       ├── Button.tsx
│       └── Toast.tsx
├── lib/
│   ├── types.ts                 # Transaction, Category tipleri
│   ├── categories.ts             # DEFAULT_CATEGORIES, CUSTOM_PALETTE
│   ├── calculations.ts           # aggregate, paretoData, filterByRange (saf fonksiyonlar)
│   ├── format.ts                 # formatCurrency, formatDateTime, formatRangeLabel
│   ├── supabase/
│   │   ├── client.ts              # Client Component'ler için (tarayıcı) Supabase client
│   │   └── server.ts              # Server Component'ler için Supabase client
│   ├── storage.ts                # Supabase okuma/yazma katmanı (CRUD; RLS user_id filtresini otomatik uygular)
│   └── seed.ts                   # geliştirme ortamı için mock veri üretici
├── .env.local.example             # NEXT_PUBLIC_SUPABASE_URL / ANON_KEY şablonu
├── tailwind.config.ts
└── package.json
```

**Neden bu ayrım önemli:** `lib/calculations.ts` içindeki fonksiyonlar (aggregate, paretoData, filterByRange) **saf fonksiyonlardır** — girdi/çıktısı net, yan etkisi yok. Bu, hem AI'nin doğru kod üretmesini kolaylaştırır hem de bu fonksiyonlar için birim testi yazmak neredeyse bedavadır (bkz. Bölüm 7).

**Neden `lib/supabase/` iki dosyaya bölündü (Faz 7 uygulama notu):** Bu bölümün ilk sürümü tek bir `lib/supabaseClient.ts` planlıyordu. `@supabase/ssr` paketi, tarayıcıda (`createBrowserClient`) ve sunucuda (`createServerClient`, `next/headers`'ın `cookies()`'i üzerinden) farklı cookie mekanizmaları kullanır; ikisini tek dosyada birleştirmek oturumun Server Component'lerde görünmemesi gibi sessiz hatalara yol açar. Bu yüzden `client.ts`/`server.ts` ayrı tutuldu — bu, Bölüm 4'ün "yeniden yorumlama" kısıtının kapsamına girmeyen teknik bir zorunluluk.

---

## 3. Veri Modeli

```typescript
// lib/types.ts

export interface Category {
  id: string;
  name: string;
  color: string;       // hex, örn. "#FF7A6B"
  isCustom?: boolean;
}

export type TransactionType = "expense" | "saving";

export interface Transaction {
  id: string;
  type: TransactionType; // "expense" (varsayılan) | "saving"
  title: string;
  description: string;  // boş string olabilir, opsiyonel
  amount: number;        // TL, kuruş yok (tam sayı)
  categoryId: string;
  timestamp: string;      // ISO 8601 string, new Date().toISOString()
}

export interface DateRange {
  start: string;    // "YYYY-MM-DD"
  end: string;      // "YYYY-MM-DD"
  label: string;    // "Bu Ay", "Geçen Hafta", "Özel" vb.
}

export interface CategoryTotal extends Category {
  total: number;
  savingSegment?: number; // bkz. withSavingSegments() — 12 Eylül 2026 revizyonu
}

export interface ParetoEntry extends CategoryTotal {
  cumPct: number;
}

export interface RadarEntry {
  category: string;
  value: number;
  average: number;
}
```

**⚠️ Bilinen teknik risk — zaman dilimi:** Prototipte `timestamp.slice(0, 10)` ile tarih string'i çıkarılıyor (`txDateStr` fonksiyonu). Bu, kullanıcının tarayıcı saat dilimi UTC'den farklıysa gün sınırında ±1 günlük kaymalara yol açabilir. Gerçek üründe bu fonksiyonu **kullanıcının yerel saat dilimine göre** gün stringi üretecek şekilde yazın (`date-fns-tz` gibi bir kütüphane veya `Intl.DateTimeFormat` ile). Bu, PRD'nin açık sorular bölümünde işaretlenmemiş ama koda geçerken mutlaka çözülmesi gereken bir detaydır.

**Tasarruf (`type: "saving"`) ve radar chart — v1 kapsamına eklendi:** Prototipte var olan bu iki özellik, ilk PRD/Teknik Analiz taslağında v1 kapsamı dışında bırakılmıştı; PM onayıyla v1'e geri alındı (bkz. PRD Bölüm 5.1, 7 ve 7.2). Buna bağlı fonksiyonlar `lib/calculations.ts` içinde:
- `isExpense(t)` / `isSaving(t)` — bir işlemin türüne göre ayrıştırılması. `aggregate()`, `paretoData()` ve `radarData()`'ya verilecek dizi, çağıran taraf tarafından **önceden `isExpense` ile filtrelenmelidir** — bu fonksiyonların kendisi tür ayrımı yapmaz (prototipteki desenle birebir aynı).
- `radarData(agg: CategoryTotal[]): RadarEntry[]` — harcaması olan kategorilerin listesini, bu kategorilerin ortalama harcamasıyla birlikte döner. UI katmanı, dönen dizi 3'ten kısaysa (PRD 7 tablosundaki kural) radar grafiğini göstermemelidir.
- `withSavingSegments(sortedAgg: CategoryTotal[], savingsAgg: CategoryTotal[]): CategoryTotal[]` — **12 Eylül 2026 revizyonu:** artık sentetik bir "Tasarruf" satırı üretmez; `savingsAgg` (yani `aggregate(savings, categories)` — tasarruf işlemlerinin kategori bazında toplamı) içinde eşleşen bir kategori varsa, o kategorinin `sortedAgg` satırına `savingSegment` alanını iliştirir. `total` alanı hiç değişmez.
- Tasarruf rengi (`SAVING_COLOR = "#34D399"`), `lib/categories.ts` içinde tanımlanır ve `SavingsSummaryCard.tsx`/`TransactionList.tsx`'teki "Tasarruf" kimliğini (yeşil nokta/etiket) temsil eder. **12 Eylül 2026, 2. revizyon:** bar chart'taki tasarruf segmenti bu sabit rengi KULLANMIYOR — ilgili kategorinin kendi rengini kullanıyor (bkz. 5.3), böylece aynı barda hangi kategorinin tasarrufu olduğu renkle de görünür.

### 5.3 Tasarruf Segmenti — Stacked Bar + Shimmer (12 Eylül 2026 revizyonu)

Tasarruf artık ayrı bir bar değil, ilgili kategorinin barının ucuna eklenen bir stacked segment (bkz. PRD 7.2). `CategoryBarChart.tsx`'teki uygulama:

- İki `<Bar>`, aynı `stackId` ile: `dataKey="total"` (harcama, kategori rengiyle) ve `dataKey="savingSegment"` (tasarruf, özel stil). `layout="vertical"` olduğundan stack yatayda birikir — tasarruf segmenti otomatik olarak harcama barının sağ ucuna eklenir.
- Shimmer efekti: **12 Eylül 2026, 2. revizyon — tasarruf segmenti ilgili kategorinin kendi rengini kullanır** (sabit `SAVING_COLOR` değil), bu yüzden `<BarChart>` içine `data`'daki her kategori için ayrı bir `<linearGradient id="savingShimmer-{categoryId}">` render edilir (Recharts'ta gradient-fill grafiklerde standart bir teknik); üç `<stop>` (soluk → parlak → soluk, hepsi `entry.color`) ve gradient'in `x1`/`x2` özelliklerine uygulanan `<animate>` ile soldan sağa sürekli kayan bir "skeleton shimmer" hareketi elde edilir. SMIL tabanlı bu animasyon tarayıcı tarafından native/compositor seviyesinde çalıştığı için birden fazla kategori aynı anda shimmer gösterse bile performans etkisi ölçülemeyecek kadar düşüktür (test: 2-3 eşzamanlı segment, ~58 FPS).
- Tasarruf segmentinin `<Cell>`'i: `fill="url(#savingShimmer-{categoryId})"`, `stroke={entry.color}`, `strokeDasharray="5 4"` — harcama segmentinden (aynı kategori rengi, ama düz/opak dolgu) net ayrışır.
- Köşe yuvarlama (`radius`): harcama segmentinin sağ kenarı, ancak o kategoride tasarruf segmenti YOKSA yuvarlanır (`[0,8,8,0]`); varsa köşeli kalır (`[0,0,0,0]`) ve dış uç yuvarlaması tasarruf segmentine geçer. Recharts'ın `Cell` tipi `radius` için diziyi kabul etmiyor (yalnızca `string|number`) ama alttaki `Rectangle` shape'i (Bar'ın kendisinin kullandığı) diziyi kabul ediyor — bu yüzden `@ts-expect-error` ile işaretlenmiş bilinçli bir tip uyuşmazlığı var.
- Tasarruf segmentinin `<Bar>`'ına `onClick` **atanmaz** — sadece harcama segmentinin `<Bar>`'ı tıklanabilir (bkz. Faz sonrası "bara dokununca AddExpenseSheet aç" özelliği). Bir kategoride hiç harcama olmasa bile (`total: 0`) `aggregate()` o kategoriyi haritada tuttuğu için segment yine doğru barın üzerinde render olur.

---

## 4. Tasarım Sistemi (Design Tokens)

**⚠️ 11 Eylül 2026 düzeltmesi:** Bu bölümün önceki hali `docs/WALLT_Prototype.jsx`'in gerçek renkleriyle **uyuşmuyordu** — prototip koyu (dark) temalıdır, önceki taslak açık/krem bir tema tanımlamıştı. Aşağıdaki değerler `docs/WALLT_Prototype.jsx` üzerinde satır satır çıkarılan gerçek hex/rgba değerleridir (bkz. PM onayı, 11 Eylül 2026). Tailwind config'e bu şekilde işlenmeli, yeniden yorumlanmamalı.

```typescript
// app/globals.css — @theme (Tailwind v4, CSS-first config)

colors: {
  ink: "#F1EEFA",        // ana metin
  muted: "#A79FC7",      // ikincil metin
  page: "#1B1533",       // en dış gradient'in başlangıcı (bkz. aşağıdaki gradient notu)
  shell: "#0F0B22",       // en dıştaki kabuk (.wallt-shell) ve Toast arka planı
  card: "#241E42",
  surface2: "#2C2550",   // input/ikincil yüzey (örn. .wallt-input arka planı)
  border: "#342C58",     // satır/sheet ayraçları
  borderDashed: "#4A4074", // chip-add kesikli kenarlık, sheet grabber arka planı
  borderTooltip: "#3A3164", // tooltip kenarlığı
  gridStroke: "#372E5C", // grafik grid çizgisi
  periodA: "#FFA45C",
  periodB: "#5AC8FA",
  saving: "#34D399",
  tabA: "#9B7BE0",
  tabB: "#4F9DFF",
  tabC: "#34D399",
  tabD: "#FFC15E", // 12 Eylül 2026 — Grafikler sekmesi eklenince eklendi, prototipte karşılığı yok (prototip 3 sekmeliydi)
  brandStart: "#7B5FE0",
  brandEnd: "#4F7FE0",
  category: {
    yemek: "#FF6F91",
    ulasim: "#4F9DFF",
    eglence: "#A374E8",
    market: "#4FD1A0",
    fatura: "#FFC15E",
    saglik: "#E0568C",
    diger: "#8B93B8",
  },
},
fontFamily: {
  display: ["'Baloo 2'", "sans-serif"],   // sadece büyük sayılar ve başlıklarda
  sans: ["'Inter'", "sans-serif"],         // arayüzün geneli
},
borderRadius: {
  card: "20px",
  sheet: "28px",
  pill: "100px",
},
```

**Arka plan gradient'i:** Sayfa arka planı düz bir renk değil, gradient'tir:
```css
background: linear-gradient(165deg, #1B1533 0%, #1A1B3D 55%, #17203F 100%);
```
`.wallt-shell` (en dış kapsayıcı) ise düz `#0F0B22` kullanır — bu aynı zamanda Toast bileşeninin arka planıdır.

**Marka gradient'i (buton/FAB/aktif sekme):**
```css
background: linear-gradient(135deg, #7B5FE0 0%, #4F7FE0 100%);
```
Bu, önceki taslakta yanlışlıkla `category.yemek` rengiyle karıştırılan **birincil eylem** rengidir (FAB, "Ekle" butonu, form aktif sekmesi, radar grafiği stroke/fill — `#7B5FE0` tek başına).

**Tasarruf gradient'i:**
```css
background: linear-gradient(135deg, #34D399, #22B8B0);
```

**Kullanım kuralı (AI'ye özellikle belirtilmeli):** `font-display` (Baloo 2) **sadece** hero tutar, sheet başlıkları ve büyük istatistik sayıları için kullanılır. Buton, label, chip, body metni her zaman `font-sans` (Inter). Bu ayrım karıştırılırsa tasarım "çizgi film" hissine geri döner (bkz. önceki iterasyon geri bildirimi) — bu kısıtı AI'ye açıkça hatırlatın.

**Gölge/derinlik stili:** Sert/offset gölge YOK. Her zaman yumuşak, bulanık; koyu temada gölgeler siyah (`rgba(0,0,0,…)`) veya marka rengi glow'u olarak kullanılır:
```css
--shadow-card: 0 6px 20px rgba(0,0,0,.28);
--shadow-float: 0 10px 26px rgba(79,95,224,.35);      /* hero kart glow'u */
--shadow-btn-primary: 0 6px 16px rgba(79,127,224,.40); /* marka gradient butonları */
--shadow-btn-saving: 0 6px 16px rgba(52,211,153,.35);  /* tasarruf butonu glow'u */
--shadow-fab: 0 4px 10px rgba(79,95,224,.4);
--shadow-icon-btn: 0 4px 12px rgba(0,0,0,.35);
--shadow-toast: 0 8px 22px rgba(0,0,0,.45);
--shadow-tabbar: 0 -6px 20px rgba(0,0,0,.35);          /* tab bar, yukarı doğru */
```
Ek tek-kullanımlık gölgeler (bileşen bazında, ayrı token gerekmez): stat kart `0 6px 16px rgba(0,0,0,.28)`, dönem kartı `0 6px 18px rgba(0,0,0,.28)`, hero filtre butonu `0 6px 16px rgba(0,0,0,.35)`, sheet kapatma butonu `0 4px 10px rgba(0,0,0,.35)`. Sheet overlay arka planı: `rgba(6,4,18,.65)`. Grafik hover/cursor dolgusu: `rgba(255,255,255,0.05)`. Tooltip: arka plan `#241E42` (=card), kenarlık `1px solid #3A3164`, gölge `0 10px 28px rgba(0,0,0,.45)`.

**İstatistikler bilgi şeridi (info banner):** arka plan `#1E2A52`, ikon rengi `#6FB8FA`.

**Input odak (focus) durumu:** kenarlık rengi `#7B5FE0`, arka plan `#332B5E`.

**Bilinmeyen kategori fallback rengi:** `#888`.

**Kategori rengi ekleme mantığı:** Yeni custom kategori eklendiğinde renk şu diziden sırayla atanır (prototipteki `CUSTOM_PALETTE` ile birebir aynı, değişmedi):
```
["#E88D4F", "#39B7A3", "#E2678A", "#7C8CE0", "#5FB88A", "#E0A23D"]
```

**Breakpoint'ler (Responsive — 11 Eylül 2026 revizyonu):** Özel bir breakpoint tanımlanmaz, Tailwind'in varsayılan kırılım noktaları kullanılır. Mobil-first ilkesiyle tutarlı olarak base (prefix'siz) stiller mobil içindir, üst kırılım noktaları katmanlı olarak eklenir.

| Tailwind prefix | Min genişlik | Bu noktada ne değişir |
|---|---|---|
| (yok, base) | 0px | Mobil düzen: alt tab bar + FAB + bottom sheet, tam genişlik/uçtan uca kartlar (PRD 6.1) |
| `sm` | 640px | Yapısal değişiklik yok — yalnızca iç boşluk/tipografi ince ayarı |
| `md` | 768px | İçerik sütunu ortalanır, kenar boşlukları artar; navigasyon hâlâ mobil kalıbında (PRD 6.2) |
| `lg` | 1024px | **Yapısal kırılım noktası**: alt tab bar + FAB → sol sidebar; bottom sheet → ortalanmış modal diyalog (PRD 6.3) |
| `xl` | 1280px | Genel Bakış'taki grafik kartları (opsiyonel) iki sütunlu ızgaraya geçebilir |
| `2xl` | 1536px | Ek değişiklik yok — içerik sütunu `xl`'de sabitlenen maksimum genişlikte kalmaya devam eder |

`lg`, dokunmatik mobil/tablet deneyimiyle masaüstü sidebar deneyimi arasındaki **yapısal** sınırdır — bu noktada ilgili bileşenler yalnızca CSS değil, farklı bir DOM yapısı render eder (bkz. Bölüm 5'teki bileşen bazlı etki notları).

---

## 5. Bileşen Haritası (Prototip → Gerçek Bileşen)

| Prototip Bölümü | Gerçek Bileşen | Not |
|---|---|---|
| Hero tutar + filtre ikonu | `HeroTotal.tsx` | `onFilterClick` prop'u ile `DateRangeSheet`'i açar |
| Bar chart (kategori bazlı) | `CategoryBarChart.tsx` | `aggregate()` çıktısını alır (yalnızca `isExpense` işlemlerden), Recharts `BarChart` sarmalar; `withSavingSegments()` ile her kategorinin tasarruf tutarı, o kategorinin barına stacked bir `savingSegment` olarak eklenir (12 Eylül 2026 revizyonu — artık ayrı bir bar değil, bkz. PRD 7.2 ve Bölüm 5.3) |
| Kategori Ağırlık Haritası (radar) | `CategoryRadarChart.tsx` | `radarData()` çıktısını alır; dizi 3'ten kısaysa grafik yerine bir bilgi metni gösterir (PRD 7 tablosundaki kural). 12 Eylül 2026'dan itibaren Genel Bakış'ta VE Grafikler'de, birbirinden bağımsız iki ayrı örnek olarak render ediliyor (bkz. 5.4) |
| Pie chart (kategori dağılımı) | `CategoryPieChart.tsx` | Yalnızca Grafikler sekmesinde (12 Eylül 2026, bkz. 5.4) — 11 Eylül 2026'da Genel Bakış'tan kaldırılmıştı, dosya değişmeden geri getirildi |
| Tasarruf özet kartı | `SavingsSummaryCard.tsx` | Seçili dönemde toplam tasarruf > 0 ise gösterilir; `isSaving` ile filtrelenen işlemlerin toplamını alır |
| Son Hareketler listesi | `components/hareketler/TransactionList.tsx` (öneri — bkz. 5.2) | **11 Eylül 2026 revizyonu:** eskiden Genel Bakış içinde `RecentTransactions.tsx` olarak gömülüydü (`slice(0,40)`, `max-h-80 overflow-y-auto`); artık ayrı "Son Hareketler" sekmesinin tek içeriği — `slice`/`max-h` kaldırılır, seçili zaman aralığındaki tüm işlemler gösterilir. Satır render mantığı (nokta, başlık, tutar, "Tasarruf" etiketi/"+" işareti) değişmez |
| Harcama Ekle sheet'i | `AddExpenseSheet.tsx` | `BottomSheet` wrapper'ını kullanır; üstte Harcama/Tasarruf giriş tipi seçici olur, `onSubmit(transaction)` callback'i ile üst state'e yazar |
| Zaman Aralığı sheet'i | `DateRangeSheet.tsx` | `BottomSheet` wrapper'ını kullanır |
| Dönem A/B kartları | `PeriodPicker.tsx` | `which: "A" \| "B"` prop'u ile iki kez render edilir |
| Alt tab bar + FAB | `BottomTabBar.tsx` + `Fab.tsx` | FAB, tab bar'ın ortasındaki slot içinde `position:absolute` ile yükseltilir; `lg`'den itibaren `Sidebar.tsx` lehine gizlenir (bkz. 5.1). **11 Eylül 2026 revizyonu:** üçüncü sekme ("Son Hareketler") eklenince tab bar iki eşit olmayan yarıma bölünür (prototipteki `wallt-tabbar-half` deseni) — sol yarım Genel Bakış + Son Hareketler'i paylaşır, sağ yarım tek başına İstatistikler'i taşır; FAB'ın kendisi ve konumu değişmez (bkz. PRD 6.1) |
| Export sheet'i / Rapor Önizleme | `ExportSheet.tsx` | `BottomSheet` wrapper'ını kullanır; kategori kırılımı + toplamı gösterir (Genel Bakış'ta o an seçili tarih aralığı için), İndir/Paylaş butonları `ReportDocument.tsx`'ten üretilen PDF'i tetikler (11 Eylül 2026 revizyonu, bkz. Bölüm 9) |
| — (prototipte karşılığı yok) | `pdf/ReportDocument.tsx` | `@react-pdf/renderer` döküman tanımı; sadece kendi `StyleSheet.create()`'ini kullanır, Tailwind sınıfı kabul etmez (BarChart/PieChart bileşenlerinin `lib/chartTheme.ts` ile aynı deseni) |

**12 Eylül 2026 revizyonu:** İstatistikler'deki "İç İçe Halkalar" (`ComparePieChart.tsx`) görselleştirmesi tamamen kaldırıldı — gruplu bar (`CompareBarChart.tsx`) ve çift pareto çizgisi (`CompareParetoChart.tsx`) dönem karşılaştırmasını zaten kapsıyordu, yerine yeni bir şey eklenmedi. `page.tsx`'teki `comparePieA`/`comparePieB` (aggA/aggB'den türetilen basit filtreler, `lib/calculations.ts`'te ayrı bir fonksiyonları yoktu) bu bileşenle birlikte kaldırıldı.

**Önemli mimari kural:** `page.tsx` tek "akıllı" (state tutan) bileşen olmalı; `components/` altındaki her şey mümkün olduğunca "aptal" (sadece prop alan, kendi state'i olmayan) bileşen olmalı. Bu, prototipte tek dosyada yönetilen state'in gerçek projede dağılıp kaybolmasını önler ve AI'nin hangi bileşenin neyi bildiğini takip etmesini kolaylaştırır.

### 5.1 Responsive Bileşen Etkisi (11 Eylül 2026 revizyonu)

Faz 0-4/7/8'de yazılan bileşenlerin Bölüm 4'teki breakpoint'ler geldiğinde nasıl etkileneceği:

**Büyük ölçüde değişecek / net-yeni bileşen gerekecek:**
- `BottomTabBar.tsx` + `Fab.tsx` — kendileri değişmez, ama `lg`'den itibaren `lg:hidden` ile tamamen gizlenirler; yerlerini yeni yazılacak `Sidebar.tsx` alır
- `BottomSheet.tsx` — **aynı bileşen iki farklı DOM/CSS varyantı render etmeli**: `lg` altında mevcut alttan-kayan-panel (grabber, `rounded-t-sheet`, `sheet-up` animasyonu), `lg` ve üzerinde ortalanmış modal (grabber yok, tüm köşeler `rounded-card`, fade/scale animasyonu). Bu, mevcut Faz 2 implementasyonunun en çok dokunulacak parçası.
- `page.tsx` (sayfa iskeleti) — `lg`'de sidebar + içerik sütunu ikili düzenine geçmeli; `xl`'de grafik kartları için opsiyonel 2 sütunlu grid

**Sadece stil/boşluk ayarı yeterli (yapısal değişiklik yok):**
- `TopBar.tsx` — içerik aynı kalır, sadece `page.tsx`'teki konumu (artık sidebar'ın yanında) değişir; bileşenin kendisi muhtemelen hiç değişmeyecek
- `HeroTotal.tsx`, `SavingsSummaryCard.tsx` — `md`/`lg`'de büyüyen tipografi/boşluk (`md:`/`lg:` utility sınıfları), yapısal değişiklik yok
- `CategoryBarChart.tsx`, `CategoryRadarChart.tsx` — Recharts `ResponsiveContainer` zaten akışkan; en fazla `page.tsx`'teki grid/height değerleri `xl`'de değişir, grafik bileşenlerinin kendi kodu değişmez (`CategoryPieChart.tsx`/`ParetoChart.tsx` bu maddede sayılıyordu, 11 Eylül 2026'da Genel Bakış'tan kaldırılıp silindi — bkz. Bölüm 6, Faz sonrası commit notları)
- `RecentTransactions.tsx` — bu bölüm yazıldığında değişiklik gerekmiyordu; 11 Eylül 2026'da ayrı bir sekmeye taşındı, bkz. 5.2
- `AddExpenseSheet.tsx`, `AuthForm.tsx` — form içerikleri zaten ortalanmış/dar genişlikte; `BottomSheet`'in modal varyantı içinde de olduğu gibi çalışır, form bileşenlerinin kendisi değişmez

**Yeni yazılacak:**
- `components/layout/Sidebar.tsx` — `lg` ve üzerinde `BottomTabBar`+`Fab`'ın yerini alan sol sabit menü (logo, nav öğeleri, "+ Harcama Ekle" butonu)

### 5.2 Son Hareketler Sekmesi (11 Eylül 2026 revizyonu)

"Son Hareketler", Genel Bakış içindeki bir bölümden ayrı ve sabit bir üçüncü sekmeye çıkarılıyor (bkz. PRD 6.1.1). Bunun kod üzerindeki somut etkileri:

- **`components/hareketler/TransactionList.tsx` (öneri, net-yeni dosya):** `RecentTransactions.tsx`'in taşınmış hali. `transactions`/`categories` prop'larını aynı şekilde alır, ama `slice(0, 40)` ve dış `max-h-80 overflow-y-auto` sarmalayıcısı kaldırılır — artık kendi sekmesinin tüm yüksekliğini kullanır. Satır render mantığı (nokta, başlık, tutar, "Tasarruf" etiketi/"+" işareti, kategori+tarih+açıklama) birebir aynı kalır. `RecentTransactions.tsx` dosyası silinir (Genel Bakış'ta artık kullanılmıyor).
- **`app/page.tsx`:**
  - `TabKey` tipi `"genel" | "hareketler" | "istatistikler"` olur (bkz. `BottomTabBar.tsx`) — **12 Eylül 2026'da `"grafikler"` eklenerek 4 değerli oldu, bkz. 5.4**
  - Genel Bakış JSX bloğundan "Son Hareketler" `<section>`'ı kaldırılır
  - Yeni bir `activeTab === "hareketler"` JSX bloğu eklenir: `HeroTotal`/`SavingsSummaryCard` olmadan, doğrudan `<TransactionList transactions={transactions} categories={categories} />` — zaman aralığı filtresi (`rangeStart`/`rangeEnd`, `filterByRange()`) Genel Bakış'la aynı state'i paylaştığı için ekstra bir filtre state'i gerekmez
- **`components/layout/BottomTabBar.tsx`:**
  - `TabKey` üç değerli olur; layout iki `wallt-tabbar-half` benzeri flex kapsayıcıya bölünür (sol: Genel Bakış + Son Hareketler, sağ: İstatistikler), FAB ortadaki mutlak konumlu slotunda değişmeden kalır (bkz. Bölüm 1 PWA/tab renkleri notundaki `tabC` tokeni, şimdiye kadar kullanılmamıştı — Son Hareketler'in aktif rengi olur). **12 Eylül 2026'da bu layout 2+2'ye ve ikon-only'e güncellendi, bkz. 5.4.**
- **`components/layout/Sidebar.tsx`:** üçüncü bir `NavItem` eklenir (Genel Bakış / Son Hareketler / İstatistikler) — prototipte sidebar karşılığı olmadığından bu tamamen WALLT'a özgü, mevcut basit dikey liste deseninin doğal genişlemesi
- **Sayfalama/sonsuz kaydırma yok** (bkz. PRD 6.1.1) — `lib/storage.ts`'teki `fetchTransactions()` zaten tüm veriyi tek seferde çekiyor, ek bir sorgu/state gerekmiyor

### 5.4 Grafikler Sekmesi (12 Eylül 2026)

Prototipin kendi "Grafikler" sekmesi v1'e eklendi — dördüncü sekme (bkz. PRD 6.1.2). Kod üzerindeki somut etkileri:

- **`components/genel/CategoryPieChart.tsx` (geri getirildi):** 11 Eylül 2026'da Genel Bakış'tan kaldırılırken silinmişti (bkz. Bölüm 6 sonrası commit notları); dosya değişmeden (git geçmişinden) geri getirildi, artık Grafikler sekmesinde kullanılıyor.
- **`components/genel/CategoryRadarChart.tsx`:** değişmeden aynen yeniden kullanıldı — Genel Bakış'takiyle aynı bileşen, ama Grafikler'de kendi bağımsız veri/tarih aralığıyla ayrı bir örnek olarak render ediliyor.
- **`app/page.tsx`:**
  - `TabKey` dördüncü değeri: `"genel" | "hareketler" | "grafikler" | "istatistikler"`
  - Genel Bakış'ın `rangeStart`/`rangeEnd`'inden tamamen bağımsız yeni state: `grafiklerRangeStart`/`grafiklerRangeEnd` (+ kendi `grafiklerRangeSheetOpen` ve kendi `DateRangeSheet` örneği) — mimari kuralla tutarlı olması için bu state de `page.tsx`'te tutuluyor, yeni bir component'e taşınmıyor
  - `grafiklerFiltered`/`grafiklerExpenses`/`grafiklerSavings`/`grafiklerAgg`/`grafiklerAggSorted`/`grafiklerSavingsAgg`/`grafiklerBarData`/`grafiklerPieData`/`grafiklerRadar` — Genel Bakış'ın `agg`/`aggSorted`/`barData`/`pieData`/`radar` zincirinin birebir aynısı, sadece `grafiklerRangeStart`/`grafiklerRangeEnd`'e bağlı
  - Yeni `activeTab === "grafikler"` JSX bloğu: kendi zaman aralığı özeti + filtre butonu, `CategoryBarChart` (aynı `onBarClick` davranışıyla), `CategoryPieChart`, `CategoryRadarChart`
- **`components/layout/BottomTabBar.tsx`:** layout artık 2+2 (sol: Genel Bakış + Son Hareketler, sağ: Grafikler + İstatistikler), FAB değişmeden ortada. **İkon-only** oldu — `TabButton` artık etiket render etmiyor, `aria-label` ile erişilebilirlik korunuyor (bkz. PRD 6.1'deki karar gerekçesi). Yeni `tabD` tokeni (`#FFC15E`) Grafikler'in aktif rengi.
- **`components/layout/Sidebar.tsx`:** dördüncü `NavItem` ("Grafikler", `PieChart` ikonu) eklendi — masaüstünde etiketler değişmeden kalıyor, ikon-only kısıtı yalnızca mobil `BottomTabBar`'a özgü.
- **`app/globals.css`:** `--color-tabD: #ffc15e;` eklendi (bkz. Bölüm 4).

---

## 6. Build Sırası (Fazlar)

Her faz, tek başına çalışır bir uygulama üretmeli — yani Faz 2 bitince uygulama açılıp gezinilebilir olmalı, sadece eksik özellikler olur. Bu, vibe coding'de her adımdan sonra "çalışıyor mu" diye test edebilmek için kritik.

1. **Faz 0 — Kurulum:** Next.js + TypeScript + Tailwind projesi oluştur, `tailwind.config.ts`'e Bölüm 4'teki tokenları işle, Google Fonts importlarını `globals.css`'e ekle.
2. **Faz 1 — Veri katmanı:** `lib/types.ts`, `lib/categories.ts`, `lib/calculations.ts`, `lib/format.ts` dosyalarını prototipteki mantığı birebir taşıyarak yaz (fonksiyon isimleri ve imzaları aynı kalsın). Bu fazda UI yok, sadece fonksiyonlar + üniteler.
3. **Faz 2 — İskelet:** `TopBar`, `BottomTabBar`, `Fab`, `BottomSheet` (boş içerikli) bileşenlerini kur. Tab geçişleri çalışsın, sheet açılıp kapansın.
4. **Faz 3 — Genel Bakış (statik):** Mock veriyle (`lib/seed.ts`) `HeroTotal`, üç grafik, `RecentTransactions`'ı bağla. Henüz ekleme yok, sadece görüntüleme.
5. **Faz 4 — Harcama Ekle akışı:** `AddExpenseSheet` + form validasyonu + state'e yeni transaction ekleme. Bu noktada grafiklerin canlı güncellendiği doğrulanmalı.
6. **Faz 5 — Zaman Aralığı filtresi:** `DateRangeSheet` + `filterByRange` entegrasyonu.
7. **Faz 6 — İstatistikler sekmesi:** `PeriodPicker` ×2, üç karşılaştırma grafiği, fark yüzdesi hesaplaması.
8. **Faz 7 — Kimlik Doğrulama (YENİ, 5 Eylül 2026 revizyonu):** Supabase projesi kurulumu, `@supabase/supabase-js` + `@supabase/ssr` entegrasyonu, `lib/supabaseClient.ts`; giriş/kayıt ekranları (email+şifre); session yönetimi ve route/erişim koruması — oturum yoksa uygulamanın geri kalanı gösterilmez. Bu fazın sonunda uygulama hâlâ `lib/seed.ts` mock verisiyle çalışabilir; gerçek veri bağlanması Faz 8'de.
9. **Faz 8 — Kalıcılık (Supabase):** `lib/storage.ts` ile Supabase Postgres entegrasyonu (eskiden IndexedDB planlanıyordu, bkz. Bölüm 1 revizyon notu); `transactions`/`categories` tabloları + RLS politikaları; mock seed verisinin yerini giriş yapan kullanıcının gerçek verisi alır. Sayfa yenilenince veri kaybolmamalı.
10. **Faz 9 — Export (11 Eylül 2026 revizyonu — gerçek PDF kararı):** `ExportSheet` içeriği (Rapor Önizleme — kategori kırılımı + toplam, Genel Bakış'ta o an seçili tarih aralığı için); `@react-pdf/renderer` ile `components/pdf/ReportDocument.tsx` PDF döküman tanımı (Inter fontu gerçek `.ttf` dosyasından `Font.register()` ile yüklenir — react-pdf tarayıcının CSS/font motorunu kullanmaz); **İndir** butonu (PDF blob'u üretip tarayıcı indirmesini tetikler) ve **Paylaş** butonu (Web Share API ile dosya paylaşımı destekleniyorsa native share sheet açar, desteklenmiyorsa İndir'e düşer).
11. **Faz 10 — PWA + cila:** `app/manifest.ts` (icons[] `public/icons/*` statik PNG'lerine işaret eder), `layout.tsx`'te `metadata.icons`/`viewport`/`appleWebApp` metadata'sı, minimal cache'siz `public/sw.js` (kurulabilirlik kriteri için), ve Android/Chrome'da `beforeinstallprompt` ile iOS Safari'de manuel Paylaş → Ana Ekrana Ekle talimatını ayıran `InstallHint.tsx` onboarding ipucu. **11 Eylül 2026, 2. revizyon:** İkonlar başlangıçta `next/og`/`ImageResponse` ile programatik üretiliyordu; tasarımcının sağladığı gerçek statik PNG setiyle değiştirildi (bkz. Bölüm 1).

**Faz 7'nin neden burada olduğu:** Auth'u daha erken (ör. Faz 0/1) sokmak, Faz 3-6'nın tamamını (seed veriyle çalışan UI) gereksiz yere kimlik doğrulama akışının arkasına kilitlerdi ve o fazlarda zaten yazılmış/commit'lenmiş hiçbir kod bundan fayda görmezdi. Auth'u Kalıcılık'tan (Faz 8) hemen önce koymak mantıklı çünkü ikisi sıkı bağımlı: Supabase RLS politikaları `auth.uid()`'a göre çalışır, yani gerçek veri bağlamadan önce bir oturumun var olması gerekir. Faz 3-6 aralığında hâlâ seed veriyle çalışılmaya devam edilir, bu yüzden bu sıralama mevcut ilerlemeyi bozmaz.

---

## 7. Test Stratejisi (Minimal ama Etkili)

Vibe coding'de kapsamlı test paketi kurmak yerine, **en yüksek risk taşıyan saf fonksiyonlara odaklanın**:

- `aggregate()`, `paretoData()`, `filterByRange()` için Vitest ile birim testi yazın — bunlar sayısal doğruluğun temeli, hata burada olursa tüm grafikler yanlış olur.
- `filterByRange` için özellikle **zaman dilimi sınır testleri** yazın (ör. gece yarısına yakın bir işlem doğru güne mi düşüyor).
- UI bileşenleri için test şart değil; gözle doğrulama (prototiple karşılaştırma) yeterli.

AI'ye şu şekilde yönlendirme verebilirsiniz: *"lib/calculations.ts içindeki her fonksiyon için Vitest ile birim testi yaz, özellikle tarih sınır durumlarını kapsa."*

---

## 8. Vibe Coding İçin Pratik Notlar

- **Bu dokümanı ve onaylanmış prototip dosyasını (WALLT_Prototype.jsx) her yeni Claude Code oturumunda context olarak verin** — böylece AI, üzerinde çalıştığı tasarım kararlarını yeniden icat etmeye çalışmaz.
- **Her faz sonunda commit atın.** Bir faz "çalışıyor" durumuna geldiğinde AI'ye "şimdi commit at" deyin; bir sonraki faz bir şeyi bozarsa geri dönüş noktanız olur.
- **AI'den büyük sıçramalar istemeyin.** "Tüm uygulamayı yaz" yerine "Faz 3'ü yaz" deyin — hata ayıklama çok daha kolay olur.
- **Tasarım tutarlılığı için Bölüm 4'ü referans gösterin.** AI'nin kendi renk/font kararı vermesine izin vermeyin; bu, önceki iterasyonlarda yaşanan "çizgi film" sapmasının temel nedeniydi.
- **`lib/calculations.ts` dosyasını değiştirmeden önce testleri çalıştırmasını isteyin** — bu dosya bozulursa tüm grafikler sessizce yanlış veri gösterebilir.

---

## 9. Açık Teknik Kararlar

| Konu | Durum | Öneri |
|---|---|---|
| Kalıcılık: local mı, cloud mu? | ✅ Çözüldü (5 Eylül 2026 revizyonu) | v1 için Supabase (Postgres + Auth) — cloud-first. Kullanıcı hesabı zorunlu, RLS ile kullanıcı bazlı veri izolasyonu. Eski öneri (IndexedDB/local-first) terk edildi. |
| Routing: tab'lar ayrı route mu? | Karar verilmedi | v1'de `page.tsx` içinde client state ile tab geçişi (daha basit); route'lara bölme ihtiyacı sadece deep-linking gerekirse |
| PDF export kütüphanesi | ✅ Çözüldü (11 Eylül 2026 revizyonu) | `@react-pdf/renderer` — gerçek, indirilebilir/paylaşılabilir bir `.pdf` dosyası üretir. `window.print()` seçeneği terk edildi: yazdırma önizlemesi native share sheet ile dosya olarak paylaşılamaz, PRD 5.3'ün "Paylaş butonu" gereksinimini karşılamaz. |
| TypeScript zorunlu mu? | Öneri | Şiddetle önerilir ama vibe coding akışını yavaşlatıyorsa `.jsx` ile devam edip tipleri sonradan eklemek de geçerli bir yol |
