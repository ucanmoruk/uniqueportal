# UNIQUE Services Portal — Next.js

Kozmetik laboratuvar test ve analiz hizmetleri müşteri portalı. Eski PHP+MSSQL
portalının modernize edilmiş, Next.js 16 + TypeScript tabanlı sürümü.
Mevcut MSSQL veritabanını (`massgrup_cosmo`) olduğu gibi kullanır;
parametrize sorgular, JWT oturum ve rol bazlı kapsam filtreleri eklenmiştir.

## Stack

- **Next.js 16** (App Router, Turbopack, RSC, Server Actions)
- **TypeScript** strict mode
- **Tailwind CSS 4** + custom shadcn-tarzı komponentler
- **MSSQL** — `mssql` (Tedious) sürücüsü, connection pool
- **next-auth 5 beta** — Credentials provider, JWT session (8 saat)
- **Lucide icons**, **sonner** toast bildirimleri

## Hazır modüller

| Modül | Yol | Açıklama |
|---|---|---|
| Giriş | `/giris` | Firma kodu + parola ile login |
| Özet | `/ozet` | Talep/belge sayıları, ciro, bakiye, son talepler |
| Talepler | `/talepler` | Liste + detay (raporlama, fatura, numune) |
| Teklifler | `/teklifler` | Liste + detay + yazdırma (`/teklifler/[id]/yazdir`) |
| Faturalar | `/faturalar` | Liste + ciro/tahsilat/bakiye özeti |
| Termin | `/termin` | Termin tarihi sıralı liste, gecikme renklendirmesi |
| Belgeler | `/belgeler` | PDF rapor listesi + indirme (yer tutucu) |
| Destek | `/destek` | Ticket listesi (chat yakında) |
| Hesabım | `/hesabim` | Firma profil görüntüleme |

## Rol bazlı erişim

`Firma.Tur` alanına göre VIEW'ler süzülür:

| Rol | Kapsam |
|---|---|
| Admin | Tümü |
| Müşteri | `Müşteri = firma_adi` |
| Proje | `Proje = firma_adi OR Müşteri = firma_adi` |
| Plasiyer | `PlasiyerID = plasiyer_id` |

## Yerel geliştirme

```bash
cp .env.example .env.local   # ortam değişkenlerini doldur
npm install
npm run dev
```

`http://localhost:3000/giris` adresinden mevcut Firma tablosundaki herhangi bir
kullanıcı kodu + parolayla giriş yapabilirsiniz.

### Veritabanı bağlantısını test et

```bash
npx tsx scripts/test-db.ts        # bağlantı + view sayımları
npx tsx scripts/inspect-schema.ts # tablo/view kolonları
```

## Ortam değişkenleri

`.env.example` dosyasına bakın. Vercel deploy için gerekli olanlar:

| Değişken | Açıklama |
|---|---|
| `MSSQL_SERVER` | Örn. `mssql04.trwww.com` |
| `MSSQL_DATABASE` | `massgrup_cosmo` |
| `MSSQL_USER` | DB kullanıcı |
| `MSSQL_PASSWORD` | DB parolası |
| `MSSQL_PORT` | Varsayılan 1433 |
| `MSSQL_ENCRYPT` | `false` veya `true` |
| `MSSQL_TRUST_CERT` | `true` (self-signed sertifikalar için) |
| `AUTH_SECRET` | 32+ karakter rastgele dize. `openssl rand -base64 32` |
| `AUTH_URL` | Prod'da `https://<vercel-domain>` |
| `LEGACY_PORTAL_URL` | Eski portalın URL'si (PDF indirme için) |

## Güvenlik notları (mevcut MSSQL şemasına göre)

- ✅ Tüm sorgular parametrize edilir (SQL injection korumalı)
- ✅ JWT session (httpOnly cookie), 8 saatlik
- ✅ Rol bazlı VIEW süzme
- ⚠️ `Firma.Parola` hâlâ düz metin saklanıyor — bcrypt'e migrasyon önerilir
  (ayrı bir `ParolaHash` kolonu ile)
- ⚠️ PDF dosyaları halen eski portal sunucusunda — Vercel Blob veya benzeri
  bir depoya taşınmalı

## Vercel deploy

1. Vercel'de bu repo'yu **Import** edin.
2. Build/Install/Output ayarlarını varsayılan bırakın.
3. **Environment Variables** sekmesine yukarıdaki tüm değişkenleri ekleyin.
4. **Deploy**.

> ⚠️ MSSQL sunucunuzun Vercel'in IP aralıklarından gelen bağlantıları
> kabul etmesi gerekir. Şu an `mssql04.trwww.com:1433` halka açık, fakat
> üretimde IP allowlist/VPN kullanılıyorsa Vercel'in Functions için
> ayrılmış IP'lerini whitelist'e ekleyin.

## Yapılacaklar

- [ ] Yeni talep oluşturma formu (`/talepler/yeni`) — dinamik numune satırları
- [ ] Destek chat (mesajlaşma + dosya ek)
- [ ] Hesabım düzenleme + parola değişimi (bcrypt migrasyonu)
- [ ] Belge PDF'leri Vercel Blob'a aktarma
- [ ] Pagination + arama (TanStack Table)
- [ ] Dark mode toggle (next-themes)
