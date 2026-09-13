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
- **Tutar** (₺, zorunlu) — **13 Eylül 2026 revizyonu:** iki ondalık basamağa kadar (kuruş) desteklenir, ondalık ayracı nokta (örn. "43.12"); v1'in ilk kararı (kuruşsuz tam sayı) terk edildi
- **Tarih ve Saat** (zorunlu, **düzenlenebilir**) — varsayılan olarak "şu an" ile dolu gelir, kullanıcı geçmişe dönük bir harcamayı da girebilir
- **Kategori** (hybrid model, bkz. 5.2)

Tüm zorunlu alanlar doldurulmadan "Harcama Ekle" / "Tasarruf Ekle" butonu pasif kalır. Başarılı eklemede sheet kapanır ve kısa bir onay bildirimi (toast) gösterilir (Tasarruf girişinde toast metni farklıdır, örn. "Tasarruf kaydedildi — ₺150").

### 5.2 Kategori Yönetimi

- **Hybrid model**: Önceden tanımlı sabit kategori seti (Yemek, Ulaşım, Eğlence, Market, Fatura, Sağlık, Diğer) sağlanır
- Kullanıcı kendi custom kategorisini ekleyebilir
- Her kategoriye otomatik renk ataması yapılır (sabit ve custom kategoriler dahil); form içinde seçili kategori chip'i kendi rengiyle vurgulanır

### 5.3 Export & Paylaşım

**Revizyon (11 Eylül 2026):** Aşağıdaki madde netleştirildi — "PDF olarak export edilebilir" ifadesi, tarayıcının yazdırma önizlemesini (`window.print()`) değil, kullanıcının cihazına indirebileceği/paylaşabileceği **gerçek bir `.pdf` dosyası** üretilmesini ifade eder (bkz. Teknik Analiz Bölüm 9).

- Genel harcama raporu, gerçek bir **PDF dosyası** olarak üretilir — ekran görüntüsü ya da yazdırma önizlemesi değil, kullanıcının cihazına kaydedebileceği/başka bir uygulamaya gönderebileceği somut bir dosya
- Custom zaman aralığı analizleri de export edilebilir olmalı — export edilen rapor, Genel Bakış'ta o an seçili olan tarih aralığını yansıtır (bkz. Bölüm 5.4)
- Export, bir bottom sheet içinde "Rapor Önizleme" olarak gösterilir; önizlemede kategori kırılımı ve toplam yer alır (bu önizleme PDF'in kendisi değil, PDF'e ne gireceğinin ekran üzerindeki özetidir)
- **İndir** butonu: PDF dosyasını üretip doğrudan cihaza indirir — tüm platformlarda her zaman çalışan, birincil eylem
- **Paylaş** butonu: üretilen PDF dosyasını native share sheet üzerinden paylaşır; tarayıcı/cihaz dosya paylaşımını desteklemiyorsa (örn. bazı masaüstü tarayıcılar) bu buton görünmez ya da İndir ile aynı davranışa düşer

### 5.4 Zaman Dilimi Analizi

- Genel Bakış ekranında toplam tutarın yanındaki **filtre ikonu**, tarih aralığı seçimini bir bottom sheet olarak açar (büyük, her zaman açık bir panel yerine)
- Seçili aralık, toplam tutarın altında küçük bir etiket olarak her zaman görünür kalır (örn. "1 Eyl – 2 Eyl 2026")
- Hızlı seçim kısayolları: Bu Hafta / Geçen Hafta / Bu Ay / Geçen Ay
- Seçilen aralık için tüm grafik tipleri (bar, pie, pareto) filtrelenir

### 5.5 Kimlik Doğrulama

