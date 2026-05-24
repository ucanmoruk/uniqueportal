/**
 * Vercel Cron — yeni iş olaylarını yakalayıp firma bazında tek bir
 * "digest" mail olarak gönderir.
 *
 * Şema:
 *  1. Son 24 saatte Rapor + TeklifX1 + Fatura + DESTEK_DETAY (admin yanıtı)
 *     yeni kayıtlarını çek.
 *  2. Firma'ya grupla.
 *  3. Her firma için BildirimGonderim'de henüz gönderilmemiş olanları seç.
 *  4. Tek bir digest mail at: 30 rapor = 1 mail (özet liste içinde).
 *  5. Mail başarıyla gittiyse o firmaya ait tüm event'leri BildirimGonderim'e
 *     yaz → bir sonraki cron'da tekrar gönderilmez.
 *
 * Güvenlik: CRON_SECRET ile authorize.
 */

import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import {
  sendEmail,
  digestTemplate,
  destekYeniTemplate,
  type DigestItem,
} from "@/lib/email";
import {
  sendTemplate as sendWhatsAppTemplate,
  toWhatsAppAddress,
  isWhatsAppEnabled,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Tablolar -------------------------------------------------------------

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

// ---- Helpers --------------------------------------------------------------

async function alreadySentIds(
  kanal: string,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  // IN list with parameter (chunked if needed). MSSQL has parameter limit ~2100;
  // 200 ID guvenli.
  const placeholders = ids.map((_, i) => `@b${i}`).join(",");
  const params: Record<string, string> = { kanal };
  ids.forEach((id, i) => (params[`b${i}`] = id));
  const rows = await query<{ BildirimID: string }>(
    `SELECT BildirimID FROM BildirimGonderim
     WHERE Kanal = @kanal AND BildirimID IN (${placeholders})`,
    params
  );
  return new Set(rows.map((r) => r.BildirimID));
}

async function markSent(
  kanal: string,
  ids: string[],
  hedef: string,
  sonuc: string
) {
  for (const id of ids) {
    try {
      await query(
        `INSERT INTO BildirimGonderim (BildirimID, Kanal, Hedef, Sonuc)
         VALUES (@id, @kanal, @hedef, @sonuc)`,
        { id, kanal, hedef, sonuc }
      );
    } catch {
      // Aynı anda iki cron çalışırsa duplicate olabilir, yutuyoruz
    }
  }
}

// ---- Olay toplama ---------------------------------------------------------

interface FirmaBucket {
  firmaId: number;
  firmaAdi: string;
  mail: string;
  telefon: string | null;
  raporlar: Array<{ id: string; item: DigestItem; rawNo?: string }>;
  teklifler: Array<{ id: string; item: DigestItem; rawNo?: string }>;
  faturalar: Array<{ id: string; item: DigestItem; rawNo?: string }>;
  destekYanitlari: Array<{ id: string; item: DigestItem }>;
}

function ensureBucket(
  map: Map<number, FirmaBucket>,
  fid: number,
  ad: string,
  mail: string,
  telefon: string | null
) {
  let b = map.get(fid);
  if (!b) {
    b = {
      firmaId: fid,
      firmaAdi: ad,
      mail,
      telefon,
      raporlar: [],
      teklifler: [],
      faturalar: [],
      destekYanitlari: [],
    };
    map.set(fid, b);
  }
  return b;
}

// WhatsApp template SID'leri Twilio Content API'den gelir (HXxxxx).
// Bu env var'lar yoksa WA kanalı skip edilir.
const WA_TEMPLATE_RAPOR = process.env.TWILIO_WA_TEMPLATE_RAPOR_SID;
const WA_TEMPLATE_TEKLIF = process.env.TWILIO_WA_TEMPLATE_TEKLIF_SID;

// ---- Route ----------------------------------------------------------------

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stats = {
    scanned: 0,
    firmsWithUpdates: 0,
    mailsSent: 0,
    skippedNoMail: 0,
    adminTicketsSent: 0,
    waSent: 0,
    waSkipped: 0,
    errors: 0,
  };

  const buckets = new Map<number, FirmaBucket>();

  // ---- Rapor ----
  const raporlar = await query<{
    ID: number;
    RaporID: string | null;
    RaporNo: number | null;
    NumuneAd: string | null;
    FirmaID: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
    Telefon: string | null;
  }>(
    `SELECT TOP 500 r.ID, r.RaporID, r.RaporNo, r.NumuneAd, r.FirmaID,
            f.Firma_Adi, f.Mail, f.Telefon
     FROM Rapor r
     LEFT JOIN Firma f ON f.ID = r.FirmaID
     WHERE r.Durum = 'Aktif' AND r.Tarih >= @since
       AND r.FirmaID IS NOT NULL
       AND f.Mail IS NOT NULL AND LEN(f.Mail) > 3
     ORDER BY r.ID DESC`,
    { since }
  );
  stats.scanned += raporlar.length;
  for (const r of raporlar) {
    const id = `rapor-${r.ID}`;
    const b = ensureBucket(buckets, r.FirmaID!, r.Firma_Adi ?? "Müşterimiz", r.Mail!, r.Telefon);
    b.raporlar.push({
      id,
      rawNo: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
      item: {
        type: "rapor",
        baslik: r.NumuneAd ?? r.RaporID ?? `Rapor #${r.ID}`,
        altBaslik: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
      },
    });
  }

  // ---- Teklif ----
  const teklifler = await query<{
    ID: number;
    TeklifNo: number;
    Aciklama: string | null;
    FirmaID: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
    Telefon: string | null;
  }>(
    `SELECT TOP 200 t.ID, t.TeklifNo, t.Aciklama, t.FirmaID,
            f.Firma_Adi, f.Mail, f.Telefon
     FROM TeklifX1 t
     LEFT JOIN Firma f ON f.ID = t.FirmaID
     WHERE t.Tarih >= @since
       AND t.FirmaID IS NOT NULL
       AND f.Mail IS NOT NULL AND LEN(f.Mail) > 3
     ORDER BY t.ID DESC`,
    { since }
  );
  stats.scanned += teklifler.length;
  for (const t of teklifler) {
    const id = `teklif-${t.ID}`;
    const b = ensureBucket(buckets, t.FirmaID!, t.Firma_Adi ?? "Müşterimiz", t.Mail!, t.Telefon);
    b.teklifler.push({
      id,
      rawNo: `T-${t.TeklifNo}`,
      item: {
        type: "teklif",
        baslik: `T-${t.TeklifNo}`,
        altBaslik: t.Aciklama ?? undefined,
      },
    });
  }

  // ---- Fatura ----
  const faturalar = await query<{
    ID: number;
    Fatura_No: string;
    Toplam: number | null;
    FaturaFirmaID: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
    Telefon: string | null;
  }>(
    `SELECT TOP 200 fa.ID, fa.Fatura_No, fa.Toplam, fa.FaturaFirmaID,
            f.Firma_Adi, f.Mail, f.Telefon
     FROM Fatura fa
     LEFT JOIN Firma f ON f.ID = fa.FaturaFirmaID
     WHERE fa.Tarih >= @since
       AND fa.FaturaFirmaID IS NOT NULL
       AND f.Mail IS NOT NULL AND LEN(f.Mail) > 3
     ORDER BY fa.ID DESC`,
    { since }
  );
  stats.scanned += faturalar.length;
  for (const fa of faturalar) {
    const id = `fatura-${fa.ID}`;
    const b = ensureBucket(buckets, fa.FaturaFirmaID!, fa.Firma_Adi ?? "Müşterimiz", fa.Mail!, fa.Telefon);
    b.faturalar.push({
      id,
      item: {
        type: "fatura",
        baslik: fa.Fatura_No,
        altBaslik:
          fa.Toplam != null
            ? fa.Toplam.toLocaleString("tr-TR") + " ₺"
            : undefined,
      },
    });
  }

  // ---- Admin yanıtı → müşteriye ----
  const adminYanitlari = await query<{
    DETAY_ID: number;
    DESTEK_REF: number;
    MESAJ: string | null;
    Baslik: string | null;
    MusteriFirmaID: number | null;
    MusteriFirmaAdi: string | null;
    MusteriMail: string | null;
    MusteriTelefon: string | null;
  }>(
    `SELECT TOP 200 dd.DETAY_ID, dd.DESTEK_REF, dd.MESAJ,
            d.BASLIK AS Baslik,
            mf.ID AS MusteriFirmaID,
            mf.Firma_Adi AS MusteriFirmaAdi,
            mf.Mail AS MusteriMail,
            mf.Telefon AS MusteriTelefon
     FROM DESTEK_DETAY dd
     INNER JOIN DESTEK d ON d.TalepID = dd.DESTEK_REF
     LEFT JOIN Firma sender ON sender.ID = dd.KAYIT_EDEN
     LEFT JOIN Firma mf ON mf.Kod = d.FirmaKodu
     WHERE sender.Tur = 'Admin'
       AND mf.Mail IS NOT NULL AND LEN(mf.Mail) > 3
       AND TRY_CAST(dd.MESAJ_TARIHI AS datetime) >= @since`,
    { since }
  );
  stats.scanned += adminYanitlari.length;
  for (const m of adminYanitlari) {
    if (!m.MusteriFirmaID) continue;
    const id = `destek-yanit-${m.DETAY_ID}`;
    const b = ensureBucket(
      buckets,
      m.MusteriFirmaID,
      m.MusteriFirmaAdi ?? "Müşterimiz",
      m.MusteriMail!,
      m.MusteriTelefon
    );
    b.destekYanitlari.push({
      id,
      item: {
        type: "destek-yanit",
        baslik: m.Baslik ?? "Destek talebi",
        altBaslik: (m.MESAJ ?? "").slice(0, 80),
      },
    });
  }

  // ---- Her firma için: unsent olanları seç, digest at ----
  for (const bucket of buckets.values()) {
    const allIds = [
      ...bucket.raporlar.map((x) => x.id),
      ...bucket.teklifler.map((x) => x.id),
      ...bucket.faturalar.map((x) => x.id),
      ...bucket.destekYanitlari.map((x) => x.id),
    ];
    const sent = await alreadySentIds("email", allIds);
    const unsent = (arr: typeof bucket.raporlar) =>
      arr.filter((x) => !sent.has(x.id));

    const raporlar = unsent(bucket.raporlar).map((x) => x.item);
    const teklifler = unsent(bucket.teklifler).map((x) => x.item);
    const faturalar = unsent(bucket.faturalar).map((x) => x.item);
    const destekYanitlari = unsent(bucket.destekYanitlari).map((x) => x.item);

    const total =
      raporlar.length + teklifler.length + faturalar.length + destekYanitlari.length;
    if (total === 0) continue;

    stats.firmsWithUpdates++;

    if (!bucket.mail) {
      stats.skippedNoMail++;
      continue;
    }

    const tpl = digestTemplate({
      firmaAdi: bucket.firmaAdi,
      raporlar,
      teklifler,
      faturalar,
      destekYanitlari,
    });
    if (!tpl) continue;

    const res = await sendEmail({
      to: bucket.mail,
      subject: tpl.subject,
      html: tpl.html,
    });

    const unsentIds = [
      ...unsent(bucket.raporlar).map((x) => x.id),
      ...unsent(bucket.teklifler).map((x) => x.id),
      ...unsent(bucket.faturalar).map((x) => x.id),
      ...unsent(bucket.destekYanitlari).map((x) => x.id),
    ];

    if (res.sent) {
      stats.mailsSent++;
      await markSent("email", unsentIds, bucket.mail, res.id ?? "ok");
    } else {
      stats.errors++;
      console.error(
        `[cron] firma=${bucket.firmaId} mail=${bucket.mail} err=${res.reason}`
      );
    }

    // ---- WhatsApp kanalı ----
    // Twilio template SID set edilmişse rapor/teklif bildirimini WA ile gönder.
    if (isWhatsAppEnabled() && bucket.telefon) {
      const wa = toWhatsAppAddress(bucket.telefon);
      if (wa) {
        const waRaporUnsent = unsent(bucket.raporlar);
        const waTeklifUnsent = unsent(bucket.teklifler);

        // Rapor template
        if (WA_TEMPLATE_RAPOR && waRaporUnsent.length > 0) {
          for (const r of waRaporUnsent) {
            const waId = `${r.id}-wa`;
            const already = await alreadySentIds("whatsapp", [waId]);
            if (already.has(waId)) continue;
            const tplRes = await sendWhatsAppTemplate(wa, WA_TEMPLATE_RAPOR, {
              "1": bucket.firmaAdi,
              "2": r.rawNo ?? "—",
              "3": (process.env.AUTH_URL ?? "") + "/belgeler",
            });
            if (tplRes.sent) {
              stats.waSent++;
              await markSent("whatsapp", [waId], wa, tplRes.sid ?? "ok");
            } else {
              stats.errors++;
              console.error(`[wa] rapor ${r.id}:`, tplRes.reason);
            }
          }
        } else if (waRaporUnsent.length > 0) {
          stats.waSkipped += waRaporUnsent.length;
        }

        // Teklif template
        if (WA_TEMPLATE_TEKLIF && waTeklifUnsent.length > 0) {
          for (const t of waTeklifUnsent) {
            const waId = `${t.id}-wa`;
            const already = await alreadySentIds("whatsapp", [waId]);
            if (already.has(waId)) continue;
            const tplRes = await sendWhatsAppTemplate(wa, WA_TEMPLATE_TEKLIF, {
              "1": bucket.firmaAdi,
              "2": t.rawNo ?? "—",
              "3": (process.env.AUTH_URL ?? "") + "/teklifler",
            });
            if (tplRes.sent) {
              stats.waSent++;
              await markSent("whatsapp", [waId], wa, tplRes.sid ?? "ok");
            } else {
              stats.errors++;
              console.error(`[wa] teklif ${t.id}:`, tplRes.reason);
            }
          }
        } else if (waTeklifUnsent.length > 0) {
          stats.waSkipped += waTeklifUnsent.length;
        }
      }
    }
  }

  // ---- Yeni destek talebi → ADMIN_NOTIFY_EMAIL (tek tek, az olay) ----
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

    const ticketIds = yeniTicketlar.map((d) => `destek-yeni-${d.TalepID}`);
    const sentSet = await alreadySentIds("email", ticketIds);

    for (const d of yeniTicketlar) {
      const id = `destek-yeni-${d.TalepID}`;
      if (sentSet.has(id)) continue;
      const tpl = destekYeniTemplate({
        baslik: d.BASLIK ?? "Konu belirtilmemiş",
        acanFirma: d.AcanFirma ?? "Bilinmeyen firma",
        talepId: d.TalepID,
      });
      const res = await sendEmail({
        to: adminMail,
        subject: tpl.subject,
        html: tpl.html,
      });
      if (res.sent) {
        stats.adminTicketsSent++;
        await markSent("email", [id], adminMail, res.id ?? "ok");
      } else {
        stats.errors++;
      }
    }
  }

  return NextResponse.json({ ok: true, stats });
}
