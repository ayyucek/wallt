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
| PWA | `next-pwa` paketi | "Ana ekrana ekle" deneyimi için (PRD Bölüm 11.1) |

**Not:** Bu tercihler PRD'nin "Teknik Yaklaşım" bölümündeki web-first + AI-destekli geliştirme kararıyla uyumludur. Native geçiş (React Native/Expo) bu doküman kapsamında değildir; v3 fazında ayrı bir doküman olarak ele alınmalıdır.

**Mimari değişiklik notu (5 Eylül 2026 revizyonu):** Bu dokümanın ilk sürümü local-first (IndexedDB, `idb-keyval`) bir kalıcılık stratejisi tanımlıyordu. PM kararıyla kullanıcı hesabı + bulut senkronizasyonu v1'e alındı ve kalıcılık katmanı Supabase'e geçti. Bunun kod üzerindeki somut etkileri Bölüm 3, 6 ve 9'da işaretlenmiştir.

---

## 2. Proje Yapısı

```
wallt/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Genel Bakış + İstatistikler tab'ları burada state ile yönetilir
│   ├── globals.css              # Tailwind + font importları
│   └── login/
│       └── page.tsx              # email+şifre giriş/kayıt ekranı
├── proxy.ts                      # Next.js 16'da middleware.ts'in yeni adı; oturumu tazeler + route korur
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx             # 3. ikon (Çıkış Yap) Faz 7'de eklendi
│   │   ├── BottomTabBar.tsx
│   │   └── Fab.tsx
│   ├── auth/
│   │   └── AuthForm.tsx           # giriş/kayıt formu (prototipte karşılığı yok, Faz 7'de net-new)
│   ├── sheets/
│   │   ├── BottomSheet.tsx       # ortak sheet wrapper (grabber, animasyon, overlay)
│   │   ├── AddExpenseSheet.tsx
│   │   ├── DateRangeSheet.tsx
│   │   └── ExportSheet.tsx
│   ├── genel/
│   │   ├── HeroTotal.tsx
│   │   ├── CategoryBarChart.tsx
│   │   ├── CategoryPieChart.tsx
│   │   ├── ParetoChart.tsx
│   │   └── RecentTransactions.tsx
│   ├── istatistikler/
│   │   ├── PeriodPicker.tsx
│   │   ├── PeriodStats.tsx
│   │   ├── CompareBarChart.tsx
│   │   ├── ComparePieChart.tsx
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
  isSaving?: boolean; // sadece withSavingsBar()'ın ürettiği sentetik "Tasarruf" barında true
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
- `withSavingsBar(sortedAgg: CategoryTotal[], totalSavings: number): CategoryTotal[]` — `totalSavings > 0` ise büyükten küçüğe sıralı kategori dizisinin sonuna, `id: "__savings__"` ve `isSaving: true` ile işaretli sentetik bir "Tasarruf" barı ekler.
- Tasarruf rengi (`SAVING_COLOR = "#34D399"`), kategori renklerinden bağımsız sabit bir renktir ve `lib/categories.ts` içinde tanımlanır (periodA/periodB renklerine benzer şekilde).

---

## 4. Tasarım Sistemi (Design Tokens)

Bu değerler onaylanan prototipten birebir alınmıştır — Tailwind config'e bu şekilde işlenmeli, yeniden yorumlanmamalı.

```typescript
// tailwind.config.ts — theme.extend

