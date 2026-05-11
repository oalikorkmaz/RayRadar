# Tren İzleme Simülasyonu — Tasarım Belgesi

**Tarih:** 2026-05-04
**Sürüm:** V1
**Durum:** Onaylanan tasarım — uygulamaya hazır

---

## 1. Sistem Genel Bakış

### Amaç
Tek hatlı tren güzergahında trenlerin gerçek zamanlı görsel takibi ve çakışma uyarısı. Pazarcık istasyon görevlisinin yaklaşan trenleri görmesini, kazaları önlemesini ve varışlarda sesli/görsel uyarı almasını sağlar.

### Birincil Kullanıcı (V1)
Pazarcık istasyonu görevlisi. Tek cihaz, tek operatör. İnternet gerekmez.

İzlenen istasyon **ayarlardan değiştirilebilir** olmalı (V2'de farklı istasyonlar için kullanım).

### Platform
PWA (Progressive Web App):
- PC tarayıcı (Chrome, Edge) — "Yükle" ile masaüstü uygulaması gibi
- Android telefon ve tablet — "Ana ekrana ekle" ile uygulama gibi
- Çevrimdışı çalışır (Service Worker ile)
- Cihazlar arası senkronizasyon **yok** (her cihazda yerel veri)

### Birincil Değer
1. Hattaki tüm trenleri tek bakışta görmek
2. Zıt yön çakışma riski uyarısı (önceden + anlık)
3. Pazarcık varış sesli/görsel uyarısı (kilit ekranında bile)

---

## 2. Hat (Line) Topolojisi

9 durak, batı→doğu sırasıyla:

```
TÜRKOĞLU — KÖPRÜAĞZI — NARLI — DEHLİZ — PAZARCIK — AKSU — HAYDARLI — ÇELİK — GÖLBAŞI
   (0)        (1)       (2)     (3)       (4)      (5)     (6)        (7)     (8)
```

- 8 segment, her biri **tek hat**
- Aynı segmentte zıt yönlü iki tren = çakışma riski
- Pazarcık (indeks 4) — V1'de izlenen istasyon (vurgulu görselleştirme)

### Yön Çıkarımı
Yön, kalkış ve varış istasyonlarının **hat indeksleri** karşılaştırılarak otomatik belirlenir:
- `to.index > from.index` → **doğu** yönü
- `to.index < from.index` → **batı** yönü
- `from = to` → form doğrulama hatası

---

## 3. Veri Modeli

### Tren (Train)
```javascript
{
  id: "uuid-...",                  // benzersiz iç ID
  trainNumber: "46500",            // tam 5 haneli rakam (operatör görür)
  fromStation: "NARLI",            // 9 duraktan biri
  toStation: "PAZARCIK",           // kalkıştan farklı
  startedAt: 1746381600000,        // kayıt anı (Date.now())
  durationMin: 11,                 // toplam yolculuk süresi (dakika)
  status: "active" | "arrived" | "deleted" | "manual_arrived",
  arrivedAt: null | 1746382260000, // tarihçe için
  preWarningFired: false           // önceden uyarı tetiklendi mi
}
```

### Segment Süre Hafızası
```javascript
{
  "NARLI->PAZARCIK": 11,
  "PAZARCIK->NARLI": 12,
  "AKSU->PAZARCIK": 11,
  ...
}
```
- Yön bazlı (asimetrik)
- Tek değer tutar (en son girilen) — ortalama V2'de

### LocalStorage Şeması
Tek anahtar altında JSON:

```javascript
localStorage["tren-izleme:v1"] = {
  schemaVersion: 1,
  firstLaunchCompleted: true,    // ses/bildirim izinleri alındı mı
  settings: {
    preWarningMinutes: 3,
    soundEnabled: true,
    vibrationEnabled: true
  },
  activeTrains: [...],
  history: [...],          // son 24 saat
  segmentTimes: {...}
}

> **Not:** `watchedStation` V1'de `constants/config.js`'te sabittir (`"PAZARCIK"`). V2'de buraya taşınacak.
```

### Tren Yaşam Döngüsü (lifecycle)
1. **active** — kayıttan sonra, geri sayım çalışıyor
2. **arrived** — 0 dk'ya ulaştı, alarm tetiklendi (otomatik)
3. **manual_arrived** — operatör elle "vardı" işaretledi (alarm yok)
4. **deleted** — operatör sildi

`active` dışındakiler `history` dizisine geçer (son 24 saat).

---

## 4. Kullanıcı Akışları

### 4.1 Tren Ekleme
1. Operatör "**+ Yeni Tren**" butonuna tıklar
2. Form modal açılır:
   - **Tren No** (5 haneli rakam, anlık doğrulama)
   - **Kalkış Durağı** (dropdown, 9 durak)
   - **Varış Durağı** (dropdown, kalkıştan farklı 8 durak)
   - **Süre (dakika)**
3. **Süre alanı önerisi:** Önceki girişte aynı `kalkış→varış` çifti girildiyse o değer placeholder olarak gösterilir; yoksa boş.
4. Operatör kaydet'e basar.
5. Doğrulamalar (bkz. 7.1):
   - Format hataları → kaydet pasif kalır, hata mesajı görünür
   - Aynı tren no aktifte → onay modal: "46500 zaten takipte. Yine de eklensin mi?"
   - Çakışma riski algılanırsa → onay modal: "⚠️ Bu tren ~7 dk sonra Tren 32100 ile Dehliz–Pazarcık arasında karşılaşabilir. Yine de eklensin mi?"
6. Geçerse:
   - Tren `active` listesine eklenir
   - `segmentTimes[from->to] = durationMin` güncellenir
   - Hat görselinde tren ikonu belirir, geri sayım başlar
   - LocalStorage'a yazılır

### 4.2 İzleme (Pasif)
- **Hat görseli** üst yarıda, trenler ikonlar olarak gerçek zamanlı ilerler
- **Pozisyon** (her saniye güncellenir):
  ```
  ilerleme = (Date.now() - startedAt) / (durationMin * 60_000)  // 0..1
  pozisyon = fromIndex + ilerleme * (toIndex - fromIndex)
  ```
- **Kart listesi** alt yarıda, her aktif tren bir kart:
  - Tren No, Kalkış→Varış, kalan dakika, yön oku
  - ≤3 dk → kırmızı/turuncu vurgu
  - Eylemler: ✏️ Düzenle, ✓ Vardı, 🗑 Sil

### 4.3 Düzenleme
- Karttan **✏️ Düzenle** → form mevcut değerlerle açılır
- Operatör değiştirir, kaydeder
- `startedAt` = şimdi (yeni süre baz alınır)
- Geri sayım yenilenir
- `segmentTimes` güncellenir

### 4.4 Manuel "Vardı"
- Karttan **✓ Vardı** → tren `manual_arrived` olur, `arrivedAt` = şimdi
- Tarihçeye geçer, **alarm çalmaz**
- Aktif listeden kalkar

### 4.5 Silme
- Karttan **🗑 Sil** → onay sorulur ("Tren 46500 silinsin mi?")
- Onaylanırsa `deleted` olur, tarihçeye geçer
- Aktif listeden kalkar

### 4.6 Otomatik Varış (Alarm)
Geri sayım 0'a düştüğünde:
- Tren `arrived` olur, `arrivedAt` = şimdi
- **Pazarcık varışıysa**: ses + bildirim + titreşim + ekran banner (bkz. 5.B)
- **Diğer istasyon varışıysa**: sessizce tarihçeye geçer (V1'de sadece Pazarcık alarmı; izlenen istasyon ayarı V2'de etkin olur)

### 4.7 Önceden Uyarı (Pazarcık)
Tren Pazarcık'a varmaya **N dk** kala (varsayılan 3, ayarlardan değişir):
- `preWarningFired = false` ise tetikle, sonra `true` yap (tekrar etmesin)
- Hafif "ding" + turuncu banner + tarayıcı bildirimi + hafif titreşim
- Tren ikonu kırmızıya döner

### 4.8 Uygulama Yeniden Açılışı
1. LocalStorage oku → schema sürüm kontrol
2. `activeTrains` süz: her tren için kalan süre hesapla
3. `kalan ≤ 0` (kapalıyken varış olmuş) varsa modal aç:
   ```
   Bu trenlerin süresi geçmiş:
     • 46500 (Narlı→Pazarcık) — 12 dk önce
     • 32100 (Aksu→Pazarcık)  — 5 dk önce
   Tarihçeye eklensin mi?
   [Hepsini Ekle] [Tek Tek] [Yoksay]
   ```
4. Sonuca göre tarihçeye al/yoksay
5. Hala kalanı pozitif olanlar normal aktif olarak yüklenir

---

## 5. Çakışma Algılama & Uyarı Sistemi

### A) Çakışma Tespiti (sürekli)

**Her saniye** çalışır:

```
For each aktif tren:
  pozisyon = fromIndex + (geçenSüre / toplamSüre) * (toIndex - fromIndex)

For each segment (i, i+1):
  bu segmentte hangi trenler var?
  yönleri farklı mı? → çakışma riski!
    → segment kırmızı yanıp sön
    → tehlike ikonu segmentin üstünde
    → buluşma anı tahmini hesapla, banner'da göster
```

**Çakışma anı tahmini:**
- İki tren pozisyonu ve hızlarından buluşma zamanı:
  ```
  birleşik_hız = trenA_hız + trenB_hız  (segment/dk cinsinden)
  buluşma_dk = pozisyon_farkı / birleşik_hız
  ```
- "DİKKAT: Tren 46500 ~7 dk sonra Tren 32100 ile Dehliz–Pazarcık arasında karşılaşacak"

### B) Yeni Tren Ön Çakışma Kontrolü
Operatör kaydete bastığında, tren henüz eklenmeden:
- Yeni trenin gelecek rotasını mevcut trenlerle karşılaştır
- Çakışma öngörülürse onay sor
- Operatör yine ekle dese de eklenir, ama uyarı banner gösterilmeye devam

### C) Pazarcık Uyarıları (İki Seviye)

**Önceden uyarı (3 dk önce, ayarlanabilir):**
- Hafif "ding" sesi
- Turuncu banner: "Tren 46500 yaklaşıyor — 3 dk içinde Pazarcık'ta"
- Tarayıcı bildirimi
- Hafif titreşim (200ms)
- Tek seferlik (her tren için bir kez)

**Varış uyarısı (0 dk):**
- Tren düdüğü sesi (3-5 saniye)
- Kırmızı banner: "🚆 Tren 46500 PAZARCIK'TA" (kapatma butonu, kapatılana kadar görünür)
- Tarayıcı bildirimi (kilit ekranında bile)
- Güçlü titreşim (`[500, 200, 500, 200, 500]` ms)
- Hat görselinde Pazarcık üzerinde parlama efekti

### D) Tetikleme API'leri
- **Audio:** `<audio>` ile önceden yüklenmiş `.mp3` dosyaları
- **Notification:** `Notification.requestPermission()` çağrısı
- **Vibration:** `navigator.vibrate(pattern)` — Android'de çalışır, iOS'ta sessizce göz ardı

### E) İlk Açılış Akışı (Autoplay & İzin Yönetimi)

Tarayıcılar kullanıcı etkileşimi olmadan ses çalmayı ve bildirim izni istemeyi engeller. Bu yüzden:

1. Uygulama ilk açıldığında — **eğer hiç aktif tren ve tarihçe yoksa** — ortada büyük bir "**🚆 Sistemi Başlat**" butonu görünür.
2. Kullanıcı bu butona tıklayınca:
   - Sessiz bir test sesi çalınır (`audio.play()` → autoplay unlock)
   - `Notification.requestPermission()` çağrılır
   - Bildirim izni reddedilirse: bir kez "Bildirimler kapalı, ses ve banner ile uyarı verilecek" mesajı gösterilir
   - `Vibration` API varsa hafif test titreşimi (kullanıcıya çalıştığını gösterir)
3. Bu adım tamamlandı bayrağı `localStorage`'a yazılır (`firstLaunchCompleted: true`)
4. Sonraki açılışlarda bu adım atlanır — uygulama doğrudan ana ekrana açılır
5. Eğer izinler sonradan değişirse (kullanıcı tarayıcı ayarlarından kapatırsa), Ayarlar paneli üzerinden tekrar istenebilir

---

## 6. Ekran Düzeni & Görsel

### Genel Düzen (Yatay Bölünmüş)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Tren İzleme — Pazarcık | ⚙ Ayarlar | 🔔 [3]        │
├─────────────────────────────────────────────────────────────┤
│  HAT GÖRSELİ (üst yarı, ~50% yükseklik)                     │
│  TÜRK──KÖPR──NARLI──DEHL──[PAZARCIK]──AKSU──HAYD──ÇELİK──GÖL│
│                  ●→11dk         ←8dk●                       │
│                  46500           32100                      │
├─────────────────────────────────────────────────────────────┤
│  TREN LİSTESİ (alt yarı, ~50% yükseklik)                    │
│  [+ Yeni Tren] | Aktif: 2 | Tarihçe                         │
│  ┌─────────────────────────┐ ┌─────────────────────────┐    │
│  │ 46500     11 dk →       │ │ 32100      8 dk ←       │    │
│  │ Narlı → Pazarcık        │ │ Aksu  → Pazarcık        │    │
│  │ ✏️ ✓ 🗑                  │ │ ✏️ ✓ 🗑                  │    │
│  └─────────────────────────┘ └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Hat Görseli
- 9 durak yatay sıralı, Pazarcık vurgulu (kalın yazı + renkli halka)
- Segmentler: normal=gri, çakışma=kırmızı yanıp sönen
- Tren ikonu:
  - Tren no + kalan dakika üstünde
  - Yön oku (→ veya ←)
  - Renk: doğu=mavi, batı=yeşil
  - ≤3 dk → kırmızı, hafif yanıp sönen
- Aynı segmentte aynı yönde birden fazla tren: dikey kayık çizilir (üst-alt)
- Pozisyon CSS transition ile pürüzsüz hareket eder

### Tren Listesi
- Sekmeler: **Aktif** | **Tarihçe (24 saat)**
- Aktif: kart grid (responsive — mobilde 1 sütun, geniş ekranda 2-3)
  - **Sıralama:** kalan süre küçükten büyüğe (en yakın varış üstte) — en kritik tren her zaman görünürde
- Tarihçe: aynı kart, sönük renkler, geri sayım yerine "✓ Vardı 14:32" / "🗑 Silindi 14:35"
  - **Sıralama:** `endedAt` yeniden eskiye (en son işlem üstte)

### Renk Paleti (Koyu Tema)
- Arkaplan: `#0d1117`
- Hat çizgisi: `#3a4250`
- Pazarcık vurgusu: `#ff8c42`
- Tren — doğu: `#3b82f6` (mavi)
- Tren — batı: `#10b981` (yeşil)
- Yaklaşan uyarı: `#f59e0b` (turuncu)
- Kritik (varış/çakışma): `#ef4444` (kırmızı)
- Metin: `#e6edf3`

### Responsive
- **Geniş ekran (PC, tablet yatay):** yatay bölünmüş düzen (yukarı)
- **Dar ekran (telefon, tablet dikey):** hat görseli üstte yatay scroll edilebilir, liste altta tek sütun
- **Form (modal):** mobilde tam ekran, masaüstünde merkezi
- **Dokunmatik:** butonlar minimum 44×44px

### Bildirim Banner (üstte beliren)
- **Önceden uyarı:** turuncu, 5 sn otomatik kapanır
- **Varış uyarısı:** kırmızı, kapatma butonu, kapatılana kadar görünür
- **Çakışma:** kırmızı yanıp sönen, kapatılana kadar görünür

### Ayarlar Paneli (V1)
- Önceden uyarı süresi (varsayılan: 3 dk, aralık 1–10)
- Ses açık/kapalı
- Titreşim açık/kapalı
- Tarayıcı bildirim izinleri durumu (yenile butonu)
- Tarihçeyi temizle butonu (onay sorulur)

> **Not:** İzlenen istasyon V1'de sabit `PAZARCIK`'tır (kod sabit olarak `constants/config.js`'te tutulur). V2'de ayarlar paneline "İzlenen İstasyon" seçici eklenecek; bu yüzden alarm/uyarı kodu istasyon-bağımsız yazılır (`watchedStation` parametresi her uyarı fonksiyonuna geçirilir).

---

## 7. Doğrulamalar & Hata Yönetimi

### 7.1 Form Doğrulamaları (Anlık)

| Alan | Kural | Hata Mesajı |
|------|-------|-------------|
| Tren No | Tam 5 hane, sadece rakam | "Tren numarası 5 haneli rakam olmalı" |
| Tren No | Aktifte yoksa (uyarı, engel değil) | "46500 zaten takipte. Yine de eklensin mi?" |
| Kalkış Durağı | Boş olamaz | "Kalkış durağı seçin" |
| Varış Durağı | Boş olamaz | "Varış durağı seçin" |
| Kalkış = Varış | Eşit olamaz | "Kalkış ve varış aynı olamaz" |
| Süre | Sayı, 1–999 | "Süre 1–999 dakika arası olmalı" |

Kaydet butonu tüm alanlar geçerli olmadan aktifleşmez.

### 7.2 Çalışma Zamanı Hataları

| Senaryo | Davranış |
|---------|----------|
| LocalStorage kullanılamıyor | Uyarı: "Veriler kaydedilemiyor", RAM'de devam |
| LocalStorage JSON bozuk | "Veriler bozuk, sıfırdan başla", konsola yedek dump |
| Bildirim izni reddedildi | Sessizce geç, ses+banner devam, bir kez bilgilendir |
| Ses dosyası yüklenemedi | Banner+bildirim devam |
| Notification API yok | Ses+banner devam |
| Vibration API yok (iOS) | Sessizce geç |
| Service Worker yüklenemedi | Uygulama çalışır, offline yok |
| Schema uyumsuz | V1'de tek sürüm; V2+ migration |

### 7.3 Saat Tutarlılığı
- Tüm hesaplamalar `Date.now()` üzerinden
- Cihaz saati değişirse: kalan süre yanlış (V1'de uyarı yok, V2'de NTP)
- Sekme arkaplandayken: `setInterval` askıya alınabilir, ama hesaplamalar `Date.now()` ile doğru kalır

---

## 8. Mimari & Kod Organizasyonu

### Klasör Yapısı

```
tren-izleme/
├── index.html
├── manifest.json
├── sw.js
├── README.md
│
├── styles/
│   ├── reset.css
│   ├── base.css
│   ├── header.css
│   ├── track-view.css
│   ├── train-list.css
│   ├── modal.css
│   ├── alerts.css
│   └── responsive.css
│
├── js/
│   ├── main.js                     # giriş noktası
│   │
│   ├── constants/
│   │   ├── stations.js             # 9 durak verisi, indeksler
│   │   └── config.js               # varsayılan ayarlar
│   │
│   ├── models/
│   │   ├── Train.js                # Tren oluştur, kalanı hesapla
│   │   └── Line.js                 # Hat, segment, yön çıkarımı
│   │
│   ├── services/
│   │   ├── storage.js              # LocalStorage CRUD
│   │   ├── time.js                 # şimdi(), kalan dakika
│   │   ├── notification.js         # Notification API
│   │   ├── audio.js                # ses oynatma + autoplay unlock
│   │   ├── vibration.js            # Vibration API
│   │   ├── collision.js            # çakışma tespiti
│   │   └── alerts.js               # uyarı orkestrasyonu
│   │
│   └── ui/
│       ├── App.js                  # ana bileşen, state yönetimi
│       ├── TrackView.js            # üst yarı: hat + trenler
│       ├── TrainList.js            # alt yarı: aktif + tarihçe
│       ├── TrainCard.js            # tek tren kartı
│       ├── TrainForm.js            # ekleme/düzenleme modal
│       ├── AlertBanner.js          # üst banner
│       ├── SettingsPanel.js        # ayarlar
│       └── StaleTrainsModal.js     # açılışta süresi geçmiş trenler
│
└── assets/
    ├── icons/
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   ├── apple-touch-icon.png
    │   ├── train-east.svg
    │   └── train-west.svg
    └── audio/
        ├── pre-arrival.mp3
        └── arrival.mp3
```

### Modül İlişkileri

```
                  ┌─────────────────────┐
                  │     storage.js      │ ← LocalStorage
                  └──────────┬──────────┘
                             │
                   ┌─────────┴─────────┐
                   │      App.js       │  ← Tek doğruluk kaynağı
                   └────┬───┬───┬──────┘
                        │   │   │
       ┌────────────────┘   │   └────────────────┐
       ▼                    ▼                    ▼
  ┌─────────┐         ┌──────────┐        ┌──────────────┐
  │TrackView│         │TrainList │        │ TrainForm    │
  └─────────┘         └──────────┘        └──────────────┘

       Her saniye tick:
         time.js → kalan süre güncelle
         collision.js → çakışma kontrol
         eşik geçildiyse → alerts.js
           → audio + notification + vibration + AlertBanner
         UI yeniden çiz
```

**Anahtar prensip:** `App.js` tek doğruluk kaynağı (state). UI bileşenleri saf (state alır, event yayar). Servisler stateless veya tarayıcı API sarmalayıcısı.

### PWA Bileşenleri

**`manifest.json`:**
```json
{
  "name": "Tren İzleme — Pazarcık",
  "short_name": "Tren İzleme",
  "description": "Tek hatlı tren güzergahı izleme ve uyarı sistemi",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0d1117",
  "theme_color": "#ff8c42",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**`sw.js` (Service Worker):**
- Install: `ASSETS` listesini önbelleğe al
- Fetch: cache-first, yoksa ağ
- `CACHE` versiyonu artırılınca eski cache silinir

### JS Modül Sistemi
- **ES Modules** (`<script type="module">`) — tarayıcı yerel desteği
- Build/bundle yok
- **Üçüncü parti bağımlılık yok** — npm/package.json yok

---

## 9. Geliştirme & Dağıtım

### Geliştirme
1. VS Code + Live Server eklentisi
2. "Go Live" → `http://127.0.0.1:5500/index.html`
3. DevTools > Application sekmesi → PWA testi
4. Chrome DevTools "Toggle device toolbar" ile farklı boyutlar
5. Gerçek Android cihazda aynı Wi-Fi üzerinden `http://192.168.x.x:5500`

### Dağıtım Seçenekleri
- **GitHub Pages** (önerilen — ücretsiz HTTPS, PWA için gerekli)
- Netlify, Vercel, Cloudflare Pages (alternatifler)
- Yerel ağ: PC'de `python -m http.server`, telefon aynı ağda erişir (HTTPS olmadığı için PWA kurulumu olmaz, sadece web olarak çalışır)

### PWA Kurulumu
- HTTPS gereklidir (localhost hariç)
- Chrome/Edge'de adres çubuğunda "Yükle" ikonu belirir
- Android Chrome: "Ana ekrana ekle" banner'ı

---

## 10. Test Yaklaşımı

V1 için **otomatik test yok** (vanilla JS, küçük scope). Yerine **manuel test senaryoları belgesi** (`docs/test-scenarios.md`):

### Senaryolar

**1. Temel Akış**
- 1.1 Yeni tren ekleme
- 1.2 Geri sayım çalışıyor
- 1.3 Manuel "vardı" — alarm çalmıyor
- 1.4 Düzenleme
- 1.5 Silme — onay
- 1.6 Tarihçe sekmesi

**2. Doğrulama**
- 2.1 Tren no 4 hane → hata
- 2.2 Tren no harf → kabul edilmiyor
- 2.3 Kalkış=Varış → hata
- 2.4 Süre 0/negatif → hata
- 2.5 Aynı tren no aktifte → uyarı modal

**3. Süre Öğrenme**
- 3.1 İlk kez seçimde alan boş
- 3.2 Kaydet → segmentTimes güncellendi
- 3.3 Yeni form, aynı çift → öneri görünüyor
- 3.4 Yeni süre gir → öneri güncellendi

**4. Pazarcık Uyarıları**
- 4.1 4 dk → 3 dk geçişinde ön uyarı
- 4.2 0 dk varış: tren düdüğü, banner, bildirim
- 4.3 Mobil titreşim
- 4.4 Manuel "vardı" → alarm çalmadı
- 4.5 Bildirim reddi → ses+banner devam

**5. Çakışma**
- 5.1 Zıt yön aynı segment → uyarı
- 5.2 Aynı yön → uyarı yok
- 5.3 Çakışma onay modalı

**6. Kalıcılık**
- 6.1 Sayfa yenileme → tren korunmuş
- 6.2 Tarayıcı kapat/aç (5 dk) → süre 5 dk azalmış
- 6.3 Süresi geçmiş trenle açılış → modal
- 6.4 "Hepsini Ekle" → tarihçeye
- 6.5 "Yoksay" → kayboldu

**7. PWA & Cihaz**
- 7.1–7.7: PC ve Android'de yükleme, tam ekran, offline, tablet/telefon düzeni

**8. Edge Case'ler**
- 8.1 5+ tren — performans/okunabilirlik
- 8.2 Pazarcık'ta tam vardığında yenileme
- 8.3 Manuel bozuk LocalStorage
- 8.4 Saat değişikliği

**9. İlk Açılış Akışı**
- 9.1 İlk yüklemede "Sistemi Başlat" butonu görünüyor mu
- 9.2 Tıklayınca test sesi çalıyor, bildirim izni isteniyor, titreşim oluyor mu
- 9.3 Bildirim izni reddi → bilgilendirme mesajı çıkıyor mu
- 9.4 İkinci açılış → buton görünmüyor, doğrudan ana ekran
- 9.5 LocalStorage temizlenip tekrar açılırsa → buton tekrar görünüyor

---

## 11. Bilinen Sınırlamalar (V1)

Aşağıdakiler V1 kapsamı dışında — bilinçli olarak V2/sonrası bırakıldı:

- Cihazlar arası senkronizasyon **yok** (tasarım gereği)
- Pazarcık çoklu yol detayı (2.yol, 3.yol, 4.yol, 540/570m) **yok** (V2)
- Tren sayısı 5+ olunca hat sıkışıklığı (V2'de zoom/scroll)
- iOS titreşim çalışmaz (browser sınırlaması)
- Cihaz saati değişirse hesaplama yanlış (V1'de uyarı yok; V2'de NTP/sunucu saati)
- Süre öğrenme tek değer tutar (ortalama veya çoklu geçmiş V2)
- Sesli mesaj (TTS) yok — ses dosyası kullanılıyor
- Uyarı sadece Pazarcık için (izlenen istasyon ayarı V2'de etkin)
- Otomatik test yok (manuel senaryolar var)

---

## 12. Sonraki Adımlar

1. Bu spec onayı sonrası → **superpowers:writing-plans** skill'i ile uygulama planı yazılır (adım adım iş kırılımı)
2. Plan onayı sonrası → **superpowers:executing-plans** ile uygulama
3. Geliştirme tamamlanınca → **superpowers:finishing-a-development-branch** ile bitiş

---

**Belge sonu**
