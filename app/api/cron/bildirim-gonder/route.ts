/**
 * Vercel Cron — yeni iş olaylarını yakalayıp ilgili kişilere mail gönderir.
 *
 * Çalışma akışı:
 * 1. Son 24 saatte yaratılan Rapor / TeklifX1 / Fatura / DESTEK / DESTEK_DETAY
 *    kayıtlarını çek.
 * 2. Her olay için ilgili Firma'nın Mail adresini bul.
 * 3. BildirimGonderim tablosundan henüz gönderilmemiş olanları seç.
 * 4. Resend ile mail at, başarılı olanları BildirimGonderim'e yaz.
 *
 * Güvenlik: CRON_SECRET ile authorize. Vercel cron header otomatik gönderir.
 */

import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import {
  sendEmail,
  raporYuklendiTemplate,
  teklifOlusturulduTemplate,
  faturaOlusturulduTemplate,
  destekYeniTemplate,
  destekYanitTemplate,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let __tableEnsured = false;
async function ensureTable() {
  if (__tableEnsured) return;
  await query(
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BildirimGonderim'
     )
     CREATE TABLE BildirimGonderim (
       BildirimID varchar(60) NOT NULL,
       Kanal varchar(20) NOT NULL,
       GonderildiTarih datetime NOT NULL CONSTRAINT DF_BG_Tarih DEFAULT GETDATE(),
       Hedef varchar(255) NULL,
       Sonuc varchar(255) NULL,
       CONSTRAINT PK_BildirimGonderim PRIMARY KEY (BildirimID, Kanal)
     )`
  );
  __tableEnsured = true;
}

async function alreadySent(id: string, kanal: string): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM BildirimGonderim
     WHERE BildirimID = @id AND Kanal = @kanal`,
    { id, kanal }
  );
  return (r?.n ?? 0) > 0;
}

async function markSent(
  id: string,
  kanal: string,
  hedef: string,
  sonuc: string
) {
  await query(
    `INSERT INTO BildirimGonderim (BildirimID, Kanal, Hedef, Sonuc)
     VALUES (@id, @kanal, @hedef, @sonuc)`,
    { id, kanal, hedef, sonuc }
  );
}

interface CronStats {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
}

async function processBatch(
  events: Array<{
    bildirimId: string;
    mail: string | null;
    subject: string;
    html: string;
  }>,
  stats: CronStats
) {
  for (const ev of events) {
    stats.scanned++;
    if (!ev.mail) {
      stats.skipped++;
      continue;
    }
    if (await alreadySent(ev.bildirimId, "email")) {
      stats.skipped++;
      continue;
    }
    const res = await sendEmail({
      to: ev.mail,
      subject: ev.subject,
      html: ev.html,
    });
    if (res.sent) {
      stats.sent++;
      await markSent(ev.bildirimId, "email", ev.mail, res.id ?? "ok");
    } else {
      stats.errors++;
      await markSent(ev.bildirimId, "email", ev.mail, `ERR: ${res.reason}`);
    }
  }
}

