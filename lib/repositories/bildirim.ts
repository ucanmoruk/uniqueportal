import { query, queryOne } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export type BildirimTuru =
  | "rapor"
  | "teklif"
  | "fatura"
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
  TeklifNo: number;
  Aciklama: string | null;
  ParaBirimi: string | null;
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

  // ---- Teklifler ----
  let teklifRows: TeklifEvent[] = [];
  if (isAdmin(user)) {
    teklifRows = await query<TeklifEvent>(
      `SELECT TOP 30 ID, TeklifNo, Aciklama, ParaBirimi, Tarih
       FROM TeklifX1
       WHERE Tarih >= @since
       ORDER BY Tarih DESC, ID DESC`,
      { since }
    );
  } else {
    // Müşteri/Proje: kendi firmasına ait (FirmaID)
    teklifRows = await query<TeklifEvent>(
      `SELECT TOP 30 ID, TeklifNo, Aciklama, ParaBirimi, Tarih
       FROM TeklifX1
       WHERE Tarih >= @since
         AND (FirmaID = @firmaId OR ProjeID = @firmaId)
       ORDER BY Tarih DESC, ID DESC`,
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
    const para = t.ParaBirimi ? ` (${t.ParaBirimi})` : "";
    all.push({
      id: `teklif-${t.ID}`,
      type: "teklif",
      title: `Yeni teklif oluşturuldu${para}`,
      subtitle: t.Aciklama
        ? `T-${t.TeklifNo} · ${t.Aciklama}`
        : `T-${t.TeklifNo}`,
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
