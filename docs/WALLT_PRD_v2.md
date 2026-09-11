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

> **Not (5 Eylül 2026 revizyonu):** "Kullanıcı hesabı / bulut senkronizasyonu" önceki taslakta burada v2'ye ertelenmiş bir kapsam dışı öğesiydi. PM kararıyla v1 kapsamına alındı — email+şifre girişi ve Supabase ile veri saklama artık v1'in bir parçası (bkz. Bölüm 5.5 ve Bölüm 10).

## 5. Fonksiyonel Gereksinimler

### 5.1 Harcama Girişi

Harcama ekleme, ana ekranda her zaman açık bir form değil, **alt navigasyon çubuğunun ortasındaki yükseltilmiş "+" butonuyla açılan bir bottom sheet** üzerinden yapılır. Bu, mobil-first prensibiyle ana ekranı sade tutar ve harcama eklemeyi her ekrandan tek dokunuşla erişilebilir kılar.

Sheet'in üstünde bir **Giriş Tipi** seçici bulunur: **Harcama** / **Tasarruf** (varsayılan: Harcama).
- **Harcama**: normal bir gideri kaydeder; kategori toplamlarına ve tüm grafiklere (bar, pie, pareto, radar) dahil edilir.
- **Tasarruf**: kullanıcının bilinçli olarak harcamadığı/biriktirdiği tutarı kaydeder; kategori toplamlarına ve grafiklere **dahil edilmez**, ayrı bir tasarruf toplamı olarak izlenir (bkz. 7.2). Bu seçenek işaretlendiğinde Tutar alanının etiketi "Tasarruf Edilen Tutar (₺)", Kategori alanının etiketi "Hangi kategoriden tasarruf ettin?" olarak değişir.

