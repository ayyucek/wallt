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
│   ├── login/
│   │   └── page.tsx              # email+şifre giriş/kayıt ekranı
│   └── reset-password/
│       └── page.tsx              # şifre sıfırlama linkiyle ulaşılan yeni şifre belirleme ekranı (13 Eylül 2026)
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
│   │   ├── AuthForm.tsx           # giriş/kayıt formu (prototipte karşılığı yok, Faz 7'de net-new); 13 Eylül 2026'da 3. bir "forgot" modu eklendi
│   │   └── ResetPasswordForm.tsx  # /reset-password'ün tek içeriği (13 Eylül 2026, net-new)
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
  amount: number;        // TL, iki ondalık basamağa kadar (kuruş) desteklenir — 13 Eylül 2026 revizyonu
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

**13 Eylül 2026 revizyonu — kuruş desteği:** v1'in ilk kararı (`amount`'ın tam sayı, kuruşsuz olması) gözden geçirildi. Supabase'deki `transactions.amount` kolonu `integer`'dan `numeric(10,2)`'ye taşındı (`supabase/migrations/20260913_amount_decimal.sql` — mevcut tam sayı kayıtlar kayıpsız genişler, örn. `100` → `100.00`; `check (amount > 0)` kısıtı aynen korunur). Postgres'te para birimi için `numeric`/`decimal` kullanılır, `float`/`real` **asla** kullanılmaz (ikili kayan nokta ondalık parayı kesin temsil edemez).

Uygulama katmanında ayrı bir "kuruş-integer" birimine (örn. `4312`) geçilmedi — bu, `aggregate`/`paretoData`/`radarData`/`withSavingSegments` gibi tüm hesaplama fonksiyonlarının birim dönüşümü bilmesini gerektirirdi. Bunun yerine tek koruma noktası **gösterim anı**: `lib/format.ts`'teki `formatCurrency`, `Math.round(amount * 100) / 100` ile 2 ondalık basamağa yuvarlar — kişisel ölçekli bir uygulamada (yüzlerce/binlerce işlem) toplama sırasında birikebilecek floating-point gürültüsü (~1e-10 mertebesi) bu yuvarlamayla tamamen yutulur, hesaplama fonksiyonlarının kendisi değişmeden doğru çalışmaya devam eder. `formatCurrency` ayrıca ondalık ayracı olarak **nokta** kullanır (`toFixed(2)`, binlik ayraç yok) — `tr-TR` locale'inin virgül-ondalık kuralıyla çelişmemesi için kasıtlı bir sapma.

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
| Kategori Ağırlık Haritası (radar) | `CategoryRadarChart.tsx` | `radarData()` çıktısını alır; dizi 3'ten kısaysa grafik yerine bir bilgi metni gösterir (PRD 7 tablosundaki kural). **12 Eylül 2026, 2. revizyon:** ilk Grafikler eklendiğinde kısa süreliğine hem Genel Bakış'ta hem Grafikler'de tutulmuştu; iki ekranda aynı grafiğin senkronize olmayan tarih aralıklarıyla görünmesi kafa karıştırıcı bulunduğundan Genel Bakış'tan kaldırıldı — artık yalnızca Grafikler'de (bkz. 5.4) |
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
  - Yeni bir `activeTab === "hareketler"` JSX bloğu eklenir: `HeroTotal`/`SavingsSummaryCard` olmadan, doğrudan `<TransactionList transactions={transactions} categories={categories} />`. **12 Eylül 2026, 2. revizyon:** bu ilk halde başlıkta Genel Bakış'ın `rangeStart`/`rangeEnd` etiketi gösteriliyordu ama listeye hiç uygulanmıyordu (`transactions` filtresiz geçiliyordu) — bkz. 5.6, kendi bağımsız filtresiyle düzeltildi.
- **`components/layout/BottomTabBar.tsx`:**
  - `TabKey` üç değerli olur; layout iki `wallt-tabbar-half` benzeri flex kapsayıcıya bölünür (sol: Genel Bakış + Son Hareketler, sağ: İstatistikler), FAB ortadaki mutlak konumlu slotunda değişmeden kalır (bkz. Bölüm 1 PWA/tab renkleri notundaki `tabC` tokeni, şimdiye kadar kullanılmamıştı — Son Hareketler'in aktif rengi olur). **12 Eylül 2026'da bu layout 2+2'ye ve ikon-only'e güncellendi, bkz. 5.4.**
- **`components/layout/Sidebar.tsx`:** üçüncü bir `NavItem` eklenir (Genel Bakış / Son Hareketler / İstatistikler) — prototipte sidebar karşılığı olmadığından bu tamamen WALLT'a özgü, mevcut basit dikey liste deseninin doğal genişlemesi
- **Sayfalama/sonsuz kaydırma yok** (bkz. PRD 6.1.1) — `lib/storage.ts`'teki `fetchTransactions()` zaten tüm veriyi tek seferde çekiyor, ek bir sorgu/state gerekmiyor

### 5.4 Grafikler Sekmesi (12 Eylül 2026)

Prototipin kendi "Grafikler" sekmesi v1'e eklendi — dördüncü sekme (bkz. PRD 6.1.2). Kod üzerindeki somut etkileri:

- **`components/genel/CategoryPieChart.tsx` (geri getirildi):** 11 Eylül 2026'da Genel Bakış'tan kaldırılırken silinmişti (bkz. Bölüm 6 sonrası commit notları); dosya değişmeden (git geçmişinden) geri getirildi, artık Grafikler sekmesinde kullanılıyor.
- **`components/genel/CategoryRadarChart.tsx`:** değişmeden yeniden kullanıldı. **12 Eylül 2026, 2. revizyon:** başlangıçta Genel Bakış'ta da render edilmeye devam ediyordu ("iki yerde de kalsın" kararı); iki ekranda aynı grafiğin senkronize olmayan tarih aralıklarıyla görünmesi kafa karıştırıcı bulunduğundan Genel Bakış'tan kaldırıldı — `page.tsx`'teki `radar`/`radarAverage` (Genel Bakış'a özgü hesaplamalar, başka hiçbir yerde kullanılmıyordu) da bu değişiklikle birlikte silindi. Artık yalnızca Grafikler'de, `grafiklerRadar`/`grafiklerRadarAverage` ile render ediliyor.
- **`app/page.tsx`:**
  - `TabKey` dördüncü değeri: `"genel" | "hareketler" | "grafikler" | "istatistikler"`
  - Genel Bakış'ın `rangeStart`/`rangeEnd`'inden tamamen bağımsız yeni state: `grafiklerRangeStart`/`grafiklerRangeEnd` (+ kendi `grafiklerRangeSheetOpen` ve kendi `DateRangeSheet` örneği) — mimari kuralla tutarlı olması için bu state de `page.tsx`'te tutuluyor, yeni bir component'e taşınmıyor
  - `grafiklerFiltered`/`grafiklerExpenses`/`grafiklerSavings`/`grafiklerAgg`/`grafiklerAggSorted`/`grafiklerSavingsAgg`/`grafiklerBarData`/`grafiklerPieData`/`grafiklerRadar` — Genel Bakış'ın `agg`/`aggSorted`/`barData`/`pieData`/`radar` zincirinin birebir aynısı, sadece `grafiklerRangeStart`/`grafiklerRangeEnd`'e bağlı
  - Yeni `activeTab === "grafikler"` JSX bloğu: kendi zaman aralığı özeti + filtre butonu, `CategoryBarChart` (aynı `onBarClick` davranışıyla), `CategoryPieChart`, `CategoryRadarChart`