export async function GET(request: Request) {
  // Cron auth
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stats: CronStats = { scanned: 0, sent: 0, skipped: 0, errors: 0 };

  // ---- Rapor → müşteriye mail ----
  const raporlar = await query<{
    ID: number;
    RaporID: string | null;
    RaporNo: number | null;
    NumuneAd: string | null;
    FirmaID: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
  }>(
    `SELECT TOP 200 r.ID, r.RaporID, r.RaporNo, r.NumuneAd, r.FirmaID,
            f.Firma_Adi, f.Mail
     FROM Rapor r
     LEFT JOIN Firma f ON f.ID = r.FirmaID
     WHERE r.Durum = 'Aktif' AND r.Tarih >= @since
     ORDER BY r.ID DESC`,
    { since }
  );
  await processBatch(
    raporlar.map((r) => {
      const t = raporYuklendiTemplate({
        firmaAdi: r.Firma_Adi ?? "Müşterimiz",
        raporAdi: r.NumuneAd ?? r.RaporID ?? `#${r.ID}`,
        raporNo: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
      });
      return {
        bildirimId: `rapor-${r.ID}`,
        mail: r.Mail,
        subject: t.subject,
        html: t.html,
      };
    }),
    stats
  );

  // ---- Teklif → müşteriye mail ----
  const teklifler = await query<{
    ID: number;
    TeklifNo: number;
    Aciklama: string | null;
    Firma_Adi: string | null;
    Mail: string | null;
  }>(
    `SELECT TOP 200 t.ID, t.TeklifNo, t.Aciklama, f.Firma_Adi, f.Mail
     FROM TeklifX1 t
     LEFT JOIN Firma f ON f.ID = t.FirmaID
     WHERE t.Tarih >= @since
     ORDER BY t.ID DESC`,
    { since }
  );
  await processBatch(
    teklifler.map((t) => {
      const tpl = teklifOlusturulduTemplate({
        firmaAdi: t.Firma_Adi ?? "Müşterimiz",
        teklifNo: `T-${t.TeklifNo}`,
        aciklama: t.Aciklama,
      });
      return {
        bildirimId: `teklif-${t.ID}`,
        mail: t.Mail,
        subject: tpl.subject,
        html: tpl.html,
      };
    }),
    stats
  );

  // ---- Fatura → müşteriye mail ----
  const faturalar = await query<{
    ID: number;
    Fatura_No: string;
    Toplam: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
  }>(
    `SELECT TOP 200 fa.ID, fa.Fatura_No, fa.Toplam, f.Firma_Adi, f.Mail
     FROM Fatura fa
     LEFT JOIN Firma f ON f.ID = fa.FaturaFirmaID
     WHERE fa.Tarih >= @since
     ORDER BY fa.ID DESC`,
    { since }
  );
  await processBatch(
    faturalar.map((fa) => {
      const tpl = faturaOlusturulduTemplate({
        firmaAdi: fa.Firma_Adi ?? "Müşterimiz",
        faturaNo: fa.Fatura_No,
        toplam: fa.Toplam,
      });
      return {
        bildirimId: `fatura-${fa.ID}`,
        mail: fa.Mail,
        subject: tpl.subject,
        html: tpl.html,
      };
    }),
    stats
  );

  // ---- Yeni destek talebi → admin grubuna mail ----
  const adminMail = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminMail) {
    const yeniTicketlar = await query<{
      TalepID: number;
      BASLIK: string | null;
      AcanFirma: string | null;
    }>(
      `SELECT TOP 50 d.TalepID, d.BASLIK, f.Firma_Adi AS AcanFirma
       FROM DESTEK d
       LEFT JOIN Firma f ON f.ID = d.KAYIT_EDEN
       WHERE d.Tarih >= @since`,
      { since }
    );
    await processBatch(
      yeniTicketlar.map((d) => {
        const tpl = destekYeniTemplate({
          baslik: d.BASLIK ?? "Konu belirtilmemiş",
          acanFirma: d.AcanFirma ?? "Bilinmeyen firma",
          talepId: d.TalepID,
        });
        return {
          bildirimId: `destek-yeni-${d.TalepID}`,
          mail: adminMail,
          subject: tpl.subject,
          html: tpl.html,
        };
      }),
      stats
    );
  }

  // ---- Admin yanıtı → müşteriye mail ----
  const adminYanitlari = await query<{
    DETAY_ID: number;
    DESTEK_REF: number;
    MESAJ: string | null;
    Baslik: string | null;
    MusteriFirma: string | null;
    MusteriMail: string | null;
  }>(
    `SELECT TOP 100 dd.DETAY_ID, dd.DESTEK_REF, dd.MESAJ,
            d.BASLIK AS Baslik,
            mf.Firma_Adi AS MusteriFirma,
            mf.Mail AS MusteriMail
     FROM DESTEK_DETAY dd
     INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
     LEFT JOIN Firma sender ON sender.ID = dd.KAYIT_EDEN
     LEFT JOIN Firma mf ON mf.Kod = d.FirmaKodu
     WHERE sender.Tur = 'Admin'
       AND TRY_CAST(dd.MESAJ_TARIHI AS datetime) >= @since`,
    { since }
  );
  await processBatch(
    adminYanitlari.map((m) => {
      const tpl = destekYanitTemplate({
        firmaAdi: m.MusteriFirma ?? "Müşterimiz",
        baslik: m.Baslik ?? "Destek talebi",
        talepId: m.DESTEK_REF,
        mesajOzeti: (m.MESAJ ?? "").slice(0, 240),
      });
      return {
        bildirimId: `destek-yanit-${m.DETAY_ID}`,
        mail: m.MusteriMail,
        subject: tpl.subject,
        html: tpl.html,
      };
    }),
    stats
  );

  return NextResponse.json({ ok: true, stats });
}
