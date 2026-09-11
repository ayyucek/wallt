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
| Kalıcılık (v1) | **IndexedDB (idb-keyval paketi ile)** | localStorage'dan daha sağlam, büyüyen veri setinde performans sorunu çıkarmaz; backend'e geçişte veri modeli değişmeden kalır |
| Form/Tarih | Native HTML input (`date`, `datetime-local`) | Prototipte test edildi, ek kütüphane gerektirmiyor |
| PWA | `next-pwa` paketi | "Ana ekrana ekle" deneyimi için (PRD Bölüm 11.1) |

**Not:** Bu tercihler PRD'nin "Teknik Yaklaşım" bölümündeki web-first + AI-destekli geliştirme kararıyla uyumludur. Native geçiş (React Native/Expo) bu doküman kapsamında değildir; v3 fazında ayrı bir doküman olarak ele alınmalıdır.

---

## 2. Proje Yapısı

```
wallt/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Genel Bakış + İstatistikler tab'ları burada state ile yönetilir
│   └── globals.css              # Tailwind + font importları
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   ├── BottomTabBar.tsx
│   │   └── Fab.tsx
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
│   ├── storage.ts                # IndexedDB okuma/yazma katmanı
│   └── seed.ts                   # geliştirme ortamı için mock veri üretici
├── tailwind.config.ts
└── package.json
```

**Neden bu ayrım önemli:** `lib/calculations.ts` içindeki fonksiyonlar (aggregate, paretoData, filterByRange) **saf fonksiyonlardır** — girdi/çıktısı net, yan etkisi yok. Bu, hem AI'nin doğru kod üretmesini kolaylaştırır hem de bu fonksiyonlar için birim testi yazmak neredeyse bedavadır (bkz. Bölüm 7).

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

export interface Transaction {
  id: string;
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
}

export interface ParetoEntry extends CategoryTotal {
  cumPct: number;
}
```

**⚠️ Bilinen teknik risk — zaman dilimi:** Prototipte `timestamp.slice(0, 10)` ile tarih string'i çıkarılıyor (`txDateStr` fonksiyonu). Bu, kullanıcının tarayıcı saat dilimi UTC'den farklıysa gün sınırında ±1 günlük kaymalara yol açabilir. Gerçek üründe bu fonksiyonu **kullanıcının yerel saat dilimine göre** gün stringi üretecek şekilde yazın (`date-fns-tz` gibi bir kütüphane veya `Intl.DateTimeFormat` ile). Bu, PRD'nin açık sorular bölümünde işaretlenmemiş ama koda geçerken mutlaka çözülmesi gereken bir detaydır.

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

---

## 5. Bileşen Haritası (Prototip → Gerçek Bileşen)

| Prototip Bölümü | Gerçek Bileşen | Not |
|---|---|---|
| Hero tutar + filtre ikonu | `HeroTotal.tsx` | `onFilterClick` prop'u ile `DateRangeSheet`'i açar |
| Bar chart (kategori bazlı) | `CategoryBarChart.tsx` | `aggregate()` çıktısını alır, Recharts `BarChart` sarmalar |
| Pie chart | `CategoryPieChart.tsx` | Aynı veri kaynağını `CategoryBarChart` ile paylaşır (üstte hesaplanıp iki bileşene prop olarak geçilmeli — aynı hesaplamayı iki kere yapmayın) |
| Pareto chart | `ParetoChart.tsx` | `paretoData()` çıktısını alır |
| Son Hareketler listesi | `RecentTransactions.tsx` | `transactions` array'ini prop olarak alır, kendi içinde slice(0,40) yapar |
| Harcama Ekle sheet'i | `AddExpenseSheet.tsx` | `BottomSheet` wrapper'ını kullanır, `onSubmit(transaction)` callback'i ile üst state'e yazar |
| Zaman Aralığı sheet'i | `DateRangeSheet.tsx` | `BottomSheet` wrapper'ını kullanır |
| Dönem A/B kartları | `PeriodPicker.tsx` | `which: "A" \| "B"` prop'u ile iki kez render edilir |
| İç içe halkalar | `ComparePieChart.tsx` | İki `<Pie>` bileşeni tek `PieChart` içinde |
| Alt tab bar + FAB | `BottomTabBar.tsx` + `Fab.tsx` | FAB, tab bar'ın ortasındaki slot içinde `position:absolute` ile yükseltilir |

**Önemli mimari kural:** `page.tsx` tek "akıllı" (state tutan) bileşen olmalı; `components/` altındaki her şey mümkün olduğunca "aptal" (sadece prop alan, kendi state'i olmayan) bileşen olmalı. Bu, prototipte tek dosyada yönetilen state'in gerçek projede dağılıp kaybolmasını önler ve AI'nin hangi bileşenin neyi bildiğini takip etmesini kolaylaştırır.

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
8. **Faz 7 — Kalıcılık:** `lib/storage.ts` ile IndexedDB entegrasyonu; sayfa yenilenince veri kaybolmamalı.
9. **Faz 8 — Export:** `ExportSheet` içeriği + gerçek PDF üretimi (öneri: `@react-pdf/renderer` ya da tarayıcı `window.print()` ile bir print-friendly CSS — ikincisi daha az bağımlılık gerektirir, v1 için önerilir).
10. **Faz 9 — PWA + cila:** `next-pwa` kurulumu, manifest.json, ikonlar, iOS "ana ekrana ekle" onboarding ipucu.

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
| Kalıcılık: local mı, cloud mu? | PRD'de açık soru | v1 için IndexedDB (local-first) — kullanıcı hesabı/senkronizasyon v2+ konusu |
| Routing: tab'lar ayrı route mu? | Karar verilmedi | v1'de `page.tsx` içinde client state ile tab geçişi (daha basit); route'lara bölme ihtiyacı sadece deep-linking gerekirse |
| PDF export kütüphanesi | Karar verilmedi | v1 için `window.print()` + print CSS; gerçek PDF üretimi gerekirse `@react-pdf/renderer` değerlendirilebilir |
| TypeScript zorunlu mu? | Öneri | Şiddetle önerilir ama vibe coding akışını yavaşlatıyorsa `.jsx` ile devam edip tipleri sonradan eklemek de geçerli bir yol |
