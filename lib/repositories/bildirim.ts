import { query, queryOne } from "@/lib/db-mysql";
import { isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export type BildirimTuru =
  | "rapor"
  | "teklif"
  | "fatura"
  | "talep-durum"
  | "numune-kabul"
  | "numune-analiz"
  | "destek-yeni"
  | "destek-yanit";

export interface Bildirim {
  id: string;
  type: BildirimTuru;
  title: string;
  subtitle: string;
  link: string;
  tarih: Date;
}

let __tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (__tableEnsured) return;
  await query(
    `CREATE TABLE IF NOT EXISTS BildirimOkuma (
       FirmaID INT NOT NULL PRIMARY KEY,
       SonGoruldu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci`
  );
  __tableEnsured = true;
}

interface RaporEvent {
  ID: number;
  RaporID: string | null;
  RaporNo: number | null;
  NumuneAd: string | null;
  Tarih: Date;
}

interface TeklifEvent {
  ID: number;
  TeklifNoText: string;
  TeklifKonusu: string | null;
  Tarih: Date;
}

interface FaturaEvent {
  ID: number;
  Fatura_No: string;
  Tutar: number | null;
  Tarih: Date;
}

interface DestekYeniEvent {
  TalepID: number;
  DESTEK_NO: string | null;
  BASLIK: string | null;
  KAYIT_TARIHI: string | null;
  KayitEdenFirma: string | null;
}

interface DestekYanitEvent {
  DETAY_ID: number;
  DESTEK_REF: number;
  DESTEK_NO: string | null;
  MESAJ: string | null;
  MESAJ_TARIHI: string | null;
  Baslik: string | null;
  GonderenAdi: string | null;
}