- **`components/layout/BottomTabBar.tsx`:** layout artık 2+2 (sol: Genel Bakış + Son Hareketler, sağ: Grafikler + İstatistikler), FAB değişmeden ortada. **İkon-only** oldu — `TabButton` artık etiket render etmiyor, `aria-label` ile erişilebilirlik korunuyor (bkz. PRD 6.1'deki karar gerekçesi). Yeni `tabD` tokeni (`#FFC15E`) Grafikler'in aktif rengi.
- **`components/layout/Sidebar.tsx`:** dördüncü `NavItem` ("Grafikler", `PieChart` ikonu) eklendi — masaüstünde etiketler değişmeden kalıyor, ikon-only kısıtı yalnızca mobil `BottomTabBar`'a özgü.
- **`app/globals.css`:** `--color-tabD: #ffc15e;` eklendi (bkz. Bölüm 4).

### 5.5 Pareto Karşılaştırma — Adaptif Tarih Çözünürlüğü (12 Eylül 2026, 3. revizyon)

Prototipteki `buildCumulativeDateMap(period, txs)` (bkz. `docs/WALLT_Prototype.jsx`), Pareto Karşılaştırma grafiğinin sağ eksenini — Dönem A'da her kümülatif yüzdeye hangi tarihte ulaşıldığını gösteren `tickFormatter` — her zaman **gün bazında** hesaplıyordu (dayCount = dönem uzunluğu gün cinsinden). Bu özellik WALLT'a hiç taşınmamıştı (`CompareParetoChart.tsx`'in sağ ekseni yalnızca düz `0/25/50/75/100` etiketleri gösteriyordu, formatter yoktu). Bu revizyonla, özellik WALLT'a **ilk kez ve doğrudan adaptif olarak** eklendi — sabit gün bazlı çözünürlük, uzun dönemlerde (örn. 1 yıl → 365 tik) eksende okunaksız/anlamsız bir yığılmaya yol açardı.

**`lib/calculations.ts`'e eklenen fonksiyonlar:**
- `periodGranularity(start, end): DateGranularity` — `"day" | "week" | "month" | "decile"` döner. Eşikler gerçek takvim ayı aritmetiğiyle (`addMonths`, yeni özel yardımcı) hesaplanır, sabit gün sayıları (90/365) KULLANILMAZ:
  - ≤ 14 gün (2 hafta) → `"day"`
  - > 14 gün ve ≤ 3 takvim ayı → `"week"`
  - > 3 ay ve ≤ 12 ay → `"month"`
  - > 12 ay → `"decile"`
- `granularityLabel(granularity): string` — UI notu için okunabilir etiket (`"günlük"`/`"haftalık"`/`"aylık"`/`"10 dilimlik"`).
- `buildCumulativeDateMap(transactions, start, end): (pct: number) => string` — prototipin `percentToDate`'inin adaptif karşılığı; granülerliğe göre transactionları bucket'lar (gün: her gün ayrı; hafta: dönem başlangıcından 7'şer günlük gruplar; ay: **gerçek takvim ayları**, ilk/son ay kısmi olabilir; 10 dilim: dönem süresine göre 10 eşit zaman aralığı — takvimle hizalı değil), her bucket için kümülatif toplamı hesaplar ve verilen `pct`'e ilk ulaşan bucket'ın **formatlanmış tarih etiketini doğrudan döner** (bileşene ham `Date` değil, hazır string veriliyor — formatlama mantığı `lib/`'de kalır, "dumb component" kuralıyla tutarlı).
  - Format: gün ve hafta granülerliğinde `"15 Eyl"` (prototipteki `formatShortDate` ile aynı `toLocaleDateString("tr-TR", { day: "numeric", month: "short" })`); ay granülerliğinde **yalnızca ay adı** (`"Eyl"`); 10 dilimde dilim sınırının tarihi (`"15 Eyl"` formatında).
  - **Bilinen basitleştirme:** ay granülerliğinde yıl gösterilmez — >3 ay ≤1 yıl aralığında aynı ay adının iki kez görünmesi (örn. Ocak'tan Ocak'a tam 1 yıl) pratikte nadir bir uç durumdur, ekstra karmaşıklığa değmedi.
  - Dönem A'da hiç harcama yoksa (`total === 0`) tüm tikler için boş string döner (prototipteki `percentToDate`'in `null` dönüşüne karşılık gelir).

**Bağlantı (`page.tsx` → `CompareParetoChart.tsx`):** `page.tsx`'te zaten var olan `periodA`/`txA`'dan iki yeni `useMemo` türetilir: `periodADateAt = buildCumulativeDateMap(txA, periodA.start, periodA.end)` ve `periodAGranularityLabel = granularityLabel(periodGranularity(periodA.start, periodA.end))`. Bunlar `CompareParetoChart`'a iki yeni prop olarak geçirilir; bileşen granülerliği bilmez, yalnızca sağ `<YAxis>`'in `tickFormatter`'ında `periodADateAt` çağrısını yapar ve grafiğin altına `periodAGranularityLabel`'i kullanan küçük bir çözünürlük notu (`"Sağ eksen: {periodALabel} döneminde {granülerlik} çözünürlük"`) render eder.

**Test:** `lib/calculations.test.ts`'e `periodGranularity`/`granularityLabel`/`buildCumulativeDateMap` için birim testleri eklendi — dört granülerlik seviyesinin sınır koşulları (`periodGranularity`) ve her granülerlikte bucket/format doğruluğu (`buildCumulativeDateMap`) ayrı ayrı kapsanıyor.

### 5.6 Son Hareketler — Tarih ve Kategori Filtresi (12 Eylül 2026, 2. revizyon)

Son Hareketler sekmesine, Genel Bakış/Grafikler'den tamamen bağımsız kendi filtresi eklendi (bkz. PRD 6.1.1). Bu, aynı zamanda mevcut bir tutarsızlığı da düzeltiyor: sekme başlığında Genel Bakış'ın `rangeStart`/`rangeEnd` etiketi gösteriliyordu ama `TransactionList`'e her zaman filtresiz `transactions` geçiliyordu — görüntülenen etiketin listeyle hiçbir ilişkisi yoktu.

**Yeni bileşenler (dumb, `page.tsx`'teki state'i tüketir):**
- **`components/hareketler/HareketlerRangePicker.tsx`:** `PeriodPicker.tsx` ile aynı desen (renkli başlık/swatch olmadan) — iki tarih input'u + `DateRangeSheet`'in `QUICK_OPTIONS`'ı (Bu Hafta/Geçen Hafta/Bu Ay/Geçen Ay) + bu sekmeye özel ekstra bir **"Tüm Zamanlar"** butonu (`onAllTime`). Sabit `QUICK_OPTIONS` listesi paylaşıldığı için diğer sekmelerin kısayolları etkilenmiyor; "Tüm Zamanlar" yalnızca bu bileşende var.
- **`components/hareketler/CategoryFilterChips.tsx`:** `AddExpenseSheet`'teki kategori chip'leriyle aynı görsel dil (aktif chip kategori renginde dolu), ama **toggle mantığıyla** — `selectedIds: string[]` prop'u, birden fazla kategori aynı anda aktif olabilir. Boş dizi = "Tümü" (ayrı bir "Tümü" chip'i bu durumu gösterir/sıfırlar).
- Her iki bileşen de "Tamam" butonu içermez — `PeriodPicker`'ın kullanıldığı Dönemleri Düzenle sheet'indeki gibi, tek bir paylaşılan "Tamam" butonu `page.tsx`'teki `BottomSheet` içinde, her iki bileşenin altında durur.

