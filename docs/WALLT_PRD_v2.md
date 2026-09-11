# WALLT — Ürün Gereksinimleri Dokümanı (PRD)

**Versiyon:** 2.0 — Prototip ve teknik analiz sonrası güncellenmiş sürüm
**Tarih:** 5 Eylül 2026
**Durum:** Prototip onaylandı, geliştirme öncesi son PRD
**Sahibi:** [PM Adı]
**İlgili dokümanlar:** `WALLT_Teknik_Analiz_v1.md` (uygulama mimarisi ve build sırası), `WALLT_Prototype.jsx` (onaylanmış interaktif prototip)

---

## 1. Özet

WALLT, kullanıcıların aylık harcamalarını **manuel olarak** kategorilere ayırarak takip edebildiği, güçlü görselleştirme ve **dönemsel karşılaştırma** özellikleriyle diğer harcama takip uygulamalarından ayrışan **mobil-first** bir web uygulamasıdır.

Pazardaki mevcut çözümler (Spendee, Monefy, Pocket Clear, Wallet by BudgetBakers) ya banka senkronizasyonuna ya da basit tek-dönemlik görselleştirmeye odaklanıyor. WALLT'ın farklılaşma noktası: **iki farklı zaman dilimini (hafta-hafta, ay-ay) aynı grafik üzerinde üst üste bindirerek (overplot) karşılaştırabilme** — bu özelliğe pazarda net bir karşılık bulunamadı.

v1'den bu yana ürün bir interaktif prototip üzerinden somutlaştırıldı; bu doküman prototipte alınan tüm tasarım kararlarını PRD'ye geri yansıtır.

## 2. Problem Tanımı

Kullanıcılar harcamalarını takip etmek istiyor ama:
- Banka API entegrasyonlu uygulamalar güvenlik/KVKK bariyerleri nedeniyle kurulması zor ve kullanıcıya güven vermesi zaman alan çözümler
- Mevcut manuel takip uygulamaları (Monefy, Pocket Clear) hızlı giriş sunuyor ama analiz derinliği zayıf
- Analiz derinliği olan uygulamalar (Spendee, YNAB) çoğunlukla tek dönem gösteriyor; "bu ay geçen aya göre nasıldım" sorusuna doğrudan görsel cevap vermiyor

## 3. Hedef Kullanıcı

Bankasına veri paylaşmak istemeyen, ama harcama alışkanlığını kategori ve zaman bazında derinlemesine analiz etmek isteyen, verisine hakim olmayı önemseyen bireysel kullanıcı. Öncelikli erişim mobil tarayıcı üzerinden olacağından, tek elle kullanım ve hızlı giriş bu kullanıcı için kritik.

## 4. Kapsam Dışı (v1)

| Özellik | Neden Dışarıda |
|---|---|
| Banka/kart API entegrasyonu (Open Banking) | Banka güvenlik katmanları + KVKK uyum süreci v1 kapsamı için orantısız yük. TR'de açık bankacılık ekosistemi olgunlaşıyor (BKM/TCMB, ~16,4M kullanıcı), v2/v3'te yeniden değerlendirilebilir. |
| Otomatik makbuz/fiş tarama (OCR) | Sektörde standart (Spendee) ama v1'in manuel-first felsefesiyle çelişmiyor |
| Ortak cüzdan / paylaşımlı bütçe | v1 tek kullanıcı odaklı |
| Bildirim/hatırlatma sistemi | v2'ye ertelendi |
| Kullanıcı hesabı / bulut senkronizasyonu | v1 local-first (bkz. Bölüm 10) |

## 5. Fonksiyonel Gereksinimler

### 5.1 Harcama Girişi

Harcama ekleme, ana ekranda her zaman açık bir form değil, **alt navigasyon çubuğunun ortasındaki yükseltilmiş "+" butonuyla açılan bir bottom sheet** üzerinden yapılır. Bu, mobil-first prensibiyle ana ekranı sade tutar ve harcama eklemeyi her ekrandan tek dokunuşla erişilebilir kılar.

Form alanları:
- **Başlık** (zorunlu) — örn. "Öğle yemeği"
- **Açıklama** (opsiyonel) — serbest metin not alanı
- **Tutar** (₺, zorunlu)
- **Tarih ve Saat** (zorunlu, **düzenlenebilir**) — varsayılan olarak "şu an" ile dolu gelir, kullanıcı geçmişe dönük bir harcamayı da girebilir
- **Kategori** (hybrid model, bkz. 5.2)

Tüm zorunlu alanlar doldurulmadan "Harcama Ekle" butonu pasif kalır. Başarılı eklemede sheet kapanır ve kısa bir onay bildirimi (toast) gösterilir.

### 5.2 Kategori Yönetimi

