# X Auto Like & Retweet

X (Twitter) üzerinde takip ettiğiniz hesapların veya belirlediğiniz anahtar kelimeleri içeren tweetleri otomatik olarak beğenen ve retweet eden Chrome eklentisi.

---

## Özellikler

- **Hesap Bazlı Filtreleme** — Belirli kullanıcıların tweetlerini otomatik olarak işler
- **Kelime Bazlı Filtreleme** — Belirlediğiniz kelimeleri içeren tweetleri otomatik olarak işler
- **Otomatik Beğen** — Eşleşen tweetleri otomatik beğenir
- **Otomatik Retweet** — Eşleşen tweetleri otomatik retweet eder
- **Otomatik Mod** — Sayfada gezinirken ve scroll yaparken arka planda çalışır
- **Otomatik Scroll** — Sayfayı otomatik olarak aşağı kaydırır; hız 5 kademede ayarlanabilir
- **Manuel Tarama** — Anlık tarama başlatma imkânı sunar
- **Sayfa İçi Hızlı Ekleme** — Tweet üzerindeki **(+)** butonuyla hesabı tek tıkla listeye ekler
- **Tekrar İşleme Koruması** — Daha önce beğenilen/retweet edilen tweetler yeniden işlenmez
- **Doğal Tıklama Simülasyonu** — Spam algılanmaması için mouse event'leri simüle edilir
- **Rastgele Bekleme Süresi** — İşlemler arasında 2–5 saniyelik rastgele gecikme uygulanır
- **Otomatik Senkronizasyon** — Hesap ve kelime listeleri popup ile sayfa arasında anlık senkronize edilir

---

## Kurulum

1. [**Son sürümü indir**](https://github.com/ahmetozmtn/x-like-extionsion/releases/latest)
2. ZIP dosyasını bir klasöre çıkart
3. Chrome'da `chrome://extensions` adresine git
4. Sağ üstten **Geliştirici modu**'nu aç
5. **Paketlenmemiş öğe yükle**'ye tıkla
6. Çıkarttığın klasörü seç

> **Not:** Eklenti yalnızca `x.com` ve `twitter.com` adreslerinde çalışır.

---

## Kullanım

### Hesap Ekleme

**Yöntem 1: Popup üzerinden**

1. Tarayıcı araç çubuğundaki eklenti ikonuna tıklayın
2. **Hesap Ekle** alanına kullanıcı adını yazın (örn: `username` ya da `@username`)
3. **Ekle** butonuna tıklayın

**Yöntem 2: Tweet üzerinden (Hızlı Ekleme)**

1. X ana sayfasında herhangi bir tweete gidin
2. Kullanıcı adının yanında beliren **(+)** butonuna tıklayın
3. Hesap otomatik olarak listeye eklenir; tekrar tıklayarak listeden çıkarabilirsiniz

---

### Kelime Ekleme

1. Popup'ta **Kelime Ekle** alanına izlemek istediğiniz kelimeyi yazın
2. **Ekle** butonuna tıklayın
3. Bu kelimeyi içeren tweetler, hangi hesaptan geldiğinden bağımsız olarak işlenir

> Hem hesap hem de kelime eşleşmesi aynı anda çalışabilir. Bir tweet ya hesap listesindeki bir kullanıcıdan geliyorsa ya da kelime listesindeki bir ifadeyi içeriyorsa işleme alınır.

---

### Ayarlar

| Ayar | Açıklama | Varsayılan |
|---|---|---|
| ❤️ Otomatik Beğen | Eşleşen tweetleri otomatik beğenir | Açık |
| 🔁 Otomatik Retweet | Eşleşen tweetleri otomatik retweet eder | Kapalı |
| ⚡ Otomatik Mod | Scroll ve DOM değişikliklerini izleyerek otomatik tarar | Açık |
| ↕️ Otomatik Scroll | Sayfayı otomatik olarak aşağı kaydırır | Kapalı |

Otomatik Scroll açıldığında **Scroll Hızı** kaydırıcısı görünür hale gelir:

| Kademe | Etiket | Gecikme | Kaydırma |
|---|---|---|---|
| 1 | Çok Yavaş | 4–6 sn | 80–150 px |
| 2 | Yavaş | 2–3.5 sn | 150–280 px |
| 3 | Normal | 0.9–1.8 sn | 280–450 px |
| 4 | Hızlı | 0.4–0.9 sn | 400–580 px |
| 5 | Çok Hızlı | 0.15–0.4 sn | 520–720 px |

> Otomatik Scroll aktifken tweet işleme sırasında sayfa kaydırması duraklatılır; işlem tamamlanınca devam eder.

---

### Manuel Tarama

Popup'taki **🔍 Şimdi Tara** butonuna tıklayarak sayfadaki mevcut tweetleri anında tarayabilirsiniz. Aktif X/Twitter sekmesi otomatik olarak algılanır.

---

### Durum Göstergesi

Popup başlığının sağ üst köşesindeki **Aktif / Pasif** göstergesi:

- **Aktif** — En az bir hesap veya kelime eklenmiş ve en az bir işlem (beğen/retweet) açık
- **Pasif** — Hesap/kelime listesi boş ya da tüm işlemler kapalı

---

## Proje Yapısı

```
x-like-extionsion/
├── manifest.json           # Chrome eklenti manifesti (Manifest V3)
├── icons/                  # Eklenti ikonları (16, 48, 128 px)
├── background/
│   └── background.js       # Service Worker — veri yönetimi, sekme izleme, mesajlaşma
├── content/
│   ├── content.js          # İçerik betiği — timeline tarama, beğeni/retweet, buton enjeksiyonu
│   └── content.css         # Sayfa içi eklenti UI stilleri (hızlı ekleme butonu, toast)
└── popup/
    ├── popup.html          # Eklenti popup arayüzü
    ├── popup.js            # Popup mantığı — hesap/kelime/ayar yönetimi
    └── popup.css           # Popup stilleri
```

---

## Teknik Detaylar

| Özellik | Detay |
|---|---|
| Manifest Sürümü | V3 |
| İzinler | `storage`, `activeTab` |
| Depolama | `chrome.storage.sync` (cihazlar arası senkronizasyon) |
| Tarama Tetikleyicisi | MutationObserver (debounced) + scroll event |
| Tıklama Yöntemi | MouseEvent simülasyonu (mousedown → mouseup → click) |
| İşlemler Arası Gecikme | 2.000–5.000 ms rastgele |
| Tweet Tekrar Koruması | İşlenmiş tweet ID'leri Set veri yapısında tutulur (max 500) |
| Otomatik Scroll | `window.scrollBy` + hız kademeli rastgele gecikme |
| Sürüm Yayınlama | GitHub Actions ile otomatik (`manifest.json` sürümü değişince) |

---

## Geliştirme

Kaynak koddan yüklemek için:

```sh
git clone https://github.com/ahmetozmtn/x-like-extionsion.git
```

1. `chrome://extensions` adresine git
2. **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → klonlanan klasörü seç

Herhangi bir derleme adımı gerekmez; tüm dosyalar doğrudan tarayıcı tarafından yüklenir.

---

## Sürüm Geçmişi

| Sürüm | Değişiklikler |
|---|---|
| v0.3.0 | Otomatik Scroll ve ayarlanabilir hız kaydırıcısı (5 kademe) |
| v0.2.1 | Kelime bazlı filtreleme, karışık eşleşme desteği |
| v0.2.0 | Otomatik Mod, scroll tabanlı tarama, MutationObserver |
| v0.1.0 | İlk sürüm — hesap bazlı beğeni ve retweet |

---

## Lisans

[MIT](LICENSE)