colors: {
  ink: "#2B2640",
  muted: "#9891A8",
  page: "#FAF6F1",
  card: "#FFFFFF",
  periodA: "#FF9F5A",
  periodB: "#35C6D6",
  category: {
    yemek: "#FF7A6B",
    ulasim: "#4F9DDE",
    eglence: "#A374E8",
    market: "#4CC2A0",
    fatura: "#FFC15E",
    saglik: "#F0729D",
    diger: "#9AA3B5",
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

**Kullanım kuralı (AI'ye özellikle belirtilmeli):** `font-display` (Baloo 2) **sadece** hero tutar, sheet başlıkları ve büyük istatistik sayıları için kullanılır. Buton, label, chip, body metni her zaman `font-sans` (Inter). Bu ayrım karıştırılırsa tasarım "çizgi film" hissine geri döner (bkz. önceki iterasyon geri bildirimi) — bu kısıtı AI'ye açıkça hatırlatın.

**Gölge/derinlik stili:** Sert/offset gölge YOK. Her zaman yumuşak, bulanık, düşük opasiteli gölgeler:
```css
--shadow-card: 0 6px 20px rgba(43,38,64,.06);
--shadow-float: 0 8px 22px rgba(255,159,90,.20);   /* hero kart gibi renkli yüzeyler için */
--shadow-btn-primary: 0 6px 16px rgba(255,122,107,.35);
```

**Kategori rengi ekleme mantığı:** Yeni custom kategori eklendiğinde renk şu diziden sırayla atanır (prototipteki `CUSTOM_PALETTE` ile birebir aynı):
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
| Bar chart (kategori bazlı) | `CategoryBarChart.tsx` | `aggregate()` çıktısını alır (yalnızca `isExpense` işlemlerden), Recharts `BarChart` sarmalar; toplam tasarruf > 0 ise veri `withSavingsBar()`'dan geçirilerek sona "Tasarruf" barı eklenir (bkz. PRD 7.2) |
| Pie chart | `CategoryPieChart.tsx` | Aynı veri kaynağını `CategoryBarChart` ile paylaşır (üstte hesaplanıp iki bileşene prop olarak geçilmeli — aynı hesaplamayı iki kere yapmayın) |
| Pareto chart | `ParetoChart.tsx` | `paretoData()` çıktısını alır |
| Kategori Ağırlık Haritası (radar) | `CategoryRadarChart.tsx` | `radarData()` çıktısını alır; dizi 3'ten kısaysa grafik yerine bir bilgi metni gösterir (PRD 7 tablosundaki kural) |
| Tasarruf özet kartı | `SavingsSummaryCard.tsx` | Seçili dönemde toplam tasarruf > 0 ise gösterilir; `isSaving` ile filtrelenen işlemlerin toplamını alır |
| Son Hareketler listesi | `RecentTransactions.tsx` | `transactions` array'ini prop olarak alır, kendi içinde slice(0,40) yapar; `isSaving(t)` true olan satırlar "Tasarruf" etiketiyle ve "+" işaretiyle ayrıştırılır |
| Harcama Ekle sheet'i | `AddExpenseSheet.tsx` | `BottomSheet` wrapper'ını kullanır; üstte Harcama/Tasarruf giriş tipi seçici olur, `onSubmit(transaction)` callback'i ile üst state'e yazar |
| Zaman Aralığı sheet'i | `DateRangeSheet.tsx` | `BottomSheet` wrapper'ını kullanır |
| Dönem A/B kartları | `PeriodPicker.tsx` | `which: "A" \| "B"` prop'u ile iki kez render edilir |
| İç içe halkalar | `ComparePieChart.tsx` | İki `<Pie>` bileşeni tek `PieChart` içinde |
| Alt tab bar + FAB | `BottomTabBar.tsx` + `Fab.tsx` | FAB, tab bar'ın ortasındaki slot içinde `position:absolute` ile yükseltilir; `lg`'den itibaren `Sidebar.tsx` lehine gizlenir (bkz. 5.1) |

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
- `CategoryBarChart.tsx`, `CategoryPieChart.tsx`, `ParetoChart.tsx`, `CategoryRadarChart.tsx` — Recharts `ResponsiveContainer` zaten akışkan; en fazla `page.tsx`'teki grid/height değerleri `xl`'de değişir, grafik bileşenlerinin kendi kodu değişmez
- `RecentTransactions.tsx` — değişiklik gerekmiyor
- `AddExpenseSheet.tsx`, `AuthForm.tsx` — form içerikleri zaten ortalanmış/dar genişlikte; `BottomSheet`'in modal varyantı içinde de olduğu gibi çalışır, form bileşenlerinin kendisi değişmez

**Yeni yazılacak:**
- `components/layout/Sidebar.tsx` — `lg` ve üzerinde `BottomTabBar`+`Fab`'ın yerini alan sol sabit menü (logo, nav öğeleri, "+ Harcama Ekle" butonu)

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
10. **Faz 9 — Export:** `ExportSheet` içeriği + gerçek PDF üretimi (öneri: `@react-pdf/renderer` ya da tarayıcı `window.print()` ile bir print-friendly CSS — ikincisi daha az bağımlılık gerektirir, v1 için önerilir).
11. **Faz 10 — PWA + cila:** `next-pwa` kurulumu, manifest.json, ikonlar, iOS "ana ekrana ekle" onboarding ipucu.

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
| PDF export kütüphanesi | Karar verilmedi | v1 için `window.print()` + print CSS; gerçek PDF üretimi gerekirse `@react-pdf/renderer` değerlendirilebilir |
| TypeScript zorunlu mu? | Öneri | Şiddetle önerilir ama vibe coding akışını yavaşlatıyorsa `.jsx` ile devam edip tipleri sonradan eklemek de geçerli bir yol |