- **Hybrid model**: Önceden tanımlı sabit kategori seti (Yemek, Ulaşım, Eğlence, Market, Fatura, Sağlık, Diğer) sağlanır
- Kullanıcı kendi custom kategorisini ekleyebilir
- Her kategoriye otomatik renk ataması yapılır (sabit ve custom kategoriler dahil); form içinde seçili kategori chip'i kendi rengiyle vurgulanır

### 5.3 Export & Paylaşım

- Genel harcama raporu PDF olarak export edilebilir
- Custom zaman aralığı analizleri de export edilebilir olmalı
- Export, bir bottom sheet içinde "Rapor Önizleme" olarak gösterilir; önizlemede kategori kırılımı ve toplam yer alır
- Paylaş butonu: native share sheet üzerinden

### 5.4 Zaman Dilimi Analizi

- Genel Bakış ekranında toplam tutarın yanındaki **filtre ikonu**, tarih aralığı seçimini bir bottom sheet olarak açar (büyük, her zaman açık bir panel yerine)
- Seçili aralık, toplam tutarın altında küçük bir etiket olarak her zaman görünür kalır (örn. "1 Eyl – 2 Eyl 2026")
- Hızlı seçim kısayolları: Bu Hafta / Geçen Hafta / Bu Ay / Geçen Ay
- Seçilen aralık için tüm grafik tipleri (bar, pie, pareto) filtrelenir

## 6. Bilgi Mimarisi ve Navigasyon (Mobil-First)

- **Alt tab bar**, iki ana ekran arasında geçiş sağlar: **Genel Bakış** ve **İstatistikler**
- Tab bar'ın ortasında, yükseltilmiş dairesel bir **"+" FAB** bulunur — bu, "Harcama Ekle" akışını her zaman bir dokunuş uzağında tutar
- Üstteki bar sade tutulur: sadece uygulama adı ve iki ikon-buton (Dışa Aktar, Paylaş)
- Tüm ikincil etkileşimler (harcama ekleme, tarih filtresi, export önizleme) **bottom sheet** olarak açılır — ayrı sayfa/modal yerine mobilde alışılmış, alttan kayan panel deseni kullanılır

## 7. Görselleştirme Gereksinimleri

| Grafik Tipi | Davranış | Not |
|---|---|---|
| Bar Chart | Kategoriye göre harcama dağılımı; kullanıcı harcama yaptıkça ilgili bar büyür | Genel Bakış'ta |
| Pie Chart | Kategori bazlı oransal dağılım | Genel Bakış'ta |
| Pareto / Histogram | Kategorileri harcama büyüklüğüne göre sıralayıp kümülatif etkiyi %80 referans çizgisiyle gösterir | Genel Bakış'ta |
| Renk Kodlama | Her kategori sabit bir renkle temsil edilir, tüm grafiklerde ve chip'lerde tutarlı | Genel |

### 7.1 Dönem Karşılaştırma (Overplot) — İstatistikler Ekranı

Prototipte doğrulanan çözüm:
- **Bar chart:** İki dönem (Dönem A / Dönem B), her kategori için yan yana gruplu bar olarak gösterilir
- **Pie chart:** İç içe iki halka — iç halka Dönem A, dış halka Dönem B; her ikisinde de dilimler kategori rengiyle boyanır
- **Pareto:** İki dönemin barları yan yana, kümülatif % çizgileri (her dönem kendi toplamına göre) aynı eksende, Dönem A düz çizgi / Dönem B kesikli çizgi ile ayrıştırılır

Dönem A ve Dönem B, ayrı renk kodları taşır (Dönem A = sıcak turuncu, Dönem B = turkuaz) ve bu iki renk kategori renklerinden bağımsız, sadece dönem karşılaştırma bağlamında kullanılır.

Üç istatistik kartı (Dönem A toplamı / Dönem B toplamı / Fark %) grafiklerin üzerinde her zaman görünür durur.

## 8. Tasarım Sistemi

Görsel kimlik, birkaç iterasyon sonucunda şu prensiplere oturdu:
- **"Neşeli ama sofistike"** — parlak/karikatürsü değil; yumuşak gölgeler, pastel-canlı renkler, gradyan dokunuşlar
- **Tipografi ikilisi:** Başlık/büyük sayılar için yuvarlak bir display font, arayüzün geneli için nötr bir gövde fontu — bu ayrım karıştırılmamalı (karışırsa tasarım çizgi-film hissine kayıyor)
- **Kategori renkleri:** Yedi sabit kategori için önceden tanımlı, birbirinden net ayrışan pastel-canlı renk paleti
- **Bileşen stili:** Sert siyah kontur/offset gölge yok; kartlar hafif, bulanık gölgelerle "yüzüyor"