**`app/page.tsx`:**
- Yeni state: `hareketlerRangeStart`/`hareketlerRangeEnd` (varsayılan: Bu Ay — `thisMonthStartStr`/`todayStr`, diğer sekmelerle aynı varsayılan), `hareketlerCategoryIds: string[]` (varsayılan `[]`, yani tümü), `hareketlerFilterSheetOpen`.
- `handleHareketlerAllTime()`: aralığı sabit bir epoch'tan (`2000-01-01`) bugüne ayarlar — gerçekçi bir kullanıcı verisinin bundan önce olması beklenmediği için minimum işlem tarihini hesaplamaya gerek yok.
- `toggleHareketlerCategory(id)`: `hareketlerCategoryIds` dizisinde id varsa çıkarır, yoksa ekler.
- `hareketlerFiltered = useMemo(...)`: önce `filterByRange(transactions, hareketlerRangeStart, hareketlerRangeEnd)`, sonra (dizi boş değilse) `categoryId` ile eşleşenlere daraltır. Tasarruf girişleri de `categoryId` taşıdığı için aynı filtreye tabidir.
- Hareketler sekmesi başlığına, Grafikler'deki tek-ikon "Filtrele" deseni eklendi; `TransactionList`'e artık `transactions` yerine `hareketlerFiltered` geçiriliyor.

### 5.7 Şifremi Unuttum Akışı (13 Eylül 2026)

Bir kullanıcının (`murathan.bagci@gmail.com`) "invalid login credentials" hatası alması üzerine yapılan inceleme (Dashboard → Authentication → Users kaydı: hesap `confirmed`, ama `last_signed_in_at` kayıt anından beri hiç güncellenmemiş) şifre-unutma senaryosunu doğruladı ve uygulamada bunu çözecek **hiçbir akışın olmadığını** ortaya çıkardı (`resetPassword`/`forgot`/`recover` için kod tabanında sıfır sonuç). Bu revizyon eksiği kapatıyor:

- **`AuthForm.tsx`:** `Mode` tipi üçüncü bir değer alıyor: `"signin" | "signup" | "forgot"`. Signin modunda şifre alanının altında bir **"Şifremi unuttum?"** linki, `mode`'u `"forgot"`a çeker — bu modda üst `Giriş Yap`/`Kayıt Ol` sekme çifti gizlenir, yalnızca email alanı + `"Sıfırlama Bağlantısı Gönder"` butonu + `"Girişe dön"` linki gösterilir. Submit, `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/reset-password\` })` çağırır. Hesap var/yok bilgisini sızdırmamak için (Supabase'in kendi davranışıyla tutarlı — bkz. `signInWithPassword`'deki "Invalid login credentials" mesajının hem yanlış şifre hem de var-olmayan email için aynı olması), başarı mesajı her zaman aynı, belirsiz ifadeyi kullanır: *"Eğer bu email'e kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi."*
- **`components/auth/ResetPasswordForm.tsx` (net-new) + `app/reset-password/page.tsx` (net-new):** Sıfırlama linkine tıklandığında ulaşılan sayfa — iki şifre alanı (yeni şifre + tekrar), `supabase.auth.updateUser({ password })` çağırır. İki ayrı hata state'i var (`mismatchError`/`sessionError`) — şifreler eşleşmiyorsa sade bir mesaj, ama `updateUser` gerçekten hata dönerse (geçersiz/süresi dolmuş kurtarma oturumu — test sırasında gözlemlenen gerçek mesaj: `"Auth session missing!"`) ek bir "bağlantının süresi dolmuş olabilir, tekrar dene" ipucu eklenir. Bu ikisinin ayrı tutulması önemli: aksi halde basit bir yazım hatası bile kullanıcıya "bağlantın bozuk" gibi yanıltıcı bir mesaj gösterirdi.
- **`proxy.ts`:** `PUBLIC_PATHS`'e `"/reset-password"` eklendi. Bu **kritik** bir düzeltme — kurtarma linkine tıklandığında ilk istek, tarayıcı kodu henüz değişimi (code exchange) yapmadan proxy'ye session cookie'si OLMADAN ulaşır; sayfa public değilse bu istek doğrudan `/login`'e yönlendirilir ve kurtarma kodu (URL'deki `?code=`) hiç işlenmeden kaybolurdu — akış sw.js/manifest.webmanifest'in daha önce aynı nedenle (11 Eylül 2026) public listeye eklenmesiyle birebir aynı kökene sahip bir sınıf hata.
- **`docs/WALLT_PRD_v2.md` Bölüm 5.5:** "Şifremi unuttum akışı... ayrı bir ekran tasarımı gerektirmez" ifadesi yanlıştı (hiç var olmayan bir özelliği var sayıyordu) — düzeltildi.

### 5.8 İşlem Düzenleme ve Silme (13 Eylül 2026)

Prototipte bu özellik hiç yoktu (`docs/WALLT_Prototype.jsx`'te delete/edit/swipe/kebab-menü için sıfır sonuç) — tasarım tamamen WALLT'a özgü. Erişim deseni, düzenleme yaklaşımı ve silme onayı kararları için bkz. PRD 5.1.1.

- **`lib/storage.ts`:** `updateTransaction(id, input)` eklendi — `addTransaction`'ın birebir aynısı, `.update().eq("id", id)` ile. RLS zaten hazırdı (`transactions_update_own`/`transactions_delete_own` policy'leri Faz 8'de, `20260911_init_schema.sql`'de kuruldu) — ek migration gerekmedi.
- **`components/sheets/AddExpenseSheet.tsx`:** yeni opsiyonel `editingTransaction?: Transaction` prop'u. Verilirse tüm `useState` başlangıç değerleri ondan okunur — `BottomSheet` kapalıyken child'ı tamamen unmount ettiği için (`if (!open) return null`), sheet her açılışta baştan mount olur ve ayrı bir reset efektine gerek kalmaz. `onSubmit` prop'unun imzası **değişmedi** — hangi işlemin (ekleme/güncelleme) yapılacağına `page.tsx`'teki çağıran taraf karar verir, bileşenin kendisi bunu bilmez. Buton etiketi `editingTransaction` varsa "Kaydet" (Check ikonu), yoksa eskisi gibi "Harcama Ekle"/"Tasarruf Ekle" (Plus ikonu).
- **`components/hareketler/TransactionList.tsx`:** satırlar artık `<button>` — yeni `onRowClick?: (t: Transaction) => void` prop'u ile tıklanabilir.
- **`components/hareketler/TransactionActionsSheet.tsx` (net-new):** Düzenle (Pencil ikonu, nötr) / Sil (Trash2 ikonu, `bg-category-saglik/15` + `text-category-saglik` — uygulamanın zaten hata mesajlarında kullandığı "tehlike" tonu) butonları.
- **`app/page.tsx`:**
  - Yeni state: `editingTransaction`, `actionsSheetTransaction`, `deletingTransaction`.
  - `handleSubmitTransaction`: `editingTransaction` doluysa `updateTransaction` + `transactions` state'inde ilgili satırı `map` ile değiştirir, boşsa eskisi gibi `addTransaction` + `[...prev, tx]`. Her iki dalda da sonuç `sortByTimestampDesc` ile yeniden sıralanır.
  - `openEditSheet(transaction)`: `editingTransaction`'ı set edip aynı `addSheetOpen` state'ini (yeni bir paralel state değil) açar — ekleme ve düzenleme aynı sheet'i paylaşır.
  - `requestDeleteTransaction`/`handleConfirmDelete`: iki adımlı onay akışını yönetir; onaylanınca `deleteTransaction` + `transactions`'tan `filter` ile çıkarma.
  - `BottomSheet`'in dış `title`'ı artık `editingTransaction`'a göre "Harcamayı Düzenle"/"Tasarrufu Düzenle"/"Harcama Ekle" arasında değişir.
  - Grafiklerin canlı güncellenmesi (bar/pie/pareto/radar/hero toplamı, kategori değişimi dahil) **zaten var olan mimarinin doğal sonucu** — `transactions` tek bir state dizisi, tüm grafik verileri bundan türeyen `useMemo`'lar; `setTransactions`'ı doğru güncellemek yeterli, `aggregate()`/`withSavingSegments()` her render'da `categoryId`'ye göre yeniden gruplar.

### 5.9 JWT Clock-Skew (PGRST303) Retry (14 Eylül 2026)

Tekrarlayan bir üretim hatası araştırıldı: bazı kullanıcılar (gerçek bir mobil cihaz dahil) veri yüklenirken "JWT issued at future UTC: ..." hatası alıyordu. Kök neden Supabase client kütüphanesinde değil — `@supabase/supabase-js`/`@supabase/ssr`'ın `iat` (issued-at) doğrulaması için hiçbir client-side tolerans/leeway ayarı yok. Hata, PostgREST'in kendi saatiyle token'ın `iat`'ı arasındaki anlık senkronizasyon farkından (`PGRST303`) kaynaklanıyor; bilinen bir PostgREST cache bug'ı (v16.1/v14.17'de düzeltildi) ya da gerçek cihaz saati sorunu olabilir. Kaynak: [supabase/discussions#48123](https://github.com/orgs/supabase/discussions/48123), [supabase/supabase#41294](https://github.com/supabase/supabase/issues/41294).

- **`lib/storage.ts`:** `withClockSkewRetry()` sarmalayıcı eklendi — `fetchTransactions`/`fetchCategories` çağrısı `PGRST303` (veya mesajı "JWT issued at future" içeren) bir hatayla başarısız olursa, kullanıcıya hiçbir şey göstermeden ~1.5sn bekleyip **bir kez** sessizce tekrar dener; her iki denemede de `console.warn` ile not düşülür (ayrı bir logging altyapısı bu aşamada gereksiz görüldü). Retry de başarısız olursa orijinal hata olduğu gibi fırlatılır.
- **`app/page.tsx`:** `errorMessage()`, retry tükenip hata `loadError`'a kadar ulaşırsa `PGRST303`/"JWT issued at future" imzasını tanıyıp ham İngilizce metin yerine anlaşılır bir Türkçe mesaj gösterir: *"Cihazının saati yanlış görünüyor. Ayarlar'dan tarih/saati otomatik güncellemeyi aç ve tekrar dene."* Diğer tüm hata tipleri eskisi gibi davranır (mesaj olduğu gibi gösterilir).
- **`lib/storage.test.ts` (net-new):** Supabase client'ı mock'layıp retry davranışını 3 senaryoda doğrular — (1) ilk deneme `PGRST303`, ikinci deneme başarılı → veri döner, (2) her iki deneme de `PGRST303` → orijinal hata fırlatılır, (3) ilgisiz bir hata kodu → retry denenmeden direkt fırlatılır.

### 5.10 iOS Dokunma/Focus Sorunları — Sheet Arka Plan İzolasyonu (14 Eylül 2026)

Gerçek bir iPhone'da iki belirti bildirildi: (1) Harcama Ekle sheet'i açıkken Başlık input'una dokunulduğunda Tutar alanına ait yanlış klavye accessory'si (chevron + onay) görünüyordu, (2) sheet açıkken arkadaki Genel Bakış bar chart'ının tooltip'i "takılı" görünüyordu. İnceleme sonucu iki ayrı ama ilişkili kök neden bulundu:

- **`components/sheets/BottomSheet.tsx`:** sheet açıkken body'de hiçbir scroll lock yoktu — arka plan touch/scroll almaya devam ediyordu (iOS Safari'de bilinen bir "backdrop leak" sınıfı). `useEffect` ile `position: fixed` + scroll konumunu kaydedip geri yükleyen standart iOS body-scroll-lock deseni eklendi; backdrop `touch-none`, panel `touch-auto overscroll-contain` sınıflarıyla işaretlendi. (Not: `if (!open) return null` hook'lardan SONRAya taşındı — Hook kuralları gereği erken return artık `useEffect` çağrısından sonra.)
- **`app/page.tsx`:** Genel Bakış ve Grafikler'deki `CategoryBarChart`'a bara dokunmak hem sheet'i açıyor hem de Recharts'ın kendi iç hover/tooltip state'ini tetikliyor; chart sheet açıkken unmount olmadığından bu state hiç temizlenmeden "takılı" kalabiliyordu. Her iki `CategoryBarChart` çağrısına `key={String(addSheetOpen)}` eklendi — sheet her açılıp kapandığında chart'ı remount ederek tooltip/hover state'ini garantili sıfırlar. Tarayıcıda mouseover/mousemove ile tooltip önce aktif hale getirilip ardından bara dokunularak doğrulandı: sheet açılır açılmaz tooltip wrapper'ı `hidden` oluyor.
- **`components/sheets/AddExpenseSheet.tsx`:** Tutar input'u `type="number"` → `type="text" inputMode="decimal"`'e çevrildi. `type="number"`'ın iOS'taki native accessory'si (chevron up/down + Done), formdaki komşu `type="text"` alanlarıyla (Başlık) hızlı focus geçişlerinde karışabiliyor — bu, standart pratik olarak sayısal/ondalık alanlarda `inputMode` kullanılmasının (native `number` type yerine) önerilme sebeplerinden biri. Native karakter filtrelemesinin yerini yeni `sanitizeAmountInput()` (yalnızca rakam + en fazla bir nokta) alıyor; `components/sheets/AddExpenseSheet.test.ts` (net-new) bunu 4 senaryoda doğruluyor.
- **Sınırlama:** iOS'un native klavye accessory çakışması (belirti 1) gerçek WebKit'e özgü bir davranış olduğundan Browser pane (Chromium tabanlı) içinde birebir yeniden üretilemedi/görsel olarak doğrulanamadı — `type="number"`'ı kaldırmak bilinen standart çözüm olduğundan uygulandı, ancak gerçek cihazda son doğrulama kullanıcıdan bekleniyor.

**14 Eylül 2026, 2. revizyon — gerçek kök neden:** Yukarıdaki 3 düzeltme belirtileri gidermedi. Kullanıcı asıl davranışı netleştirdi: input'a dokununca sayfa o alana zoom yapıyor ve bu zoom kalıcı kalıyor. Bu, iOS Safari'nin bilinen bir davranışı — **font-size'ı 16px'in altında olan bir input focus olduğunda Safari otomatik zoom yapar**, ve çıkışta bu zoom'u güvenilir şekilde geri almaz. Uygulamadaki **tüm** form input/textarea'ları `text-sm` (14px, Tailwind varsayılanı) kullanıyordu — proje `html`'de özel bir `font-size` override'ı olmadığından `rem` tabanlı bu değer gerçekten 14px'e karşılık geliyordu, 16px eşiğinin altında.

- Aşağıdaki **13 input/textarea**'nın tümü `text-sm` → `text-base` (16px) yapıldı — sadece input/textarea elemanlarının kendisi değiştirildi, çevresindeki label/buton/paragraf metinleri (`text-xs`/`text-sm`) olduğu gibi bırakıldı:
  - `components/sheets/AddExpenseSheet.tsx`: Başlık, Açıklama (textarea), Tutar, Tarih ve Saat, Kategori adı (5 input)
  - `components/sheets/DateRangeSheet.tsx`: Başlangıç, Bitiş (2 input)
  - `components/istatistikler/PeriodPicker.tsx`: Dönem A/B başlangıç-bitiş (2 input, Dönem başına)
  - `components/hareketler/HareketlerRangePicker.tsx`: Başlangıç, Bitiş (2 input)
  - `components/auth/AuthForm.tsx`: E-posta, Şifre (2 input)
  - `components/auth/ResetPasswordForm.tsx`: Yeni Şifre, Yeni Şifre (Tekrar) (2 input — not: toplam sayım 13, RangePicker'lar dahil)
- **Viewport meta:** `app/layout.tsx`'teki `viewport` export'unda `maximum-scale`/`user-scalable` gibi bir kısıtlama hiç yoktu ve font-size düzeltmesi tek başına yeterli olduğundan eklenmedi — erişilebilirlik açısından kullanıcının sayfayı elle zoom'lama (pinch-zoom) yeteneği kısıtlanmadı.
- **Doğrulama:** Gerçek cihaz erişimi olmadığından, düzeltme render edilmiş DOM'dan `getComputedStyle(el).fontSize` okunarak doğrulandı — giriş formu, AddExpenseSheet'in 5 input'u (Yeni Kategori dahil), DateRangeSheet, HareketlerRangePicker ve PeriodPicker'ın (4 input, Dönem A+B) tümünde `16px` ölçüldü. iOS'un zoom-on-focus davranışının kendisi (WebKit'e özgü) Browser pane'de test edilemez — **bu değişikliğin gerçek etkisini gerçek iPhone'da yeniden doğrulaman gerekiyor.**

### 5.11 Grafiklerde iOS Metin/Görsel Seçme Davranışı (14 Eylül 2026)

İstatistikler'deki karşılaştırma grafiklerinde bir bara/noktaya dokunulduğunda tooltip'in yanında iOS Safari'nin kendi "metin seçme" davranışı da tetikleniyordu (mavi seçim çerçevesi + gri tap-highlight kutusu) — dokunmatik SVG'nin varsayılan olarak seçilebilir/callout-açık bırakılması kaynaklı, tooltip'i okumayı zorlaştırıyordu.

- **Kapsam taraması:** `grep -rl "from \"recharts\"" components/` ile **5 dosya** bulundu: `components/genel/CategoryBarChart.tsx`, `components/genel/CategoryPieChart.tsx`, `components/genel/CategoryRadarChart.tsx`, `components/istatistikler/CompareBarChart.tsx`, `components/istatistikler/CompareParetoChart.tsx`. Ayrı bir `ComparePieChart` dosyası yok (kullanıcının "varsa" dediği).
- **`app/globals.css`:** Her dosyaya ayrı ayrı eklemek yerine (5 kat tekrar + gelecekte yeni bir grafik eklenirse unutulma riski), Recharts'ın **tüm** chart tiplerinde ortak kök sınıfı olan `.recharts-wrapper`'a (bkz. `node_modules/recharts/es6/chart/RechartsWrapper.js` — her `<ResponsiveContainer>` içeriği bu sınıfı taşır) tek bir CSS kuralı eklendi:
  ```css
  .recharts-wrapper,
  .recharts-wrapper * {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  ```
  Bu, kod tekrarı olmadan mevcut 5 grafiği de kapsar ve ileride eklenecek herhangi bir Recharts grafiğini otomatik kapsar.
- **Doğrulama notu (Chromium kısıtı):** `document.styleSheets` üzerinden `cssText` okununca `-webkit-touch-callout` ve `-webkit-user-select` görünmüyor — bu, Blink'in (Chromium'un render motoru) bu WebKit-özel property'leri hiç tanımamasından kaynaklanan bir CSSOM serileştirme durumu, gerçek bir hata değil. `.next/dev/static/chunks/app_globals_*.css`'in ham içeriği doğrudan okunarak 4 property'nin de sunulan CSS'te birebir mevcut olduğu doğrulandı — Safari bu dosyayı olduğu gibi alıp WebKit'e özel property'leri (aksine Chromium'un aksine) doğru şekilde uygulayacaktır.
- **Tooltip regresyon testi:** Tarayıcıda `mouseover`/`mousemove` event'leri senkron olarak dispatch edilip her 5 grafiğin (CategoryBarChart, CategoryPieChart, CompareBarChart, CompareParetoChart test edildi; CategoryRadarChart seçili dönemde <3 kategori harcaması olduğundan bu testte render olmadı — kod değişikliği hepsini aynı şekilde kapsıyor) tooltip'inin hâlâ doğru açıldığı doğrulandı (`.recharts-tooltip-wrapper` `visibility: visible` + doğru metin).
- **Sınırlama:** iOS'un asıl seçim/callout tetiklenme davranışı (mavi çerçeve) WebKit'e özgü olduğundan Browser pane'de (Chromium) doğrudan gözlemlenemedi — sadece CSS'in doğru üretildiği ve tooltip'in bozulmadığı doğrulanabildi. **Gerçek iPhone'da tekrar doğrulama gerekiyor.**

### 5.12 Sık Kullanılanlar Şeridi (15 Eylül 2026 eklentisi)

Bkz. PRD Bölüm 5.1.2. Amaç: sık tekrar eden harcamaların (aynı başlık+tutar+kategori) elle yeniden yazılmasını önlemek.

- **`lib/calculations.ts` — `getFrequentExpenses(transactions, limit = 5)`:** Saf fonksiyon. **15 Eylül 2026, netleştirme:** Anahtar `type|başlık(trim+lowercase)|categoryId`'dir — **tutar anahtara dahil değil**. Aynı başlık+kategori farklı tutarlarla girilmiş olabilir (örn. "Market" harcaması her seferinde biraz farklı bir tutar); tutarı anahtara dahil etmek bu doğal varyasyonu ayrı ayrı, hiçbiri tek başına "sık" eşiğine ulaşamayan kombinasyonlara bölerdi. Bunun yerine chip'te gösterilecek tutar, o grup içindeki **en son tarihli (timestamp'i en büyük) kaydın tutarıdır** — kullanıcının en güncel/alışılmış harcama miktarını yansıtır. Sonuç listesi:
  - **En az 2 tekrarı olan** kombinasyonlarla sınırlanır (`count >= 2`) — "sık kullanılan" tanımı tek seferlik bir harcamayı kapsamamalı.
  - `count`'a göre azalan sırada, eşitlik durumunda en son kullanılan kombinasyon öne alınır.
  - En fazla `limit` (varsayılan 5) eleman döner.
  - Az veri varsa (örn. hiç kombinasyon 2 kez tekrarlanmamışsa) **boş dizi** döner — bu durumda UI şeridi hiç render etmez (bkz. aşağıda).
  - Dönüş tipi (`lib/types.ts`'e eklenir): `FrequentExpense { title, amount, categoryId, type, count }` — `amount`, yukarıda açıklandığı gibi grubun en son kaydının tutarıdır.
  - **Browser'da test ederken bulunan edge case:** `timestamp`, bir `datetime-local` input'undan geldiği için **dakika hassasiyetindedir** — aynı dakika içinde art arda eklenen iki kayıt birebir aynı ISO string'e sahip olabilir (gerçek testte doğrulandı: iki "Kahve" kaydı aynı dakikada eklenince ilk yazılan `>` strict karşılaştırmasıyla "son" sayılıyordu, ikincisi değil). Karşılaştırma `>=` olarak düzeltildi — çağıranın (`page.tsx`) `transactions`'ı insertion-order + stabil sort ile DESC tuttuğu gerçek kullanımda, bu "aynı dakikada girilen ikinci kayıt birincinin üzerine yazar" davranışını doğru verir. `lib/calculations.test.ts`'e bu senaryo için ayrı bir regresyon testi eklendi.
- **`components/sheets/FrequentChips.tsx` (net-new, dumb component):** `expenses: FrequentExpense[]`, `categories: Category[]` (chip rengi/ikonu için), `onSelect: (expense: FrequentExpense) => void` prop'larını alır. `expenses.length === 0` ise **`null` döner** — şeridi göstermeme kararı bileşenin kendisinde, `getFrequentExpenses`'in zaten `count >= 2` filtresiyle "az veri" durumunu doğal olarak eleyen çıktısına güvenilir; ayrı bir eşik sabiti (örn. "<3" gibi) iki yerde tekrar edip senkronizasyon riski yaratmasın diye eklenmedi. Yatay `overflow-x-auto` bir şerit, her chip kategori rengiyle noktalanmış başlık+tutar gösterir.
- **`components/sheets/AddExpenseSheet.tsx`:** Yeni `frequentExpenses?: FrequentExpense[]` prop'u. Sadece **ekleme modunda** (`editingTransaction` yokken) form alanlarının üstünde `<FrequentChips>` render edilir — düzenleme modunda form zaten dolu geldiğinden gösterilmez (bkz. PRD 5.1.2). Bir chip'e dokununca `title`/`amount`/`categoryId`/`entryType` state'leri o chip'in değerleriyle set edilir; `dateTimeValue` **dokunulmaz** (her zaman "şu an" kalır — chip'ten doldurma tarih taşımaz). Doldurulan alanlar normal controlled input'lar olduğundan kullanıcı istediği alanı serbestçe değiştirebilir.
- **`app/page.tsx`:** `getFrequentExpenses(transactions)` çağrısı `useMemo` ile hesaplanır (tüm transactions üzerinden — belirli bir zaman aralığıyla sınırlı değil, çünkü "sık kullanılan" kavramı seçili dönem filtresinden bağımsız olmalı), `AddExpenseSheet`'e `frequentExpenses` prop'u olarak geçirilir.

**15 Eylül 2026, 2. revizyon — Harcama/Tasarruf tipine ve top-3 kategoriye göre filtreleme:**

1. **Sıralama:** `AddExpenseSheet`'te Harcama/Tasarruf toggle'ı artık `<FrequentChips>`'in **üstünde** — kullanıcı önce hangi tip girdi yapacağını seçer, sonra o tipe uygun şerit görünür (önceki sıralamada şerit toggle'dan önce geliyordu, bu da "hangi tipin şeridine bakıyorum" belirsizliği yaratıyordu).
2. **Tipe göre otomatik güncelleme:** `getFrequentExpenses` zaten `type`'ı gruplama anahtarına dahil ediyordu (bkz. yukarı), ama önceden `page.tsx` TEK bir liste (tüm type'lar karışık) hesaplayıp geçiriyordu. Artık `page.tsx`, her iki type için AYRI birer liste hesaplar (`frequentExpensesByType: Record<TransactionType, FrequentExpense[]>`); `AddExpenseSheet`, kendi local `entryType` state'ine göre `frequentExpensesByType[entryType]`'ı `<FrequentChips>`'e geçirir. Kullanıcı toggle'ı değiştirdiğinde prop değişir, şerit otomatik yeniden render olur — `FrequentChips`'in kendisinde `type`'a özel bir mantık gerekmez, o hâlâ sadece "verilen listeyi göster" işini yapar.
3. **Top-3 kategori kısıtı:** Şerit artık seçili type'a ait TÜM sık kombinasyonları değil, sadece o type için **en çok işlem yapılan ilk 3 kategoriye** ait kombinasyonları gösterir — 4. sıradaki ve sonrası kategoriler, o kategoride ne kadar tekrarlanan kombinasyon olursa olsun hiç gösterilmez. Yeni saf fonksiyon:
   ```ts
   export function getTopCategoriesByUsage(
     transactions: Transaction[],
     type: TransactionType,
     limit = 3
   ): CategoryUsage[]
   ```
   `transactions`'ı `type`'a göre filtreler, `categoryId` bazında işlem sayısını sayar, `count`'a göre azalan sırada (eşitlikte en son kullanılan kategori öne alınır — `getFrequentExpenses`'teki tie-break ile **tutarlı**, aynı "en büyük timestamp kazanır" mantığı) ilk `limit` kategoriyi döner. **Harcama ve Tasarruf için ayrı ayrı** çağrılır — örn. Harcama'da en çok "Market" kullanılıyorken Tasarruf'ta en çok "Sağlık" kullanılıyor olabilir, ikisinin top-3 listesi tamamen bağımsızdır.
   - Yeni dönüş tipi (`lib/types.ts`): `CategoryUsage { categoryId, count }`.
   - `page.tsx`'teki `frequentExpensesByType` hesaplaması: her `type` için önce `getTopCategoriesByUsage(transactions, type)` ile top-3 `categoryId` kümesi çıkarılır, sonra `getFrequentExpenses(transactions.filter(t => t.type === type))` sonucu bu kümeyle filtrelenir. Bu birleştirme `page.tsx`'te yapılır — `getFrequentExpenses`'in kendisi top-3 kısıtından habersiz kalır, tek başına da (örn. ileride farklı bir bağlamda) kullanılabilir durumda kalır.

**6 numaralı bölüme not:** Faz 4 (Harcama Ekle akışı) tamamlandıktan sonraki bir ek mini-faz olarak ele alınır — yeni bir Faz numarası açmaz, çünkü tamamlanmış bir akışa (form + validasyon + state ekleme) üstüne eklenen, akışı değiştirmeyen bir iyileştirmedir. Bağımlılığı: `transactions` state'i zaten var olmalı (Faz 8, gerçek veri).

**Yan bulgu — `vitest.config.mts` (net-new):** `FrequentChips.tsx`'in `@/lib/categories`'den gerçek bir değer (`SAVING_COLOR`) import etmesiyle, projede daha önce hiç fark edilmemiş bir test altyapısı boşluğu ortaya çıktı: `tsconfig.json`'daki `"@/*"` path alias'ı sadece TypeScript'in tip kontrolünde çözülüyordu, Vitest'in hiçbir alias/resolve yapılandırması yoktu. Bu şimdiye kadar sorun çıkarmamıştı çünkü test edilen dosyalardaki tüm `@/` import'ları `import type` (derleme sırasında tamamen elenen, runtime'da resolve edilmesi gerekmeyen) import'lardı. `resolve.alias` tanımlayan minimal bir `vitest.config.mts` eklendi (yeni bir bağımlılık gerekmedi).

