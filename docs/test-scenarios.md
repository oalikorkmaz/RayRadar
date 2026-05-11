# Tren Izleme Manuel Test Senaryolari

## 1. Temel Akis

- 1.1 Yeni tren eklenir ve aktif listede gorunur.
- 1.2 Geri sayim her saniye azalir, hat uzerindeki ikon ilerler.
- 1.3 Manuel `Vardi` islemi treni tarihceye alir ve alarm calmaz.
- 1.4 `Duzenle` ile rota veya sure degistirilir, geri sayim yeniden baslar.
- 1.5 `Sil` onay ister, onaylaninca tren tarihceye `Silindi` olarak gecer.
- 1.6 Tarihce sekmesi son 24 saat kayitlarini yeniden eskiye listeler.

## 2. Dogrulama

- 2.1 Tren no 4 hane girilince kayit reddedilir.
- 2.2 Tren no icinde harf girilince kayit reddedilir.
- 2.3 Kalkis ve varis ayni secilince kayit reddedilir.
- 2.4 Sure 0, negatif veya 999 uzeri girilince kayit reddedilir.
- 2.5 Ayni tren no aktif listede varken onay modal/confirm gorunur.

## 3. Sure Ogrenme

- 3.1 Ilk kez secilen rota icin sure onerisi bos gelir.
- 3.2 Tren kaydedilince `segmentTimes` ilgili rota icin guncellenir.
- 3.3 Ayni rota tekrar secilince onceki sure yardim metni olarak gorunur.
- 3.4 Yeni sure kaydedilince sonraki oneride yeni deger gelir.

## 4. Pazarcik Uyarilari

- 4.1 Pazarcik varisli 4 dk tren eklendiginde 3 dk esiginde on uyari banner'i gorunur.
- 4.2 0 dk varista tren tarihceye gecer, kirmizi banner ve ses tetiklenir.
- 4.3 Mobil cihazda titresim ayari acikken titresim denenir.
- 4.4 Manuel `Vardi` alarm tetiklemez.
- 4.5 Bildirim izni reddedilirse ekran banner'i ve ses akisi devam eder.

## 5. Cakisma

- 5.1 Zit yonlu iki tren ayni segmentteyse segment kirmizi yanar ve banner gorunur.
- 5.2 Ayni yonlu iki tren icin cakisma uyarisi gorunmez.
- 5.3 Yeni tren eklerken olasi cakisma varsa onay istenir.

## 6. Kalicilik

- 6.1 Sayfa yenilenince aktif trenler korunur.
- 6.2 Tarayici kapat/aç sonrasi kalan sure gercek zamana gore azalir.
- 6.3 Suresi gecmis trenle acilista stale modal gorunur.
- 6.4 `Hepsini Tarihceye Ekle` trenleri tarihceye alir.
- 6.5 `Hepsini Yoksay` trenleri aktif listeden kaldirir.

## 7. PWA ve Cihaz

- 7.1 Chrome/Edge manifest alanlari dogru gorunur.
- 7.2 Service Worker kaydolur ve temel dosyalari cache'ler.
- 7.3 Uygulama masaustunde kurulabilir gorunur.
- 7.4 Android Chrome ile ana ekrana eklenebilir.
- 7.5 Offline acilista ana uygulama yuklenir.
- 7.6 Telefon genisliginde hat yatay kayar, liste tek kolon olur.
- 7.7 Genis ekranda hat ve liste iki kolon olur.

## 8. Edge Case

- 8.1 5+ tren ile kartlar ve hat gorunumu okunabilir kalir.
- 8.2 Pazarcik'a tam varis aninda yenileme stale modal veya tarihce akisini bozmaz.
- 8.3 Bozuk LocalStorage uygulamayi varsayilan veriyle baslatir.
- 8.4 Cihaz saati degisirse geri sayim Date.now tabanli olarak yeniden hesaplanir.

## 9. Ilk Acilis

- 9.1 Temiz LocalStorage ile `Sistemi Baslat` ekrani gorunur.
- 9.2 Tiklayinca ses kilidi acilir, bildirim izni istenir, test titresimi denenir.
- 9.3 Bildirim reddinde bilgilendirme metni gorunur.
- 9.4 Ikinci acilista ilk acilis ekrani atlanir.
- 9.5 LocalStorage temizlenince ilk acilis ekrani tekrar gorunur.