Tam renk kodları, font tanımları ve gölge değerleri için **Teknik Analiz Dokümanı Bölüm 4**'e bakınız — bu değerler doğrudan onaylanmış prototipten alınmıştır ve geliştirme sırasında yeniden yorumlanmamalıdır.

## 9. Teknik Yaklaşım

WALLT, **web-first** bir ürün olarak geliştirilecek ve geliştirme süreci **AI-destekli (vibe coding)** bir akışla yürütülecektir. Bu karar, teknoloji seçimlerini (Next.js, TypeScript, Tailwind — bkz. Teknik Analiz Dokümanı Bölüm 1) doğrudan etkiler: tercih edilen araçlar, bir AI pair-programmer'ın (Claude Code vb.) tutarlı ve öngörülebilir kod üretebileceği, iyi dokümante edilmiş ve yaygın olarak bilinen araçlardır. Native (iOS/Android) geliştirme v1 kapsamında değildir; yalnızca Bölüm 14'te tanımlı belirli tetikleyiciler gerçekleştiğinde v3 fazında değerlendirilecektir.

## 10. Veri Kalıcılığı

v1 için veri saklama stratejisi **local-first**'tir: kullanıcı verisi kullanıcı hesabı veya bulut senkronizasyonu olmadan, doğrudan tarayıcıda (IndexedDB) saklanır. Bu tercih, v1'i hızlı teslim edebilmek ve kullanıcı hesabı/kimlik doğrulama karmaşıklığından kaçınmak için yapılmıştır. Riski ve telafisi Bölüm 13'te not edilmiştir; kullanıcı hesabı ve bulut senkronizasyonuna geçiş v2 kapsamındadır (bkz. Bölüm 14 Faz Planı).

## 11. PWA ve Dağıtım

### 11.1 Ana Ekrana Ekle

WALLT, bir Progressive Web App (PWA) olarak paketlenir; böylece kullanıcı tarayıcı üzerinden "ana ekrana ekle" diyerek uygulamayı native bir app gibi telefonuna ekleyebilir. Bu, ayrı bir App Store/Play Store dağıtımı gerektirmeden native benzeri bir deneyim sunar ve v1'in web-first stratejisiyle uyumludur.

## 12. Açık Sorular

| # | Soru | Durum |
|---|---|---|
| 1 | Kategori rengi custom kategorilerde nasıl atanacak? | ✅ Çözüldü — sabit bir palet dizisinden sırayla atama (bkz. Teknik Analiz Bölüm 4) |
| 2 | Dönem karşılaştırmada pie chart overplot nasıl çözülecek? | ✅ Çözüldü — iç içe halka (Dönem A iç, Dönem B dış) |
| 3 | Veri nerede saklanacak — local mı, cloud mu? | ⏳ Açık — v1 için local-first (IndexedDB) önerisi var, kesinleşmedi |
| 4 | Offline kullanım desteklenecek mi? | ⏳ Açık |
| 5 | Zaman dilimi (timezone) sınır durumları nasıl ele alınacak? | ⏳ Açık — Teknik Analiz Dokümanı'nda risk olarak işaretlendi |
| 6 | PDF export hangi teknik yolla üretilecek? | ⏳ Açık — `window.print()` vs. `@react-pdf/renderer` |
| 7 | Genel Bakış / İstatistikler ayrı route mu, tek sayfa client state mi? | ⏳ Açık — v1 için tek sayfa öneriliyor |

## 13. Kapsam Dışı Bırakılan Riskler / Notlar

- Manuel giriş modeli, kullanıcı disiplinine bağımlı — düşük "adherence" riski
- Pareto/histogram gibi ileri analiz özellikleri ortalama kullanıcı için karmaşık gelebilir — onboarding'de basit tutulmalı
- Local-first kalıcılık tercih edilirse, kullanıcı cihaz değiştirdiğinde veri kaybı riski vardır — bu risk v1 lansmanında kullanıcıya açıkça belirtilmeli

## 14. Faz Planı

| Faz | Kapsam | Platform |
|---|---|---|
| MVP (v1) | Manuel giriş (modal), hybrid kategori, bar/pie/pareto chart, PDF export, paylaş butonu, mobil-first navigasyon | Web (Next.js), PWA desteğiyle |
| v1.1 | İstatistikler ekranı — üç grafikte de dönem overplot | Web |
| v2 | Local-first kalıcılıktan kullanıcı hesabı + bulut senkronizasyonuna geçiş, bildirimler | Web |
| v3 | Native geçiş tetikleyicilerinden biri gerçekleştiğinde: React Native/Expo (EAS Build) ile iOS + Android | Native (RN/Expo) |
| v4+ | Open banking değerlendirmesi, ortak cüzdan | Native |

Uygulama içi build fazları (kod seviyesinde) için **Teknik Analiz Dokümanı Bölüm 6**'daki 10 fazlık plana bakınız.