- Kullanıcı, **email + şifre** ile kayıt olur ve giriş yapar (Supabase Auth üzerinden)
- Oturum açılmadan uygulamanın geri kalanına erişilemez — ilk açılışta giriş/kayıt ekranı gösterilir
- Oturum durumu tarayıcıda kalıcıdır (Supabase session); sayfa yenilendiğinde kullanıcı tekrar giriş yapmak zorunda kalmaz
- **Şifremi Unuttum akışı (13 Eylül 2026 eklentisi):** Giriş ekranındaki "Şifremi unuttum?" linki, kullanıcının email'ine Supabase'in gönderdiği bir sıfırlama bağlantısı tetikler; bağlantı, yeni bir **`/reset-password`** ekranına yönlendirir (yeni şifre + tekrar alanı). Hesap var/yok bilgisini sızdırmamak için gönderim sonrası mesaj her zaman aynıdır ("eğer bu email'e kayıtlı bir hesap varsa..."). Bağlantı geçersiz/süresi dolmuşsa kullanıcıya bunu belirten bir hata gösterilir, akışı tekrar başlatmasına yönlendirilir. (Bu dokümanın önceki sürümünde "ayrı bir ekran gerektirmez" deniyordu — pratikte bir kullanıcının giriş yapamaması üzerine yapılan inceleme, böyle bir akışın hiç var olmadığını ortaya çıkardı; bu revizyon o eksiği kapatır.)
- Tüm harcama/tasarruf/kategori verisi kullanıcı hesabına bağlıdır; bir kullanıcı yalnızca kendi verisini görür (bkz. Bölüm 10)

## 6. Bilgi Mimarisi ve Navigasyon (Mobil-First)

**Revizyon (11 Eylül 2026):** WALLT mobil-first tasarlanır (temel/varsayılan stiller mobil içindir) ama artık gerçek anlamda **responsive**'dir: masaüstü ve tablette mobil kalıplar (alt tab bar, FAB, bottom sheet) olduğu gibi büyütülmez, ekran genişliğine uygun kendi eşdeğerlerine dönüşür. Üç düzen aşağıda tanımlanmıştır; tam breakpoint eşlemesi için **Teknik Analiz Dokümanı Bölüm 4**'e bakınız.

**Navigasyon revizyonu (11 Eylül 2026):** "Son Hareketler" artık Genel Bakış içinde bir bölüm değil, ayrı ve sabit bir **üçüncü sekme**. Üç sekme düzeni ve FAB'ın konumu için `docs/WALLT_Prototype.jsx`'e bakıldı: prototipte zaten (v1'in kapsam dışı bıraktığı) üçüncü bir "Grafikler" sekmesiyle bu tam senaryo çözülmüş durumda — kendi çözümümüzü icat etmek yerine onu birebir yeniden kullanıyoruz (bkz. 6.1).

**Navigasyon revizyonu (12 Eylül 2026):** Prototipin kendi "Grafikler" sekmesi (bar/pie/radar üçlüsü, kendi bağımsız tarih aralığı filtresiyle) de v1'e eklendi — dördüncü sekme. Sekme sırası: **Genel Bakış, Son Hareketler, Grafikler, İstatistikler**. Dar mobil genişlikte 4 etiketli sekme + FAB sığmadığından, alt tab bar **ikon-only** oldu (etiketler yalnızca masaüstü Sidebar'da kalıyor, bkz. 6.1).

### 6.1 Mobil Düzen (varsayılan, <768px)