### 5.13 Kategori Yönetimi — Hızlı Ekleme Modalı + Ayarlar Ekranı (16 Eylül 2026 eklentisi)

Bkz. PRD Bölüm 5.2 revizyonu. Önceki inline "+ Yeni" text-input akışı bir modala taşınıyor, ayrıca kategorileri düzenleme/silme için yeni bir "Kategorileri Yönet" ekranı ekleniyor.

**Migration notu:** Kullanıcı `ALTER TABLE categories ADD COLUMN color` istemişti — gerek yok, `20260911_init_schema.sql`'de `color text not null` zaten var. **Yeni migration yazılmadı.**

- **`components/ui/ColorPicker.tsx` (net-new, paylaşılan):** `{ value: string; onChange: (hex: string) => void }` props alır (presets için opsiyonel override, varsayılan `CUSTOM_PALETTE`). Preset swatch grid'i (tıklayınca `onChange` direkt tetiklenir) + custom hex text input (kullanıcı yazarken local state'te tutulur, `/^#[0-9A-Fa-f]{6}$/` geçerli olduğunda `onChange` çağrılır — geçersiz ara durumlar hata vermeden yazılabilir) + seçili rengin canlı önizleme chip'i. Hem yeni-kategori modalında hem yönetim ekranında **aynı component** kullanılır — kod tekrarı yok.
- **`components/sheets/AddExpenseSheet.tsx` — "+ Yeni Kategori" modalı:** Mevcut `addingCategory`/`newCategoryName` inline text-input akışı kaldırılır. Kategori chip listesinin sonuna eklenen "+ Yeni Kategori" chip'i, `AddExpenseSheet`'in kendi local state'iyle kontrol edilen **nested bir `<BottomSheet>`** açar (ad input + `ColorPicker` + önizleme + Kaydet/Vazgeç). `BottomSheet`'in kendi local stacking context'i sayesinde (fixed + z-index, kendi içindeki descendant'lara göre ayrı bir katman oluşturur) bu iç içe sheet, dışarıdaki `AddExpenseSheet`'in üstünde sorunsuz render olur — `BottomSheet.tsx`'e hiçbir değişiklik gerekmedi. Kaydedince `onAddCategory(name, color)` çağrılır (mevcut prop, artık `color` da alıyor), yeni kategori otomatik seçilir, modal kapanır. Bu akış tamamen `AddExpenseSheet`'in kendi local state'inde kalır — sayfa (`page.tsx`) seviyesinde yeni bir state gerekmez, çünkü bu bileşen zaten kendi form-alanı state'ini (mevcut mimari kuralı: form bileşenleri kendi local state'lerini tutabilir) yönetiyordu.
- **`components/sheets/CategoryManagementSheet.tsx` (net-new):** `page.tsx`'ten yeni bir "Ayarlar" `TopBar` ikonuyla açılan, tüm kategorileri (varsayılan + custom) listeleyen sheet. Varsayılan 7 kategori **rozetli ("Varsayılan") ve tamamen salt-okunur** gösterilir — Düzenle/Sil butonu yok (gerekçe: bu kategoriler DB'de satır değil, `lib/categories.ts`'e hardcoded; düzenlenebilir yapmak ayrı bir "override" tablosu/mekanizması gerektirirdi). Custom kategorilerde satıra dokununca (accordion tarzı, ayrı bir modal AÇMADAN) satır içinde genişleyen bir düzenleme formu belirir: ad input + `ColorPicker` + Kaydet/Sil/Vazgeç. "Sil"e basınca aynı satır içinde bir onay görünümüne geçilir — *"Bu kategoriye ait N kayıt var, silinince hepsi 'Diğer'e taşınacak. Emin misin?"* (N, local `transactions` state'inden `transactions.filter(t => t.categoryId === id).length` ile hesaplanır — ayrı bir Supabase sorgusu gerekmez, veri zaten bellekte).
- **`lib/storage.ts` — yeni fonksiyonlar:**
  ```ts
  export async function updateCategory(id: string, input: { name: string; color: string }): Promise<Category>
  export async function deleteCategory(id: string, reassignTo?: string): Promise<void>
  ```
  `deleteCategory`, önce `transactions` tablosunda `category_id = id` olan TÜM satırları tek bir toplu `UPDATE` sorgusuyla `reassignTo`'ya (varsayılan `"diger"`) taşır, sonra kategori satırını siler. İki adım ayrı sorgu (Supabase client'ı çok-ifadeli DB transaction desteklemiyor) — en kötü senaryoda taşıma başarılı olup silme başarısız olursa kategori "zombi" olarak kalır (veri kaybı yok, elle tekrar denenebilir); taşıma başarısız olursa silme hiç denenmez (`throw` ile durur), yani hiçbir işlem senaryosunda kayıt referanssız (orphan `category_id`) kalmaz.