export async function getBildirimler(
  user: SessionUser,
  sinceDays = 30
): Promise<Bildirim[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  // ---- Raporlar ----
  let raporRows: RaporEvent[] = [];
  if (isAdmin(user)) {
    raporRows = await query<RaporEvent>(
      `SELECT ID, RaporID, RaporNo, NumuneAd, Tarih
       FROM Rapor
       WHERE Durum = 'Aktif' AND Tarih >= @since
       ORDER BY Tarih DESC, ID DESC
       LIMIT 50`,
      { since }
    );
  } else if (user.firmaAdi) {
    raporRows = await query<RaporEvent>(
      `SELECT ID, RaporID, RaporNo, NumuneAd, Tarih
       FROM Rapor
       WHERE Durum = 'Aktif' AND Tarih >= @since
         AND (FirmaAd = @firma OR Proje = @firma)
       ORDER BY Tarih DESC, ID DESC
       LIMIT 50`,
      { since, firma: user.firmaAdi }
    );
  }

  // ---- Teklifler ----
  const TEKLIF_BASE_SELECT = `
    SELECT
      tb.ID,
      CONCAT(
        COALESCE(tb.DisTeklifKodu, CONCAT('UQ', tb.TeklifNo)),
        '/',
        LPAD(tb.RevNo, 2, '0')
      ) AS TeklifNoText,
      tb.TeklifKonusu,
      tb.Tarih
    FROM TeklifBaslik tb`;
  const TEKLIF_BASE_WHERE = `
      tb.Durum = 'Aktif'
      AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
      AND tb.Tarih >= @since`;

  let teklifRows: TeklifEvent[] = [];
  if (isAdmin(user)) {
    teklifRows = await query<TeklifEvent>(
      `${TEKLIF_BASE_SELECT}
       WHERE ${TEKLIF_BASE_WHERE}
       ORDER BY tb.Tarih DESC, tb.ID DESC
       LIMIT 30`,
      { since }
    );
  } else {
    teklifRows = await query<TeklifEvent>(
      `${TEKLIF_BASE_SELECT}
       WHERE ${TEKLIF_BASE_WHERE}
         AND tb.MusteriID = @firmaId
       ORDER BY tb.Tarih DESC, tb.ID DESC
       LIMIT 30`,
      { since, firmaId: user.id }
    );
  }

  // ---- Faturalar ----
  let faturaRows: FaturaEvent[] = [];
  if (isAdmin(user)) {
    faturaRows = await query<FaturaEvent>(
      `SELECT ID, Fatura_No, Toplam AS Tutar, Tarih
       FROM Fatura
       WHERE Tarih >= @since
       ORDER BY Tarih DESC, ID DESC
       LIMIT 30`,
      { since }
    );
  } else {
    faturaRows = await query<FaturaEvent>(
      `SELECT ID, Fatura_No, Toplam AS Tutar, Tarih
       FROM Fatura
       WHERE Tarih >= @since
         AND (FaturaFirmaID = @firmaId OR Proje_ID = @firmaId)
       ORDER BY Tarih DESC, ID DESC
       LIMIT 30`,
      { since, firmaId: user.id }
    );
  }

  const all: Bildirim[] = [];

  for (const r of raporRows) {
    all.push({
      id: `rapor-${r.ID}`,
      type: "rapor",
      title: r.NumuneAd
        ? `Rapor yüklendi: ${r.NumuneAd}`
        : `Yeni rapor yüklendi`,
      subtitle: r.RaporID ?? `Rapor No: ${r.RaporNo ?? r.ID}`,
      link: `/belgeler`,
      tarih: new Date(r.Tarih),
    });
  }

  for (const t of teklifRows) {
    all.push({
      id: `teklif-${t.ID}`,
      type: "teklif",
      title: "Yeni bir teklifiniz var",
      subtitle: t.TeklifKonusu
        ? `${t.TeklifNoText} · ${t.TeklifKonusu}`
        : t.TeklifNoText,
      link: `/teklifler/${t.ID}`,
      tarih: new Date(t.Tarih),
    });
  }

  for (const f of faturaRows) {
    all.push({
      id: `fatura-${f.ID}`,
      type: "fatura",
      title: `Yeni fatura oluşturuldu`,
      subtitle: `${f.Fatura_No}${
        f.Tutar != null ? " · " + f.Tutar.toLocaleString("tr-TR") + " ₺" : ""
      }`,
      link: `/faturalar`,
      tarih: new Date(f.Tarih),
    });
  }

  // ---- Talep durum değişiklikleri ----
  interface TalepDurumEvent {
    LogID: number;
    TalepID: number;
    EskiDurum: string | null;
    YeniDurum: string | null;
    Tarih: Date;
    TalepNoText: string;
  }
  let durumRows: TalepDurumEvent[] = [];
  if (isAdmin(user)) {
    durumRows = await query<TalepDurumEvent>(
      `SELECT
          l.ID AS LogID, l.TalepID, l.EskiDurum, l.YeniDurum, l.Tarih,
          COALESCE(t.DisTalepKodu, CONCAT('UQ', t.TalepNo)) AS TalepNoText
       FROM TalepDurumLog l
       INNER JOIN Talep t ON t.ID = l.TalepID
       WHERE l.Tarih >= @since
         AND l.YeniDurum <> 'Pasif'
         AND t.Durum <> 'Pasif'
         AND (t.Tur IS NULL OR t.Tur <> 'Destek')
       ORDER BY l.Tarih DESC, l.ID DESC
       LIMIT 50`,
      { since }
    );
  } else if (user.kod) {
    durumRows = await query<TalepDurumEvent>(
      `SELECT
          l.ID AS LogID, l.TalepID, l.EskiDurum, l.YeniDurum, l.Tarih,
          COALESCE(t.DisTalepKodu, CONCAT('UQ', t.TalepNo)) AS TalepNoText
       FROM TalepDurumLog l
       INNER JOIN Talep t ON t.ID = l.TalepID
       WHERE l.Tarih >= @since
         AND l.YeniDurum <> 'Pasif'
         AND t.Durum <> 'Pasif'
         AND (t.Tur IS NULL OR t.Tur <> 'Destek')
         AND t.FirmaKodu = @kod
       ORDER BY l.Tarih DESC, l.ID DESC
       LIMIT 50`,
      { since, kod: user.kod }
    );
  }

  for (const d of durumRows) {
    const yeni = d.YeniDurum ?? "—";
    const eski = d.EskiDurum;
    const yeniNorm = yeni.trim().toLocaleLowerCase("tr-TR");
    let link = `/talepler/${d.TalepID}`;
    if (yeniNorm === "analiz aşamasında" || yeniNorm === "analiz asamasinda") {
      link = "/termin";
    } else if (yeniNorm === "raporlandı" || yeniNorm === "raporlandi") {
      link = "/belgeler";
    }

    all.push({
      id: `talep-durum-${d.LogID}`,
      type: "talep-durum",
      title: `Talep durumu güncellendi: ${yeni}`,
      subtitle: eski
        ? `${d.TalepNoText} · ${eski} → ${yeni}`
        : `${d.TalepNoText} · ${yeni}`,
      link,
      tarih: new Date(d.Tarih),
    });
  }

  // ---- NKR rapor yayını ----
  interface RaporYayinEvent {
    OnayID: number;
    NkrID: number;
    RaporNo: number | null;
    NumuneAd: string | null;
    RaporFormati: string | null;
    Tarih: Date;
  }
  let yayinRows: RaporYayinEvent[] = [];
  if (isAdmin(user) || user.id) {
    const firmaFilter = isAdmin(user) ? "" : "AND n.Firma_ID = @firmaId";
    const params: Record<string, string | number | Date> = { since };
    if (!isAdmin(user)) params.firmaId = user.id;

    yayinRows = await query<RaporYayinEvent>(
      `SELECT
          o.ID AS OnayID, o.NkrID, n.RaporNo, n.Numune_Adi AS NumuneAd,
          o.RaporFormati, o.YayinTarihi AS Tarih
       FROM NKR_RaporOnay o
       INNER JOIN NKR n ON n.ID = o.NkrID
       WHERE o.YayinTarihi >= @since
         AND o.YayinUrl IS NOT NULL
         AND TRIM(o.YayinUrl) <> ''
         AND n.Durum = 'Aktif'
         ${firmaFilter}
       ORDER BY o.YayinTarihi DESC, o.ID DESC
       LIMIT 50`,
      params
    );
  }
  for (const y of yayinRows) {
    const head = y.RaporNo != null ? String(y.RaporNo) : `NKR-${y.NkrID}`;
    const sub = y.NumuneAd ? `${head} · ${y.NumuneAd}` : head;
    all.push({
      id: `rapor-yayin-${y.OnayID}`,
      type: "rapor",
      title: "Raporunuz yayınlandı",
      subtitle: y.RaporFormati ? `${sub} · ${y.RaporFormati}` : sub,
      link: "/belgeler",
      tarih: new Date(y.Tarih),
    });
  }

  // ---- Numune durumu ----
  interface NumuneKabulEvent {
    NkrID: number;
    Evrak_No: number | null;
    RaporNo: number | null;
    Numune_Adi: string | null;
    Tarih: Date;
  }
  interface NumuneAnalizEvent {
    LabID: number;
    NkrID: number;
    Evrak_No: number | null;
    RaporNo: number | null;
    Numune_Adi: string | null;
    RaporFormati: string | null;
    Tarih: Date;
  }

  let kabulRows: NumuneKabulEvent[] = [];
  let analizRows: NumuneAnalizEvent[] = [];

  if (isAdmin(user) || user.id) {
    const firmaFilter = isAdmin(user) ? "" : "AND n.Firma_ID = @firmaId";
    const params: Record<string, string | number | Date> = { since };
    if (!isAdmin(user)) params.firmaId = user.id;

    kabulRows = await query<NumuneKabulEvent>(
      `SELECT
          n.ID AS NkrID, n.Evrak_No, n.RaporNo, n.Numune_Adi, n.Tarih
       FROM NKR n
       WHERE n.Durum = 'Aktif'
         AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> 'Raporlandı')
         AND n.Tarih >= @since
         ${firmaFilter}
       ORDER BY n.Tarih DESC, n.ID DESC
       LIMIT 50`,
      params
    );

    analizRows = await query<NumuneAnalizEvent>(
      `SELECT
          k.ID AS LabID, k.NkrID,
          n.Evrak_No, n.RaporNo, n.Numune_Adi,
          k.RaporFormati,
          COALESCE(k.OlusturmaTarihi, k.KabulTarihi, n.Tarih) AS Tarih
       FROM NKR_LabKabul k
       INNER JOIN NKR n ON n.ID = k.NkrID
       WHERE n.Durum = 'Aktif'
         AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> 'Raporlandı')
         AND COALESCE(k.OlusturmaTarihi, k.KabulTarihi, n.Tarih) >= @since
         ${firmaFilter}
       ORDER BY k.ID DESC
       LIMIT 50`,
      params
    );
  }

  const numuneEtiket = (e: { Evrak_No: number | null; RaporNo: number | null; Numune_Adi: string | null }) => {
    const head = e.RaporNo != null ? String(e.RaporNo) : e.Evrak_No != null ? `E-${e.Evrak_No}` : "—";
    return e.Numune_Adi ? `${head} · ${e.Numune_Adi}` : head;
  };

  for (const k of kabulRows) {
    all.push({
      id: `numune-kabul-${k.NkrID}`,
      type: "numune-kabul",
      title: "Numunenizin kayıt aşamasında",
      subtitle: numuneEtiket(k),
      link: "/termin",
      tarih: new Date(k.Tarih),
    });
  }
  for (const a of analizRows) {
    const base = numuneEtiket(a);
    all.push({
      id: `numune-analiz-${a.LabID}`,
      type: "numune-analiz",
      title: "Analiz aşamasında",
      subtitle: a.RaporFormati ? `${base} · ${a.RaporFormati}` : base,
      link: "/termin",
      tarih: new Date(a.Tarih),
    });
  }

  // ---- Destek olayları ----
  if (isAdmin(user)) {
    const yeniTicketlar = await query<DestekYeniEvent>(
      `SELECT d.TalepID, d.DESTEK_NO, d.BASLIK, d.KAYIT_TARIHI, f.Firma_Adi AS KayitEdenFirma
       FROM DESTEK d
       LEFT JOIN Firma f ON f.ID = d.KAYIT_EDEN
       WHERE d.Tarih >= @since
       ORDER BY d.Tarih DESC, d.ID DESC
       LIMIT 30`,
      { since }
    );
    for (const t of yeniTicketlar) {
      const tarih = parseTarihText(t.KAYIT_TARIHI);
      const firma = t.KayitEdenFirma ?? "Bilinmeyen firma";
      all.push({
        id: `destek-yeni-${t.TalepID}`,
        type: "destek-yeni",
        title: `Yeni destek talebi: ${t.BASLIK ?? "Konu belirtilmemiş"}`,
        subtitle: t.DESTEK_NO ? `${t.DESTEK_NO} · ${firma}` : firma,
        link: `/destek/${t.TalepID}`,
        tarih: tarih ?? since,
      });
    }

    const musteriYanitlari = await query<DestekYanitEvent>(
      `SELECT dd.DETAY_ID, dd.DESTEK_REF, d.DESTEK_NO, dd.MESAJ, dd.MESAJ_TARIHI,
              d.BASLIK AS Baslik,
              f.Firma_Adi AS GonderenAdi
       FROM DESTEK_DETAY dd
       INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
       LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
       WHERE f.Tur <> 'Admin'
         AND CAST(dd.MESAJ_TARIHI AS DATETIME) >= @since
       ORDER BY dd.DETAY_ID DESC
       LIMIT 30`,
      { since }
    );
    for (const m of musteriYanitlari) {
      const tarih = parseTarihText(m.MESAJ_TARIHI);
      const firma = m.GonderenAdi ?? "";
      all.push({
        id: `destek-yanit-${m.DETAY_ID}`,
        type: "destek-yanit",
        title: `Müşteri yanıt verdi: ${m.Baslik ?? "Destek talebi"}`,
        subtitle: m.DESTEK_NO ? `${m.DESTEK_NO}${firma ? " · " + firma : ""}` : firma,
        link: `/destek/${m.DESTEK_REF}`,
        tarih: tarih ?? since,
      });
    }
  } else if (user.kod) {
    const adminYanitlari = await query<DestekYanitEvent>(
      `SELECT dd.DETAY_ID, dd.DESTEK_REF, d.DESTEK_NO, dd.MESAJ, dd.MESAJ_TARIHI,
              d.BASLIK AS Baslik,
              f.Firma_Adi AS GonderenAdi
       FROM DESTEK_DETAY dd
       INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
       LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
       WHERE d.FirmaKodu = @kod
         AND (f.Kod IS NULL OR f.Kod <> @kod)
         AND CAST(dd.MESAJ_TARIHI AS DATETIME) >= @since
       ORDER BY dd.DETAY_ID DESC
       LIMIT 30`,
      { since, kod: user.kod }
    );
    for (const m of adminYanitlari) {
      const tarih = parseTarihText(m.MESAJ_TARIHI);
      const ozet = m.MESAJ ? truncate(m.MESAJ, 80) : "";
      all.push({
        id: `destek-yanit-${m.DETAY_ID}`,
        type: "destek-yanit",
        title: `Destek yanıtı: ${m.Baslik ?? "Talebiniz"}`,
        subtitle: m.DESTEK_NO ? `${m.DESTEK_NO}${ozet ? " · " + ozet : ""}` : ozet,
        link: `/destek/${m.DESTEK_REF}`,
        tarih: tarih ?? since,
      });
    }
  }

  all.sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
  return all.slice(0, 50);
}

