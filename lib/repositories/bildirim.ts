import { query, queryOne } from "@/lib/db";
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
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_NAME = 'BildirimOkuma'
     )
     CREATE TABLE BildirimOkuma (
       FirmaID int NOT NULL PRIMARY KEY,
       SonGoruldu datetime NOT NULL CONSTRAINT DF_BildirimOkuma_SonGoruldu DEFAULT GETDATE()
     )`
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
  BASLIK: string | null;
  KAYIT_TARIHI: string | null;
  KayitEdenFirma: string | null;
}

interface DestekYanitEvent {
  DETAY_ID: number;
  DESTEK_REF: number;
  MESAJ: string | null;
  MESAJ_TARIHI: string | null;
  Baslik: string | null;
  GonderenAdi: string | null;
}

/**
 * Son N gündeki yeni rapor / teklif / fatura olaylarını getir.
 * Olaylar yalnızca kullanıcının firmasıyla ilişkili kayıtlardan toplanır.
 */
export async function getBildirimler(
  user: SessionUser,
  sinceDays = 30
): Promise<Bildirim[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  // ---- Raporlar (yüklenen test raporları) ----
  let raporRows: RaporEvent[] = [];
  if (isAdmin(user)) {
    raporRows = await query<RaporEvent>(
      `SELECT TOP 50 ID, RaporID, RaporNo, NumuneAd, Tarih
       FROM Rapor
       WHERE Durum = 'Aktif' AND Tarih >= @since
       ORDER BY Tarih DESC, ID DESC`,
      { since }
    );
  } else if (user.firmaAdi) {
    raporRows = await query<RaporEvent>(
      `SELECT TOP 50 ID, RaporID, RaporNo, NumuneAd, Tarih
       FROM Rapor
       WHERE Durum = 'Aktif' AND Tarih >= @since
         AND (FirmaAd = @firma OR Proje = @firma)
       ORDER BY Tarih DESC, ID DESC`,
      { since, firma: user.firmaAdi }
    );
  }

  // ---- Teklifler (yalnızca "gönderilmiş" olanlar — taslak gizli) ----
  // Numara DisTeklifKodu/RevNo formatında üretilir.
  const TEKLIF_BASE_SELECT = `
    SELECT TOP 30
      tb.ID,
      COALESCE(tb.DisTeklifKodu, CONCAT('UQ', CAST(tb.TeklifNo AS varchar)))
        + '/' + RIGHT('00' + CAST(tb.RevNo AS varchar), 2) AS TeklifNoText,
      tb.TeklifKonusu,
      tb.Tarih
    FROM cosmoroot.TeklifBaslik tb`;
  const TEKLIF_BASE_WHERE = `
      tb.Durum = 'Aktif'
      AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
      AND tb.Tarih >= @since`;

  let teklifRows: TeklifEvent[] = [];
  if (isAdmin(user)) {
    teklifRows = await query<TeklifEvent>(
      `${TEKLIF_BASE_SELECT}
       WHERE ${TEKLIF_BASE_WHERE}
       ORDER BY tb.Tarih DESC, tb.ID DESC`,
      { since }
    );
  } else {
    // Müşteri/Proje: kendi firmasına kesilen teklifler.
    teklifRows = await query<TeklifEvent>(
      `${TEKLIF_BASE_SELECT}
       WHERE ${TEKLIF_BASE_WHERE}
         AND tb.MusteriID = @firmaId
       ORDER BY tb.Tarih DESC, tb.ID DESC`,
      { since, firmaId: user.id }
    );
  }

  // ---- Faturalar ----
  let faturaRows: FaturaEvent[] = [];
  if (isAdmin(user)) {
    faturaRows = await query<FaturaEvent>(
      `SELECT TOP 30 ID, Fatura_No, Toplam AS Tutar, Tarih
       FROM Fatura
       WHERE Tarih >= @since
       ORDER BY Tarih DESC, ID DESC`,
      { since }
    );
  } else {
    faturaRows = await query<FaturaEvent>(
      `SELECT TOP 30 ID, Fatura_No, Toplam AS Tutar, Tarih
       FROM Fatura
       WHERE Tarih >= @since
         AND (FaturaFirmaID = @firmaId OR Proje_ID = @firmaId)
       ORDER BY Tarih DESC, ID DESC`,
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
  // DB tetikleyici (TR_TalepDurumLog) Talep.Durum her değiştiğinde
  // dbo.TalepDurumLog'a satır yazar. Burada müşterinin kendi talepleri
  // için son N gündeki değişimleri okuyoruz.
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
      `SELECT TOP 50
          l.ID AS LogID, l.TalepID, l.EskiDurum, l.YeniDurum, l.Tarih,
          COALESCE(t.DisTalepKodu, CONCAT('UQ', CAST(t.TalepNo AS varchar))) AS TalepNoText
       FROM dbo.TalepDurumLog l
       INNER JOIN dbo.Talep t ON t.ID = l.TalepID
       WHERE l.Tarih >= @since
         AND l.YeniDurum <> N'Pasif'
         AND t.Durum <> N'Pasif'
       ORDER BY l.Tarih DESC, l.ID DESC`,
      { since }
    );
  } else if (user.kod) {
    durumRows = await query<TalepDurumEvent>(
      `SELECT TOP 50
          l.ID AS LogID, l.TalepID, l.EskiDurum, l.YeniDurum, l.Tarih,
          COALESCE(t.DisTalepKodu, CONCAT('UQ', CAST(t.TalepNo AS varchar))) AS TalepNoText
       FROM dbo.TalepDurumLog l
       INNER JOIN dbo.Talep t ON t.ID = l.TalepID
       WHERE l.Tarih >= @since
         AND l.YeniDurum <> N'Pasif'
         AND t.Durum <> N'Pasif'
         AND t.FirmaKodu = @kod
       ORDER BY l.Tarih DESC, l.ID DESC`,
      { since, kod: user.kod }
    );
  }

  for (const d of durumRows) {
    const yeni = d.YeniDurum ?? "—";
    const eski = d.EskiDurum;
    // Bazı durum geçişlerinde müşteriyi doğrudan ilgili modüle yönlendir:
    //  - "Analiz Aşamasında" → /termin (Termin Takibi)
    //  - "Raporlandı"        → /belgeler (Belgelerim)
    //  - Diğer durumlar      → /talepler/[id] detayı
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

  // ---- NKR rapor yayını → "Raporunuz yayınlandı" ----
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
      `SELECT TOP 50
          o.ID AS OnayID, o.NkrID, n.RaporNo, n.Numune_Adi AS NumuneAd,
          o.RaporFormati, o.YayinTarihi AS Tarih
       FROM cosmoroot.NKR_RaporOnay o
       INNER JOIN dbo.NKR n ON n.ID = o.NkrID
       WHERE o.YayinTarihi >= @since
         AND o.YayinUrl IS NOT NULL
         AND LTRIM(RTRIM(o.YayinUrl)) <> ''
         AND n.Durum = N'Aktif'
         ${firmaFilter}
       ORDER BY o.YayinTarihi DESC, o.ID DESC`,
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

  // ---- Numune durumu — "Kabul Bekliyor" ve "Analiz Aşamasında" ----
  // İki ayrı sinyal:
  //   1) NKR.Tarih → numune kaydı → "Numunenizin kayıt aşamasında"
  //   2) NKR_LabKabul satırının oluşması → o (BolumID, RaporFormati) için
  //      analizler "Analiz aşamasında"ya geçer → bildirim.
  // Rapor_Durumu 'Raporlandı' olanlar tamamen filtrelenir.
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
      `SELECT TOP 50
          n.ID AS NkrID, n.Evrak_No, n.RaporNo, n.Numune_Adi, n.Tarih
       FROM dbo.NKR n
       WHERE n.Durum = N'Aktif'
         AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> N'Raporlandı')
         AND n.Tarih >= @since
         ${firmaFilter}
       ORDER BY n.Tarih DESC, n.ID DESC`,
      params
    );

    // NKR_LabKabul satırı oluştuğunda o (Bölüm × Format) grubu kabul edilmiş
    // demektir. Tarih önceliği: OlusturmaTarihi (gerçek INSERT anı,
    // DEFAULT GETDATE) → KabulTarihi (manuel) → NKR.Tarih (fallback).
    analizRows = await query<NumuneAnalizEvent>(
      `SELECT TOP 50
          k.ID AS LabID, k.NkrID,
          n.Evrak_No, n.RaporNo, n.Numune_Adi,
          k.RaporFormati,
          COALESCE(k.OlusturmaTarihi, k.KabulTarihi, n.Tarih) AS Tarih
       FROM cosmoroot.NKR_LabKabul k
       INNER JOIN dbo.NKR n ON n.ID = k.NkrID
       WHERE n.Durum = N'Aktif'
         AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> N'Raporlandı')
         AND COALESCE(k.OlusturmaTarihi, k.KabulTarihi, n.Tarih) >= @since
         ${firmaFilter}
       ORDER BY k.ID DESC`,
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
    // Admin: yeni açılan ticketlar
    const yeniTicketlar = await query<DestekYeniEvent>(
      `SELECT TOP 30 d.TalepID, d.BASLIK, d.KAYIT_TARIHI, f.Firma_Adi AS KayitEdenFirma
       FROM DESTEK d
       LEFT JOIN Firma f ON f.ID = d.KAYIT_EDEN
       WHERE d.Tarih >= @since
       ORDER BY d.Tarih DESC, d.ID DESC`,
      { since }
    );
    for (const t of yeniTicketlar) {
      const tarih = parseTarihText(t.KAYIT_TARIHI);
      all.push({
        id: `destek-yeni-${t.TalepID}`,
        type: "destek-yeni",
        title: `Yeni destek talebi: ${t.BASLIK ?? "Konu belirtilmemiş"}`,
        subtitle: t.KayitEdenFirma ?? "Bilinmeyen firma",
        link: `/destek/${t.TalepID}`,
        tarih: tarih ?? since,
      });
    }

    // Admin: müşterinin yanıtları
    const musteriYanitlari = await query<DestekYanitEvent>(
      `SELECT TOP 30 dd.DETAY_ID, dd.DESTEK_REF, dd.MESAJ, dd.MESAJ_TARIHI,
              d.BASLIK AS Baslik,
              f.Firma_Adi AS GonderenAdi
       FROM DESTEK_DETAY dd
       INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
       LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
       WHERE f.Tur <> 'Admin'
         AND TRY_CAST(dd.MESAJ_TARIHI AS datetime) >= @since
       ORDER BY dd.DETAY_ID DESC`,
      { since }
    );
    for (const m of musteriYanitlari) {
      const tarih = parseTarihText(m.MESAJ_TARIHI);
      all.push({
        id: `destek-yanit-${m.DETAY_ID}`,
        type: "destek-yanit",
        title: `Müşteri yanıt verdi: ${m.Baslik ?? "Destek talebi"}`,
        subtitle: m.GonderenAdi ?? "",
        link: `/destek/${m.DESTEK_REF}`,
        tarih: tarih ?? since,
      });
    }
  } else if (user.kod) {
    // Müşteri/Proje: kendi taleplerine gelen admin yanıtları
    const adminYanitlari = await query<DestekYanitEvent>(
      `SELECT TOP 30 dd.DETAY_ID, dd.DESTEK_REF, dd.MESAJ, dd.MESAJ_TARIHI,
              d.BASLIK AS Baslik,
              f.Firma_Adi AS GonderenAdi
       FROM DESTEK_DETAY dd
       INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
       LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
       WHERE d.FirmaKodu = @kod
         AND f.Tur = 'Admin'
         AND TRY_CAST(dd.MESAJ_TARIHI AS datetime) >= @since
       ORDER BY dd.DETAY_ID DESC`,
      { since, kod: user.kod }
    );
    for (const m of adminYanitlari) {
      const tarih = parseTarihText(m.MESAJ_TARIHI);
      all.push({
        id: `destek-yanit-${m.DETAY_ID}`,
        type: "destek-yanit",
        title: `Destek yanıtı: ${m.Baslik ?? "Talebiniz"}`,
        subtitle: m.MESAJ ? truncate(m.MESAJ, 80) : (m.GonderenAdi ?? ""),
        link: `/destek/${m.DESTEK_REF}`,
        tarih: tarih ?? since,
      });
    }
  }

  // Tarihe göre azalan sırala, en fazla 50 göster
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
  // UPSERT
  await query(
    `MERGE BildirimOkuma AS target
     USING (SELECT @id AS FirmaID) AS src ON target.FirmaID = src.FirmaID
     WHEN MATCHED THEN UPDATE SET SonGoruldu = GETDATE()
     WHEN NOT MATCHED THEN INSERT (FirmaID, SonGoruldu) VALUES (@id, GETDATE());`,
    { id: firmaId }
  );
}

export function countUnread(bildirimler: Bildirim[], lastSeen: Date | null): number {
  if (!lastSeen) return bildirimler.length;
  return bildirimler.filter((b) => b.tarih > lastSeen).length;
}