- **`app/page.tsx`:** Yeni `categoryManagementOpen` state'i + `TopBar`'a `onSettingsClick` prop'u (yeni `Settings` ikonu, mevcut Dışa Aktar/Paylaş/Çıkış Yap ile aynı stil). `handleUpdateCategory`/`handleDeleteCategory` fonksiyonları hem Supabase'i hem local `categories`/`transactions` state'lerini günceller (silmede: `transactions`'taki ilgili kayıtların `categoryId`'si de `"diger"`'e set edilir — DB ile local state senkron kalır, ekstra bir refetch gerekmez).
- **`lib/types.ts` / `Category`:** Değişiklik yok — `color` alanı zaten vardı, sadece artık düzenlenebilir.

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

**Mini-Faz — Sık Kullanılanlar Şeridi (15 Eylül 2026 eklentisi):** Faz 4'ün (Harcama Ekle akışı) üstüne, ayrı bir Faz numarası açmadan eklenen küçük bir iyileştirme — `lib/calculations.ts`'e `getFrequentExpenses()` + `components/sheets/FrequentChips.tsx` + `AddExpenseSheet`'e entegrasyon (bkz. Bölüm 5.12). Bağımlılığı Faz 8'in (gerçek `transactions` verisi) tamamlanmış olmasıdır; mock seed verisiyle de çalışır ama anlamlı sonuç üretmesi için gerçek kullanım geçmişi gerekir.

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