- **Alt tab bar**, dört ana ekran arasında geçiş sağlar: **Genel Bakış**, **Son Hareketler**, **Grafikler**, **İstatistikler**
- Tab bar iki yarıma bölünür ve FAB, bu iki yarım arasındaki sabit bir çentikte durur — prototipteki `wallt-tabbar-half` deseninin genişletilmiş hali: sol yarımda **Genel Bakış** ve **Son Hareketler**, sağ yarımda **Grafikler** ve **İstatistikler** (her yarım artık 2'şer sekme paylaşıyor). FAB'ın konumu, boyutu ve yükseltilmiş görünümü hiç değişmez
- **12 Eylül 2026 revizyonu:** 4 sekme + FAB, etiketli haliyle dar mobil genişlikte sığmadığından alt tab bar **ikon-only** oldu (metin etiketi yok, yalnızca `aria-label` ile erişilebilirlik korunuyor) — masaüstü Sidebar'da etiketler aynen kalıyor, çünkü orada yeterli yatay alan var. Değerlendirilip elenen alternatifler: kaydırılabilir tab bar (bottom nav'da scroll, kullanıcı beklentisini kırar, yaygın değil) ve FAB'ı farklı bir konuma taşımak (gereksiz — ikon-only zaten alanı çözüyor, FAB'ın thumb-reach konumu bilinçli bir karardı)
- Aktif sekme rengi kategoriye göre ayrışır (prototipteki `tab-b`/`tab-c` renk sınıflarıyla birebir, Grafikler için yeni bir `tabD` tokeni eklendi): Genel Bakış mor (`tabA`), Son Hareketler yeşil (`tabC`), Grafikler altın/sarı (`tabD`), İstatistikler mavi (`tabB`)
- Tab bar'ın ortasında, yükseltilmiş dairesel bir **"+" FAB** bulunur — bu, "Harcama Ekle" akışını her zaman bir dokunuş uzağında tutar
- Üstteki bar sade tutulur: uygulama adı ve üç ikon-buton (Dışa Aktar, Paylaş, Çıkış Yap — üçüncüsü Bölüm 5.5'teki kimlik doğrulama kararıyla eklendi)
- Tüm ikincil etkileşimler (harcama ekleme, tarih filtresi, export önizleme) **bottom sheet** olarak açılır — ayrı sayfa/modal yerine mobilde alışılmış, alttan kayan panel deseni kullanılır

### 6.1.1 Son Hareketler Sekmesi

- İçerik, Genel Bakış'taki (artık kaldırılan) özet bölümünün yerini alır ve genişletilir: kısıtlı bir sayıya (önceki "ilk 40 kayıt") kesilmeden, **seçili filtreye uyan tüm işlemler** listelenir
- **Sayfalama/sonsuz kaydırma v1 kapsamında değildir** — Supabase sorgusu zaten kullanıcının tüm verisini tek seferde çekiyor (bkz. Teknik Analiz Bölüm 10); çok uzun bir tarih aralığında binlerce kayıt performans sorunu yaratırsa bu v1.1'de ele alınacak bilinen bir risktir, şimdilik kabul edilebilir bir basitleştirme
- **12 Eylül 2026 eklentisi — Tarih ve kategori filtresi:** Sekme, Genel Bakış/Grafikler'den tamamen **bağımsız kendi filtresine** sahip (tek "Filtrele" ikonu, Grafikler'deki tek-ikon deseniyle tutarlı). Önceki halinde başlıkta Genel Bakış'ın tarih etiketi gösteriliyordu ama listeye uygulanmıyordu (tutarsızlık); bu revizyonla düzeltildi:
  - **Tarih aralığı:** standart hızlı seçim kısayolları (Bu Hafta/Geçen Hafta/Bu Ay/Geçen Ay) + bu sekmeye özel bir **"Tüm Zamanlar"** kısayolu (sabit bir epoch'tan bugüne) — sekmenin özgün "tam geçmiş" tasarım kararına tek dokunuşla dönebilmek için
  - **Kategori filtresi:** **çoklu seçim** — birden fazla kategori aynı anda aktif olabilir; hiçbiri seçili değilse "tümü" anlamına gelir. Tasarruf girişleri de (kategoriId üzerinden) aynı filtreye tabidir
  - **Varsayılan (ilk açılış):** Bu Ay, tüm kategoriler — diğer sekmelerle tutarlı bir başlangıç noktası

### 6.1.2 Grafikler Sekmesi (12 Eylül 2026)

- Prototipin kendi "Grafikler" sekmesinin v1'e taşınmış hali: kendine ait, Genel Bakış'tan tamamen **bağımsız bir zaman aralığı filtresi** (kendi state'i, kendi Zaman Aralığı sheet'i) ve üç grafik — bar chart (kategoriye göre harcama), pie chart (kategori dağılımı) ve radar chart (kategori ağırlık haritası)
- Bar chart, Genel Bakış'takiyle **aynı bileşen** (`CategoryBarChart.tsx`) — tasarruf segmenti, bara dokununca Harcama Ekle açma davranışı dahil, birebir aynı. Tek fark: hangi tarih aralığının verisini gösterdiği (kendi bağımsız filtresi)
- Pie chart, daha önce Genel Bakış'tan kaldırılmış olan tekli donut görünümün (bkz. Bölüm 7 tablosu) bu sekmede yeniden kullanılmış hali
- Radar chart, aynı `CategoryRadarChart.tsx` bileşeni ve aynı kural (en az 3 kategoride harcama yoksa gizlenir). **12 Eylül 2026, 2. revizyon:** ilk eklendiğinde Genel Bakış'ta da tutulmuştu, ama iki ekranda aynı grafiğin senkronize olmayan iki farklı tarih aralığıyla görünmesi kafa karıştırıcı bulunduğundan Genel Bakış'tan kaldırıldı — artık **yalnızca Grafikler'de** var

**Netlik notu (11 Eylül 2026):** TopBar'daki "Dışa Aktar" ve "Paylaş" ikonları **ayrı akışlar değildir** — ikisi de aynı ExportSheet'i ("Rapor Önizleme") açar. Kullanıcı, sheet içindeki İndir ya da Paylaş butonundan hangisini kullanacağına orada karar verir (bkz. Bölüm 5.3).

### 6.2 Tablet Ara Durumu (768–1023px)

Navigasyon mobildeki gibi kalır (alt tab bar + FAB + bottom sheet) — bu aralıktaki cihazlar çoğunlukla hâlâ dokunmatik ve tek/iki elle kullanılıyor, bottom nav doğal kalıyor. Tek fark: içerik sütunu artık tam genişlik uçtan uca değil, ortalanmış ve kenar boşlukları artırılmış — mobildeki "uçlara yapışık kart" hissi yerine daha "oturmuş" bir görünüm.

### 6.3 Masaüstü Düzeni (≥1024px)

Bu genişlikte navigasyon ve ikincil etkileşim kalıpları köklü biçimde değişir:

- **Sol sabit kenar menü (sidebar)**, alt tab bar + FAB'ın yerini alır: üstte WALLT logosu, altında Genel Bakış / Son Hareketler / İstatistikler nav öğeleri (prototipte sidebar hiç yok — bu üç öğenin dikey listesi tamamen WALLT'a özgü, önceki iki öğeli listenin doğal genişlemesi), altta normal boyutta bir **"+ Harcama Ekle"** butonu (artık yüzen bir daire değil, sidebar'a ait standart bir buton)
- Üst bar, sidebar'ın yanındaki içerik sütununun üstünde ince bir şerit olarak kalır; sadece ikon-butonları taşır (Dışa Aktar, Paylaş, Çıkış Yap) — uygulama adı artık sidebar'da olduğu için tekrar edilmez
- Tüm bottom sheet'ler (Harcama Ekle, Zaman Aralığı, Rapor Önizleme) bu genişlikte **ortalanmış modal diyalog** olarak açılır — alttan kaymaz, ekranın ortasında belirir (grabber/swipe-to-dismiss ipucu kalkar, çünkü bu artık bir dokunmatik jest değil)
- İçerik sütunu ortalanır ve maksimum bir genişlikte sınırlanır — aşırı geniş monitörlerde grafiklerin/metnin uçlara yapışmasını önlemek için
- 1280px ve üzerinde, Genel Bakış'taki grafik kartları (yer varsa) tek sütun yerine iki sütunlu bir ızgarada yan yana gösterilebilir — bu netleştirilecek bir iyileştirmedir, v1 için zorunlu değildir

## 7. Görselleştirme Gereksinimleri

| Grafik Tipi | Davranış | Not |
|---|---|---|
| Bar Chart | Kategoriye göre harcama dağılımı; kullanıcı harcama yaptıkça ilgili bar büyür | Genel Bakış'ta ve Grafikler'de (12 Eylül 2026, aynı bileşen — bkz. 6.1.2) — seçili dönemde bir kategoride tasarruf > 0 ise, o kategorinin barının ucuna stacked bir "tasarruf segmenti" eklenir (bkz. 7.2). **11 Eylül 2026 eklentisi:** Bir kategori barına dokunmak/tıklamak, o kategori önceden seçili olarak Harcama Ekle sheet'ini açar — prototipte "bir bara dokunarak o kategoriye harcama ekleyebilirsin" ipucuyla belirtilen davranış artık uygulamada da var. Tasarruf segmenti bu davranışa dahil değildir (bkz. 7.2). |
| Pie Chart | Kategori bazlı oransal dağılım | Yalnızca Grafikler'de (12 Eylül 2026) — Genel Bakış'taki (11 Eylül 2026'da kaldırılmıştı) ve İstatistikler'deki iç içe halka (12 Eylül 2026'da tamamen kaldırıldı) karşılığı değil, tekli bir donut; bkz. 6.1.2 |
| Pareto / Histogram | Kategorileri harcama büyüklüğüne göre sıralayıp kümülatif etkiyi %80 referans çizgisiyle gösterir | Yalnızca İstatistikler'de, dönem karşılaştırmalı olarak (bkz. 7.1) — Genel Bakış'taki tekli görünüm 11 Eylül 2026'da kaldırıldı, aynı gerekçeyle |
| Radar / Ağırlık Haritası | Her kategorinin harcamasını, o dönemde harcaması olan kategorilerin ortalamasına göre konumlandırır | Yalnızca Grafikler'de (12 Eylül 2026, 2. revizyon) — ilk eklendiğinde Genel Bakış'ta da tutulmuştu ("iki yerde de kalsın" kararı), ama iki ekranda aynı grafik türünün senkronize olmayan iki farklı tarih aralığıyla görünmesi kafa karıştırıcı bulunduğundan Genel Bakış'tan kaldırıldı, bkz. 6.1.2. Yalnızca seçili dönemde en az 3 kategoride harcama varsa gösterilir, aksi halde gizlenir |
| Renk Kodlama | Her kategori sabit bir renkle temsil edilir, tüm grafiklerde ve chip'lerde tutarlı | Genel |

### 7.1 Dönem Karşılaştırma (Overplot) — İstatistikler Ekranı

**12 Eylül 2026 revizyonu:** İç içe halka (nested pie) görselleştirmesi tamamen kaldırıldı — gruplu bar ve çift pareto çizgisi, dönem karşılaştırmasını zaten yeterince kapsıyor, yerine yeni bir şey eklenmedi.

Prototipte doğrulanan, kalan çözüm:
- **Bar chart:** İki dönem (Dönem A / Dönem B), her kategori için yan yana gruplu bar olarak gösterilir
- **Pareto:** İki dönemin barları yan yana, kümülatif % çizgileri (her dönem kendi toplamına göre) aynı eksende, Dönem A düz çizgi / Dönem B kesikli çizgi ile ayrıştırılır

Dönem A ve Dönem B, ayrı renk kodları taşır (Dönem A = sıcak turuncu, Dönem B = turkuaz) ve bu iki renk kategori renklerinden bağımsız, sadece dönem karşılaştırma bağlamında kullanılır.

Üç istatistik kartı (Dönem A toplamı / Dönem B toplamı / Fark %) grafiklerin üzerinde her zaman görünür durur.

**12 Eylül 2026, 2. revizyon — Pareto sağ ekseni, adaptif tarih çözünürlüğü:** Pareto grafiğinin sağ ekseni, Dönem A'da o kümülatif yüzdeye hangi tarihte ulaşıldığını gösterir (yalnızca Dönem A takip edilir — Dönem B ile hizalama gerekmez). Çözünürlük, Dönem A'nın uzunluğuna göre otomatik seçilir, çünkü sabit günlük çözünürlük uzun dönemlerde (örn. 1 yıl) eksende yüzlerce okunaksız tik üretir:
- Dönem ≤ 2 hafta → gün bazında (örn. "15 Eyl")
- Dönem > 2 hafta ve ≤ 3 ay → hafta bazında (bucket'ın son günü, örn. "15 Eyl")
- Dönem > 3 ay ve ≤ 12 ay → ay bazında (yalnızca ay adı, örn. "Eyl")
- Dönem > 1 yıl → dönem 10 eşit zaman dilimine bölünür, her dilim sınırının tarihi gösterilir

Grafiğin altında, o an hangi çözünürlüğün aktif olduğunu belirten küçük bir not bulunur (örn. "Sağ eksen: Bu Ay döneminde günlük çözünürlük"). Bkz. Teknik Analiz Dokümanı Bölüm 5.5.

### 7.2 Tasarruf Görselleştirmesi

- Seçili dönemde toplam tasarruf > 0 ise, Genel Bakış'ta hero tutarın altında ayrı bir **tasarruf özet kartı** gösterilir (yeşil vurgu, toplam tasarruf tutarı)
- **12 Eylül 2026 revizyonu:** Tasarruf, kategori bar chart'ının **sonuna ayrı bir bar olarak eklenmez** — her kategorinin kendi tasarruf tutarı, o kategorinin harcama barının **ucuna eklenen stacked bir segment** olarak gösterilir (hangi kategoriden tasarruf edildiği `AddExpenseSheet`'te zaten seçiliyor, bkz. Bölüm 5.4). Bu segment **ilgili kategorinin kendi rengini** kullanır (sabit bir "tasarruf yeşili" değil — hangi kategoriden tasarruf edildiği renkten de anlaşılır), ama yarı transparan dolgu, hafif bir shimmer/parlama animasyonu ve kesikli (dashed) kenarlıkla normal harcama segmentinden görsel olarak net ayrışır ve **tıklanamaz** (harcama segmentinin aksine harcama ekleme akışını tetiklemez). Bir kategoride hiç harcama yoksa ama tasarruf varsa (örn. o dönem hiç Ulaşım harcaması yapılmadı ama Ulaşım'dan tasarruf edildi), segment yine de o kategorinin (sıfır genişlikteki) barına eklenir.
- Son Hareketler listesinde tasarruf girişleri "Tasarruf" etiketiyle ve tutarın başında "+" işaretiyle ayrıştırılır
- Tasarruf, hiçbir grafikte (bar, pie, pareto, radar) kategori **toplamlarına** dahil edilmez — hero tutarı, bar'ın "harcama" kısmının uzunluğu, pareto/radar hesaplamaları yalnızca harcamalardan hesaplanır; tasarruf yalnızca kendi özet kartında ve bar chart'taki segmentinde görünür

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
| 2 | Dönem karşılaştırmada pie chart overplot nasıl çözülecek? | ✅ Çözüldü — önce iç içe halka (Dönem A iç, Dönem B dış) ile, **12 Eylül 2026'da bu görselleştirme tamamen kaldırıldı** (gruplu bar + çift pareto çizgisi yeterli görüldü, yerine bir şey eklenmedi) |
| 3 | Veri nerede saklanacak — local mı, cloud mu? | ✅ Çözüldü — Supabase (cloud), kullanıcı hesabına bağlı (bkz. Bölüm 10) |
| 4 | Offline kullanım desteklenecek mi? | ✅ Çözüldü — Hayır, v1 kapsamında değil (Supabase internet bağlantısı gerektirir) |
| 5 | Zaman dilimi (timezone) sınır durumları nasıl ele alınacak? | ⏳ Açık — Teknik Analiz Dokümanı'nda risk olarak işaretlendi |
| 6 | PDF export hangi teknik yolla üretilecek? | ✅ Çözüldü — `@react-pdf/renderer`, gerçek indirilebilir/paylaşılabilir dosya (bkz. Bölüm 5.3, Teknik Analiz Bölüm 9) |
| 7 | Genel Bakış / İstatistikler ayrı route mu, tek sayfa client state mi? | ⏳ Açık — v1 için tek sayfa öneriliyor |

## 13. Kapsam Dışı Bırakılan Riskler / Notlar

- Manuel giriş modeli, kullanıcı disiplinine bağımlı — düşük "adherence" riski
- Pareto/histogram gibi ileri analiz özellikleri ortalama kullanıcı için karmaşık gelebilir — onboarding'de basit tutulmalı
- ~~Local-first kalıcılık tercih edilirse, kullanıcı cihaz değiştirdiğinde veri kaybı riski vardır~~ — Bölüm 10'daki Supabase kararıyla bu risk ortadan kalktı
- **Yeni risk (Supabase kararıyla geldi):** Uygulama artık internet bağlantısı zorunlu kılıyor; hedef kullanıcı profili "mobil, her yerde hızlı giriş" olduğundan (Bölüm 3) zayıf bağlantılı ortamlarda giriş/kayıt sürtünmesi kullanıcı deneyimini etkileyebilir — launch öncesi değerlendirilmeli

## 14. Faz Planı

| Faz | Kapsam | Platform |
|---|---|---|
| MVP (v1) | Manuel giriş (modal), hybrid kategori, bar/pie/pareto/radar chart, tasarruf takibi, **email+şifre ile kimlik doğrulama ve Supabase ile bulut tabanlı veri saklama**, PDF export, paylaş butonu, **responsive navigasyon (mobil: alt tab bar/FAB/bottom sheet, masaüstü ≥1024px: sidebar/modal — bkz. Bölüm 6)** | Web (Next.js), PWA desteğiyle |
| v1.1 | İstatistikler ekranı — üç grafikte de dönem overplot | Web |
| v2 | Bildirimler/hatırlatma sistemi | Web |
| v3 | Native geçiş tetikleyicilerinden biri gerçekleştiğinde: React Native/Expo (EAS Build) ile iOS + Android | Native (RN/Expo) |
| v4+ | Open banking değerlendirmesi, ortak cüzdan | Native |

> **Not:** Kullanıcı hesabı + bulut senkronizasyonu önceki taslakta v2'ye planlanmıştı; PM kararıyla v1'e alındı (bkz. Bölüm 10).

Uygulama içi build fazları (kod seviyesinde) için **Teknik Analiz Dokümanı Bölüm 6**'daki 11 fazlık plana bakınız.