function parseTarihText(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export async function getSonGoruldu(firmaId: number): Promise<Date | null> {
  await ensureTable();
  const row = await queryOne<{ SonGoruldu: Date }>(
    `SELECT SonGoruldu FROM BildirimOkuma WHERE FirmaID = @id`,
    { id: firmaId }
  );
  return row?.SonGoruldu ?? null;
}

export async function markBildirimlerOkundu(firmaId: number): Promise<void> {
  await ensureTable();
  await query(
    `INSERT INTO BildirimOkuma (FirmaID, SonGoruldu)
     VALUES (@id, NOW())
     ON DUPLICATE KEY UPDATE SonGoruldu = NOW()`,
    { id: firmaId }
  );
}

export function countUnread(bildirimler: Bildirim[], lastSeen: Date | null): number {
  if (!lastSeen) return bildirimler.length;
  return bildirimler.filter((b) => b.tarih > lastSeen).length;
}

/**
 * Okunmamış bildirim SAYISINI tek sorguda döner — periyodik poll için.
 *
 * getBildirimler tüm satırları (8 sorgu, ~270 satır) çekip JS'de obje kurup
 * sayardı; bu fonksiyon aynı WHERE koşullarını COUNT(*) subquery'leri olarak
 * tek SELECT'te toplar. Davranış birebir aynı (rozet >9 için "9+" gösterir),
 * yük ~10 kat düşer ve havuzdan tek bağlantı kullanır.
 */
export async function countUnreadBildirim(
  user: SessionUser,
  lastSeen: Date | null,
  sinceDays = 30
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  // Okunmamış = tarih > lastSeen, 30 günlük pencere içinde.
  // Eşik: lastSeen pencere başından yeniyse onu (strict >), değilse pencere
  // başını (1ms öncesi → > ile inclusive) kullan.
  const threshold =
    lastSeen && lastSeen > since ? lastSeen : new Date(since.getTime() - 1);

  const admin = isAdmin(user);
  const subs: string[] = [];
  const params: Record<string, string | number | Date | null> = {
    th: threshold,
  };

  if (admin) {
    // ---- Rapor ----
    subs.push(
      `(SELECT COUNT(*) FROM Rapor WHERE Durum='Aktif' AND Tarih > @th)`
    );
    // ---- Teklif ----
    subs.push(
      `(SELECT COUNT(*) FROM TeklifBaslik tb
        WHERE tb.Durum='Aktif'
          AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
          AND tb.Tarih > @th)`
    );
    // ---- Fatura ----
    subs.push(`(SELECT COUNT(*) FROM Fatura WHERE Tarih > @th)`);
    // ---- Talep durum ----
    subs.push(
      `(SELECT COUNT(*) FROM TalepDurumLog l
        INNER JOIN Talep t ON t.ID = l.TalepID
        WHERE l.Tarih > @th AND l.YeniDurum <> 'Pasif' AND t.Durum <> 'Pasif'
          AND (t.Tur IS NULL OR t.Tur <> 'Destek'))`
    );
    // ---- Rapor yayını ----
    subs.push(
      `(SELECT COUNT(*) FROM NKR_RaporOnay o
        INNER JOIN NKR n ON n.ID = o.NkrID
        WHERE o.YayinTarihi > @th AND o.YayinUrl IS NOT NULL AND TRIM(o.YayinUrl) <> ''
          AND n.Durum = 'Aktif')`
    );
    // ---- Numune kabul (NKR) ----
    subs.push(
      `(SELECT COUNT(*) FROM NKR n
        WHERE n.Durum='Aktif' AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> 'Raporlandı')
          AND n.Tarih > @th)`
    );
    // ---- Numune analiz (LabKabul) ----
    subs.push(
      `(SELECT COUNT(*) FROM NKR_LabKabul k
        INNER JOIN NKR n ON n.ID = k.NkrID
        WHERE n.Durum='Aktif' AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> 'Raporlandı')
          AND COALESCE(k.OlusturmaTarihi, k.KabulTarihi, n.Tarih) > @th)`
    );
    // ---- Destek: yeni ticket ----
    subs.push(`(SELECT COUNT(*) FROM DESTEK d WHERE d.Tarih > @th)`);
    // ---- Destek: müşteri yanıtı ----
    subs.push(
      `(SELECT COUNT(*) FROM DESTEK_DETAY dd
        INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
        LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
        WHERE f.Tur <> 'Admin' AND CAST(dd.MESAJ_TARIHI AS DATETIME) > @th)`
    );
  } else {
    params.firma = user.firmaAdi ?? null;
    params.firmaId = user.id;
    params.kod = user.kod ?? null;

    // ---- Rapor ----
    subs.push(
      `(SELECT COUNT(*) FROM Rapor
        WHERE Durum='Aktif' AND Tarih > @th AND (FirmaAd = @firma OR Proje = @firma))`
    );
    // ---- Teklif ----
    subs.push(
      `(SELECT COUNT(*) FROM TeklifBaslik tb
        WHERE tb.Durum='Aktif'
          AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
          AND tb.Tarih > @th AND tb.MusteriID = @firmaId)`
    );
    // ---- Fatura ----
    subs.push(
      `(SELECT COUNT(*) FROM Fatura
        WHERE Tarih > @th AND (FaturaFirmaID = @firmaId OR Proje_ID = @firmaId))`
    );
    // ---- Talep durum ----
    subs.push(
      `(SELECT COUNT(*) FROM TalepDurumLog l
        INNER JOIN Talep t ON t.ID = l.TalepID
        WHERE l.Tarih > @th AND l.YeniDurum <> 'Pasif' AND t.Durum <> 'Pasif'
          AND (t.Tur IS NULL OR t.Tur <> 'Destek') AND t.FirmaKodu = @kod)`
    );
    // ---- Rapor yayını ----
    subs.push(
      `(SELECT COUNT(*) FROM NKR_RaporOnay o
        INNER JOIN NKR n ON n.ID = o.NkrID
        WHERE o.YayinTarihi > @th AND o.YayinUrl IS NOT NULL AND TRIM(o.YayinUrl) <> ''
          AND n.Durum = 'Aktif' AND n.Firma_ID = @firmaId)`
    );
    // ---- Numune kabul (NKR) ----
    subs.push(
      `(SELECT COUNT(*) FROM NKR n
        WHERE n.Durum='Aktif' AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> 'Raporlandı')
          AND n.Tarih > @th AND n.Firma_ID = @firmaId)`
    );
    // ---- Numune analiz (LabKabul) ----
    subs.push(
      `(SELECT COUNT(*) FROM NKR_LabKabul k
        INNER JOIN NKR n ON n.ID = k.NkrID
        WHERE n.Durum='Aktif' AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> 'Raporlandı')
          AND COALESCE(k.OlusturmaTarihi, k.KabulTarihi, n.Tarih) > @th
          AND n.Firma_ID = @firmaId)`
    );
    // ---- Destek: admin yanıtı ----
    subs.push(
      `(SELECT COUNT(*) FROM DESTEK_DETAY dd
        INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
        LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
        WHERE d.FirmaKodu = @kod AND (f.Kod IS NULL OR f.Kod <> @kod)
          AND CAST(dd.MESAJ_TARIHI AS DATETIME) > @th)`
    );
  }

  const row = await queryOne<Record<string, number>>(
    `SELECT ${subs.map((s, i) => `${s} AS c${i}`).join(", ")}`,
    params
  );
  if (!row) return 0;
  return Object.values(row).reduce((sum, n) => sum + Number(n ?? 0), 0);
}
