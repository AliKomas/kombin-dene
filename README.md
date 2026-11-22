# kombin.dene — Sanal Kıyafet Deneme Sitesi

Kullanıcı kendi fotoğrafını yükler, herhangi bir mağazadan (Trendyol, Zara, Amazon…) 5 parçaya kadar kıyafet ekler (üst, alt, ceket, ayakkabı, aksesuar). Yapay zekâ hepsini **tek kombin** olarak kişinin üzerine giydirir, istenirse **360° dönen video** oluşturur.

| İşlem | Model (fal.ai) | Yaklaşık ücret |
|---|---|---|
| Kombin fotoğrafı | `fal-ai/nano-banana/edit` (Google Gemini) | ~0,04 $ |
| 360° video (5 sn) | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` | 0,35 $ |

## Nasıl çalışır?

```
Tarayıcı (index.html)
   │  1) fotoğraflar küçültülür, /api/tryon'a gönderilir
   ▼
Vercel sunucu fonksiyonu (api/tryon.js, api/video.js)  ── FAL_KEY gizli ──►  fal.ai
   │  2) tarayıcı birkaç saniyede bir /api/status'a sorar
   ▼
api/status.js  ── sonuç hazırsa görsel adresini döner
```

API anahtarın hiçbir zaman tarayıcıya gitmez.

## Yayına alma (yaklaşık 10 dakika, ücretsiz)

### 1. fal.ai anahtarı al
1. https://fal.ai adresine üye ol.
2. Hesabına biraz bakiye yükle (kombin fotoğrafı ~0,04 $, video 0,35 $).
3. **Dashboard → Keys → Add key** ile bir anahtar oluştur ve kopyala.

### 2. Kodu GitHub'a yükle
1. https://github.com/new ile yeni bir depo (repository) aç, örn. `kombin-dene`.
2. **"uploading an existing file"** bağlantısına tıkla, bu klasördeki tüm dosyaları (api klasörü dahil) sürükle, **Commit** de.

### 3. Vercel'de yayınla
1. https://vercel.com adresine GitHub hesabınla gir.
2. **Add New → Project** → `kombin-dene` deposunu seç → **Import**.
3. **Environment Variables** bölümüne ekle:
   | Ad | Değer |
   |---|---|
   | `FAL_KEY` | fal.ai'den kopyaladığın anahtar |
   | `ACCESS_CODE` | *(isteğe bağlı)* örn. `kombin2026` — girilirse sadece kodu bilenler kullanabilir |
4. **Deploy**'a bas. Birkaç saniye sonra siten `https://kombin-dene.vercel.app` gibi bir adreste yayında.

> Değişken ekledikten/değiştirdikten sonra **Deployments → Redeploy** yapman gerekir.

### Kendi alan adın (isteğe bağlı)
Vercel → Project → **Settings → Domains** bölümünden `kombindene.com` gibi bir alan adı bağlayabilirsin.

## Bilgisayarında denemek

```bash
npm i -g vercel
vercel dev          # ilk seferde FAL_KEY'i sorar ya da .env dosyasından okur
```
Sonra http://localhost:3000 adresini aç.

## Önemli notlar

- **Masraf:** Herkese açık bırakırsan başkaları da senin bakiyenle giydirme yapabilir. Başta `ACCESS_CODE` koyman ve fal.ai'de harcama limiti belirlemen önerilir. Sonra üyelik/kredi sistemi eklenebilir.
- **Modeller:** Ticari kullanım koşullarını yayına almadan önce her modelin fal.ai sayfasından kontrol et.
- **Mağaza görselleri:** Ürün sayfası linki değil, *resmin kendi adresi* gerekir (resme sağ tık → "Resim adresini kopyala"). Bazı siteler dışarıdan erişimi engeller; o zaman görseli indirip yüklemek ya da ekran görüntüsü almak yeterli.
- **Gizlilik:** Fotoğraflar sunucuda saklanmaz, yalnızca fal.ai'ye işlenmek üzere gönderilir. Türkiye'de yayına alırken KVKK aydınlatma metni eklemen iyi olur.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `index.html` | Sitenin arayüzü (yükleme, ayarlar, sonuç) |
| `api/tryon.js` | Kişi + kıyafet görsellerini tek kombin isteği olarak gönderir |
| `api/video.js` | Kombin fotoğrafından 360° video isteği gönderir |
| `api/status.js` | İşin durumunu sorar, bitince sonucu döner |
| `vercel.json` | Vercel fonksiyon ayarları |