Form alanları:
- **Başlık** (zorunlu) — örn. "Öğle yemeği" (Tasarruf'ta örn. "Kahve almadım")
- **Açıklama** (opsiyonel) — serbest metin not alanı
- **Tutar** (₺, zorunlu)
- **Tarih ve Saat** (zorunlu, **düzenlenebilir**) — varsayılan olarak "şu an" ile dolu gelir, kullanıcı geçmişe dönük bir harcamayı da girebilir
- **Kategori** (hybrid model, bkz. 5.2)

Tüm zorunlu alanlar doldurulmadan "Harcama Ekle" / "Tasarruf Ekle" butonu pasif kalır. Başarılı eklemede sheet kapanır ve kısa bir onay bildirimi (toast) gösterilir (Tasarruf girişinde toast metni farklıdır, örn. "Tasarruf kaydedildi — ₺150").

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

### 5.5 Kimlik Doğrulama

- Kullanıcı, **email + şifre** ile kayıt olur ve giriş yapar (Supabase Auth üzerinden)
- Oturum açılmadan uygulamanın geri kalanına erişilemez — ilk açılışta giriş/kayıt ekranı gösterilir
- Oturum durumu tarayıcıda kalıcıdır (Supabase session); sayfa yenilendiğinde kullanıcı tekrar giriş yapmak zorunda kalmaz
- Şifremi unuttum akışı, Supabase'in hazır e-posta linkiyle desteklenir — v1 kapsamında ayrı bir ekran tasarımı gerektirmez
- Tüm harcama/tasarruf/kategori verisi kullanıcı hesabına bağlıdır; bir kullanıcı yalnızca kendi verisini görür (bkz. Bölüm 10)

## 6. Bilgi Mimarisi ve Navigasyon (Mobil-First)

- **Alt tab bar**, iki ana ekran arasında geçiş sağlar: **Genel Bakış** ve **İstatistikler**
- Tab bar'ın ortasında, yükseltilmiş dairesel bir **"+" FAB** bulunur — bu, "Harcama Ekle" akışını her zaman bir dokunuş uzağında tutar
- Üstteki bar sade tutulur: sadece uygulama adı ve iki ikon-buton (Dışa Aktar, Paylaş)
- Tüm ikincil etkileşimler (harcama ekleme, tarih filtresi, export önizleme) **bottom sheet** olarak açılır — ayrı sayfa/modal yerine mobilde alışılmış, alttan kayan panel deseni kullanılır

## 7. Görselleştirme Gereksinimleri

| Grafik Tipi | Davranış | Not |
|---|---|---|
| Bar Chart | Kategoriye göre harcama dağılımı; kullanıcı harcama yaptıkça ilgili bar büyür | Genel Bakış'ta — seçili dönemde toplam tasarruf > 0 ise sona ayrı görünümde bir "Tasarruf" barı eklenir (bkz. 7.2) |
| Pie Chart | Kategori bazlı oransal dağılım | Genel Bakış'ta |
| Pareto / Histogram | Kategorileri harcama büyüklüğüne göre sıralayıp kümülatif etkiyi %80 referans çizgisiyle gösterir | Genel Bakış'ta |
| Radar / Ağırlık Haritası | Her kategorinin harcamasını, o dönemde harcaması olan kategorilerin ortalamasına göre konumlandırır | Genel Bakış'ta — yalnızca seçili dönemde en az 3 kategoride harcama varsa gösterilir, aksi halde gizlenir |
| Renk Kodlama | Her kategori sabit bir renkle temsil edilir, tüm grafiklerde ve chip'lerde tutarlı | Genel |

### 7.1 Dönem Karşılaştırma (Overplot) — İstatistikler Ekranı

Prototipte doğrulanan çözüm:
- **Bar chart:** İki dönem (Dönem A / Dönem B), her kategori için yan yana gruplu bar olarak gösterilir
- **Pie chart:** İç içe iki halka — iç halka Dönem A, dış halka Dönem B; her ikisinde de dilimler kategori rengiyle boyanır
- **Pareto:** İki dönemin barları yan yana, kümülatif % çizgileri (her dönem kendi toplamına göre) aynı eksende, Dönem A düz çizgi / Dönem B kesikli çizgi ile ayrıştırılır

Dönem A ve Dönem B, ayrı renk kodları taşır (Dönem A = sıcak turuncu, Dönem B = turkuaz) ve bu iki renk kategori renklerinden bağımsız, sadece dönem karşılaştırma bağlamında kullanılır.

Üç istatistik kartı (Dönem A toplamı / Dönem B toplamı / Fark %) grafiklerin üzerinde her zaman görünür durur.

### 7.2 Tasarruf Görselleştirmesi

- Seçili dönemde toplam tasarruf > 0 ise, Genel Bakış'ta hero tutarın altında ayrı bir **tasarruf özet kartı** gösterilir (yeşil vurgu, toplam tasarruf tutarı)
- Aynı koşulda, kategori bar chart'ının sonuna sabit bir **"Tasarruf" barı** eklenir; bu bar diğer kategori barlarından farklı bir dolgu/kenarlıkla ayrıştırılır ve tıklanamaz (diğer barların aksine harcama ekleme akışını tetiklemez)
- Son Hareketler listesinde tasarruf girişleri "Tasarruf" etiketiyle ve tutarın başında "+" işaretiyle ayrıştırılır
- Tasarruf, hiçbir grafikte (bar, pie, pareto, radar) kategori toplamlarına dahil edilmez — yalnızca kendi özet kartında ve bar chart'taki ayrı barında görünür

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

**Revizyon (5 Eylül 2026):** v1'in ilk taslağında burada local-first (IndexedDB, kullanıcı hesabı yok) bir strateji tanımlıydı. PM kararıyla bu strateji değişti: v1 artık **Supabase** (Postgres + Auth) üzerinden **cloud-first**'tir.

- Kullanıcı email+şifre ile hesap oluşturur (bkz. Bölüm 5.5); tüm harcama, tasarruf ve custom kategori verisi bu hesaba bağlı olarak Supabase'de saklanır
- **Row Level Security (RLS):** Supabase tarafında her tabloya, kullanıcının yalnızca kendi `user_id`'sine ait satırları görebildiği/yazabildiği RLS politikaları tanımlanır — istemci kodunun kullanıcı filtrelemesini elle yapmasına gerek kalmaz
- Bu değişiklik, önceki taslakta Bölüm 13'te not edilen "cihaz değiştirince veri kaybı" riskini ortadan kaldırır — veri artık cihaza değil hesaba bağlıdır
- Offline kullanım desteklenmez (v1 kapsamı dışı) — uygulama internet bağlantısı gerektirir
- Kullanıcı hesabı ve bulut senkronizasyonuna geçiş artık v2'yi değil, **v1'in kendisini** kapsıyor (bkz. Bölüm 14 Faz Planı)

## 11. PWA ve Dağıtım

### 11.1 Ana Ekrana Ekle

WALLT, bir Progressive Web App (PWA) olarak paketlenir; böylece kullanıcı tarayıcı üzerinden "ana ekrana ekle" diyerek uygulamayı native bir app gibi telefonuna ekleyebilir. Bu, ayrı bir App Store/Play Store dağıtımı gerektirmeden native benzeri bir deneyim sunar ve v1'in web-first stratejisiyle uyumludur.

## 12. Açık Sorular

| # | Soru | Durum |
|---|---|---|
| 1 | Kategori rengi custom kategorilerde nasıl atanacak? | ✅ Çözüldü — sabit bir palet dizisinden sırayla atama (bkz. Teknik Analiz Bölüm 4) |
| 2 | Dönem karşılaştırmada pie chart overplot nasıl çözülecek? | ✅ Çözüldü — iç içe halka (Dönem A iç, Dönem B dış) |
| 3 | Veri nerede saklanacak — local mı, cloud mu? | ✅ Çözüldü — Supabase (cloud), kullanıcı hesabına bağlı (bkz. Bölüm 10) |
| 4 | Offline kullanım desteklenecek mi? | ✅ Çözüldü — Hayır, v1 kapsamında değil (Supabase internet bağlantısı gerektirir) |
| 5 | Zaman dilimi (timezone) sınır durumları nasıl ele alınacak? | ⏳ Açık — Teknik Analiz Dokümanı'nda risk olarak işaretlendi |
| 6 | PDF export hangi teknik yolla üretilecek? | ⏳ Açık — `window.print()` vs. `@react-pdf/renderer` |
| 7 | Genel Bakış / İstatistikler ayrı route mu, tek sayfa client state mi? | ⏳ Açık — v1 için tek sayfa öneriliyor |

## 13. Kapsam Dışı Bırakılan Riskler / Notlar

- Manuel giriş modeli, kullanıcı disiplinine bağımlı — düşük "adherence" riski
- Pareto/histogram gibi ileri analiz özellikleri ortalama kullanıcı için karmaşık gelebilir — onboarding'de basit tutulmalı
- ~~Local-first kalıcılık tercih edilirse, kullanıcı cihaz değiştirdiğinde veri kaybı riski vardır~~ — Bölüm 10'daki Supabase kararıyla bu risk ortadan kalktı
- **Yeni risk (Supabase kararıyla geldi):** Uygulama artık internet bağlantısı zorunlu kılıyor; hedef kullanıcı profili "mobil, her yerde hızlı giriş" olduğundan (Bölüm 3) zayıf bağlantılı ortamlarda giriş/kayıt sürtünmesi kullanıcı deneyimini etkileyebilir — launch öncesi değerlendirilmeli

## 14. Faz Planı

| Faz | Kapsam | Platform |
|---|---|---|
| MVP (v1) | Manuel giriş (modal), hybrid kategori, bar/pie/pareto/radar chart, tasarruf takibi, **email+şifre ile kimlik doğrulama ve Supabase ile bulut tabanlı veri saklama**, PDF export, paylaş butonu, mobil-first navigasyon | Web (Next.js), PWA desteğiyle |
| v1.1 | İstatistikler ekranı — üç grafikte de dönem overplot | Web |
| v2 | Bildirimler/hatırlatma sistemi | Web |
| v3 | Native geçiş tetikleyicilerinden biri gerçekleştiğinde: React Native/Expo (EAS Build) ile iOS + Android | Native (RN/Expo) |
| v4+ | Open banking değerlendirmesi, ortak cüzdan | Native |

> **Not:** Kullanıcı hesabı + bulut senkronizasyonu önceki taslakta v2'ye planlanmıştı; PM kararıyla v1'e alındı (bkz. Bölüm 10).

Uygulama içi build fazları (kod seviyesinde) için **Teknik Analiz Dokümanı Bölüm 6**'daki 11 fazlık plana bakınız.
