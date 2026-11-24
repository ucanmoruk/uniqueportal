# Portal arama motoru kontrolü

Bu uygulama `portal.uniqueanalyse.com` müşteri portalıdır. Pazarlama sitesi ayrı
bir projedir. `next.config.ts` mevcut güvenlik başlıklarını korur ve yalnız
`portal.uniqueanalyse.com` Host eşleşmesinde bütün Next.js yanıtlarına
`X-Robots-Tag: noindex, nofollow, noarchive` ekler. Bu kural yönlendirmeler,
API yanıtları, hatalar ve Next.js üzerinden sunulan dosyaları da kapsar.
Reverse proxy/CDN tarafından uygulamaya ulaşmadan üretilen yanıtlar ayrıca
hosting katmanında kontrol edilmelidir.

Kök layout HTML için `noindex, nofollow, nocache` üretir. Alt sayfalara
`index: true`, `follow: true` veya ana siteye canonical eklemeyin. Portal
URL'lerini pazarlama sitesinin sitemap'ine eklemeyin.

`app/robots.txt` yalnız `User-agent: *` ve `Allow: /` içerir. Proxy'deki yeni
auth istisnası tam olarak `/robots.txt` yoludur; uygulama ve belge yetkileri
değişmez. `Disallow: /` kullanmayın: arama motoru noindex'i okuyabilmelidir.

## Yerel kontrol

Sunucu çalışırken gerçek alan adı eşleşmesini Host başlığıyla kontrol edin:

```sh
curl -sS -D - -o /dev/null -H 'Host: portal.uniqueanalyse.com' http://127.0.0.1:1040/
curl -sS -D - -H 'Host: portal.uniqueanalyse.com' http://127.0.0.1:1040/robots.txt
curl -sS -H 'Host: portal.uniqueanalyse.com' http://127.0.0.1:1040/giris
curl -sS -D - -o /dev/null -H 'Host: portal.uniqueanalyse.com' http://127.0.0.1:1040/ozet
curl -sS -D - -o /dev/null -H 'Host: www.uniqueanalyse.com' http://127.0.0.1:1040/robots.txt
```

Son istekte X-Robots-Tag olmamalı. Localhost Host'u tek başına üretim alan adı
kuralını tetiklemez. Giriş HTML'inde çelişkili robots/googlebot etiketi olmamalı.

## Yayından sonra

- `/`, `/ozet` ve `/giris` yanıtlarını takip etmeden ve yönlendirme zincirinin
  her adımında başlıkları kontrol edin.
- `/robots.txt` oturumsuz 200 text/plain dönmeli; yönlendirme, sitemap veya
  Disallow içermemeli.
- Gerçek müşteri oturumuyla yetkili bir `/api/belge/<id>?download=1` indirin:
  yanıt PDF olmalı, X-Robots-Tag taşımalı, içerik açılabilmeli. Aynı dosyayı
  oturumsuz ve başka müşterinin oturumuyla indiremediğinizi kontrol edin.
- Bu kaynak ağacında ayrı bir rapor doğrulama rotası yoktur. Kullanılan gerçek
  doğrulama URL'sini ve onu sunan uygulamayı belirleyip o yanıtı da kontrol edin;
  başka bir alan adıysa bu portalın Host kuralı onu kapsamaz.
- `https://www.uniqueanalyse.com/` başlıklarında portalın noindex kuralı
  bulunmamalı.
- Search Console URL Denetimi canlı testinde `/giris` için noindex'in okunduğunu
  doğrulayın. Kimlik doğrulamayı Googlebot için kaldırmayın.

Dizinden çıkma yeniden taramaya bağlıdır; anlık değildir. Gerekirse Search
Console'da yalnız portal URL öneki için geçici kaldırma ayrıca istenebilir.
Noindex erişim güvenliği sağlamaz; mevcut auth ve müşteri yetkileri korunmalıdır.

Kaynaklar:
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
