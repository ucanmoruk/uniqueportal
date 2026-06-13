# UNIQUE Portal - cPanel Deploy Rehberi

## Onkoşullar

- cPanel'de "Setup Node.js App" özelliği aktif
- Node.js 18+ mevcut (cPanel'de kontrol edin)
- MSSQL veritabanı erişimi (mssql04.trwww.com)

---

## Adım 1: Lokal Build

Windows'ta PowerShell açın:

```powershell
cd R:\0_Yazılım\UniqueMusteri\uniqueportal
powershell -ExecutionPolicy Bypass -File deploy\prepare.ps1
```

Bu komut:
- `npm run build` ile standalone build oluşturur
- `deploy\output\` klasörüne deploy-ready dosyaları toplar
- public/ ve static assets'leri kopyalar

---

## Adım 2: cPanel'de Node.js App Oluşturma

1. cPanel'e giriş yapın
2. **Software** → **Setup Node.js App** tıklayın
3. **CREATE APPLICATION** butonuna basın
4. Ayarlar:

| Alan | Değer |
|------|-------|
| Node.js version | **18** veya üstü |
| Application mode | **Production** |
| Application root | `portal.uniqueanalyse.com` (veya ilgili dizin) |
| Application URL | `portal.uniqueanalyse.com` |
| Application startup file | **server.js** |

5. **CREATE** butonuna basın
6. Sayfanın üstünde gösterilen **virtual environment activation** komutunu not edin:
   ```
   source /home/KULLANICI/nodevenv/portal.uniqueanalyse.com/18/bin/activate
   ```

---

## Adım 3: Dosyaları Yükleme

### Seçenek A: File Manager (küçük projeler)

1. cPanel → **File Manager**
2. Application root dizinine gidin (Adım 2'de belirlenen)
3. `deploy\output\` klasörünün **içindekileri** ZIP'leyin
4. cPanel'de **Upload** → ZIP'i yükleyin → **Extract** edin
5. Dosyaların dizin kökünde olduğundan emin olun (alt klasörde değil):
   ```
   portal.uniqueanalyse.com/
   ├── server.js          ← Bu dosya kök dizinde olmalı
   ├── node_modules/
   ├── .next/
   ├── public/
   └── .env
   ```

### Seçenek B: FTP/SFTP (büyük projeler, önerilen)

1. FileZilla veya benzeri FTP istemcisi kullanın
2. cPanel FTP bilgilerinizle bağlanın
3. `deploy\output\` içindeki **tüm dosya ve klasörleri** application root'a yükleyin

---

## Adım 4: Environment Variables

### Seçenek A: cPanel UI'dan (önerilen)

1. **Setup Node.js App** sayfasına gidin
2. Uygulamanızın yanındaki **kalem** (edit) ikonuna tıklayın
3. **Environment variables** bölümüne aşağıdakileri ekleyin:

| Name | Value |
|------|-------|
| `MSSQL_SERVER` | `mssql04.trwww.com` |
| `MSSQL_DATABASE` | `massgrup_cosmo` |
| `MSSQL_USER` | *(DB kullanıcı adınız)* |
| `MSSQL_PASSWORD` | *(DB şifreniz)* |
| `MSSQL_PORT` | `1433` |
| `MSSQL_ENCRYPT` | `false` |
| `MSSQL_TRUST_CERT` | `true` |
| `AUTH_SECRET` | *(rastgele uzun string)* |
| `AUTH_URL` | `https://portal.uniqueanalyse.com` |
| `LEGACY_PORTAL_URL` | `https://portal.uqtest.com` |
| `NODE_ENV` | `production` |
| `HOSTNAME` | `0.0.0.0` |

4. **SAVE** tıklayın

### Seçenek B: .env dosyası

1. `deploy\.env.production` dosyasını açın
2. Değerleri doldurun
3. `.env` adıyla application root'a yükleyin

---

## Adım 5: npm install (cPanel Terminal)

cPanel'de bazı paketler (özellikle `mssql`/`tedious`) native build gerektirebilir.

1. cPanel → **Terminal** (veya SSH bağlantısı)
2. Virtual environment'ı aktif edin:
   ```bash
   source /home/KULLANICI/nodevenv/portal.uniqueanalyse.com/18/bin/activate
   ```
3. Application root'a gidin:
   ```bash
   cd ~/portal.uniqueanalyse.com
   ```
4. Standalone zaten node_modules içerir, ama tedious sorun çıkarırsa:
   ```bash
   npm install mssql tedious --production
   ```

---

## Adım 6: Uygulamayı Başlatma

1. **Setup Node.js App** sayfasına gidin
2. Uygulamanızın yanındaki **RESTART** butonuna tıklayın
3. `https://portal.uniqueanalyse.com` adresini kontrol edin

---

## Sorun Giderme

### "Application Error" veya boş sayfa

**Log kontrolü:**
```bash
source /home/KULLANICI/nodevenv/portal.uniqueanalyse.com/18/bin/activate
cd ~/portal.uniqueanalyse.com
node server.js
```
Terminal'de hata mesajlarını okuyun.

### MSSQL bağlantı hatası

- Sunucu firewall'da cPanel IP'sinin açık olduğundan emin olun
- MSSQL_SERVER, MSSQL_USER, MSSQL_PASSWORD doğru mu kontrol edin
- Test:
  ```bash
  node -e "const sql=require('mssql');sql.connect({server:'mssql04.trwww.com',port:1433,database:'massgrup_cosmo',user:'XXX',password:'XXX',options:{encrypt:false,trustServerCertificate:true}}).then(()=>console.log('OK')).catch(e=>console.error(e))"
  ```

### 502 Bad Gateway / 503

- Node.js uygulaması çalışmıyor olabilir → RESTART
- Port çakışması → cPanel otomatik PORT atar, müdahale etmeyin
- node_modules eksik → `npm install` tekrar çalıştırın

### Static dosyalar yüklenmiyor (CSS/JS)

- `.next/static/` klasörünün `.next/` altında olduğunu kontrol edin
- `public/` klasörünün root'ta olduğunu kontrol edin

### "Module not found" hatası

```bash
cd ~/portal.uniqueanalyse.com
npm install --production
```

---

## Güncelleme (Sonraki Deploy'lar)

1. Lokal'de değişiklikleri yapın
2. `deploy\prepare.ps1` tekrar çalıştırın
3. `deploy\output\` içeriğini cPanel'e tekrar yükleyin (.env hariç)
4. cPanel'de **RESTART** butonuna basın

> **Önemli:** .env dosyasını her seferinde yüklemeyin — sadece ilk kurulumda yükleyin,
> sonraki güncellemelerde mevcut .env korunmalı.

---

## Dosya Yapısı (cPanel'de)

```
portal.uniqueanalyse.com/
├── server.js                 # Next.js standalone server (startup file)
├── node_modules/             # Minimal production dependencies
├── .next/
│   ├── static/               # CSS, JS chunks
│   └── server/               # Server-side compiled pages
├── public/
│   ├── unique-logo.jpeg
│   ├── favicon.png
│   └── ...
├── .env                      # Environment variables
└── package.json
```
