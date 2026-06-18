"use server";

import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db-mysql";
import {
  sendEmail,
  injectNote,
  emailLayout,
  raporYuklendiTemplate,
  teklifOlusturulduTemplate,
  faturaOlusturulduTemplate,
  destekYanitTemplate,
} from "@/lib/email";

export type MailKayitTuru = "rapor" | "teklif" | "fatura" | "destek";

export interface MailDraft {
  to: string;
  subject: string;
  bodyHtml: string;
  firmaAdi: string;
  kayitOzeti: string;   // ör: "T-188 · Fiyat teklifimiz"
}

export interface MailDraftResult {
  draft?: MailDraft;
  error?: string;
}

/**
 * Bir kayıt için mail draft'ı hazırlar — gönderilmeden önce admin
 * üzerinde düzenleyebilir.
 */
export async function loadMailDraftAction(
  tur: MailKayitTuru,
  id: number
): Promise<MailDraftResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  if (!Number.isInteger(id)) {
    return { error: "Geçersiz kayıt ID'si." };
  }

  let to = "";
  let firmaAdi = "Müşterimiz";
  let subject = "";
  let html = "";
  let ozet = "";

  if (tur === "rapor") {
    const r = await queryOne<{
      ID: number;
      RaporID: string | null;
      RaporNo: number | null;
      NumuneAd: string | null;
      Firma_Adi: string | null;
      Mail: string | null;
    }>(
      `SELECT r.ID, r.RaporID, r.RaporNo, r.NumuneAd, f.Firma_Adi, f.Mail
       FROM Rapor r LEFT JOIN Firma f ON f.ID = r.FirmaID
       WHERE r.ID = @id`,
      { id }
    );
    if (!r) return { error: "Rapor bulunamadı." };
    to = r.Mail ?? "";
    firmaAdi = r.Firma_Adi ?? firmaAdi;
    const tpl = raporYuklendiTemplate({
      firmaAdi,
      raporAdi: r.NumuneAd ?? r.RaporID ?? `Rapor #${r.ID}`,
      raporNo: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
    });
    subject = tpl.subject;
    html = tpl.html;
    ozet = `${r.RaporID ?? `R-${r.RaporNo ?? r.ID}`} · ${r.NumuneAd ?? ""}`;
  } else if (tur === "teklif") {
    const t = await queryOne<{
      ID: number;
      TeklifNoText: string;
      Notlar: string | null;
      Firma_Adi: string | null;
      Mail: string | null;
    }>(
      `SELECT
          tb.ID,
          CONCAT(
            COALESCE(tb.DisTeklifKodu, CONCAT('UQ', tb.TeklifNo)),
            '/',
            LPAD(tb.RevNo, 2, '0')
          ) AS TeklifNoText,
          tb.Notlar,
          f.Firma_Adi, f.Mail
       FROM TeklifBaslik tb
       LEFT JOIN Firma f ON f.ID = tb.MusteriID
       WHERE tb.ID = @id
       LIMIT 1`,
      { id }
    );
    if (!t) return { error: "Teklif bulunamadı." };
    to = t.Mail ?? "";
    firmaAdi = t.Firma_Adi ?? firmaAdi;
    const tpl = teklifOlusturulduTemplate({
      firmaAdi,
      teklifNo: t.TeklifNoText,
      aciklama: t.Notlar,
    });
    subject = tpl.subject;
    html = tpl.html;
    ozet = `${t.TeklifNoText}${t.Notlar ? " · " + t.Notlar : ""}`;
  } else if (tur === "fatura") {
    const fa = await queryOne<{
      ID: number;
      Fatura_No: string;
      Toplam: number | null;
      Firma_Adi: string | null;
      Mail: string | null;
    }>(
      `SELECT fa.ID, fa.Fatura_No, fa.Toplam, f.Firma_Adi, f.Mail
       FROM Fatura fa LEFT JOIN Firma f ON f.ID = fa.FaturaFirmaID
       WHERE fa.ID = @id`,
      { id }
    );
    if (!fa) return { error: "Fatura bulunamadı." };
    to = fa.Mail ?? "";
    firmaAdi = fa.Firma_Adi ?? firmaAdi;
    const tpl = faturaOlusturulduTemplate({
      firmaAdi,
      faturaNo: fa.Fatura_No,
      toplam: fa.Toplam,
    });
    subject = tpl.subject;
    html = tpl.html;
    ozet = `${fa.Fatura_No}${fa.Toplam ? " · " + fa.Toplam.toLocaleString("tr-TR") + " ₺" : ""}`;
  } else if (tur === "destek") {
    const d = await queryOne<{
      TalepID: number;
      BASLIK: string | null;
      LastMessage: string | null;
      Firma_Adi: string | null;
      Mail: string | null;
    }>(
      `SELECT d.TalepID, d.BASLIK,
              (SELECT MESAJ FROM DESTEK_DETAY
               WHERE DESTEK_REF = d.TalepID ORDER BY DETAY_ID DESC LIMIT 1) AS LastMessage,
              f.Firma_Adi, f.Mail
       FROM DESTEK d
       LEFT JOIN Firma f ON f.Kod = d.FirmaKodu
       WHERE d.TalepID = @id`,
      { id }
    );
    if (!d) return { error: "Destek talebi bulunamadı." };
    to = d.Mail ?? "";
    firmaAdi = d.Firma_Adi ?? firmaAdi;
    const tpl = destekYanitTemplate({
      firmaAdi,
      baslik: d.BASLIK ?? "Destek talebi",
      talepId: d.TalepID,
      mesajOzeti: (d.LastMessage ?? "").slice(0, 240),
    });
    subject = tpl.subject;
    html = tpl.html;
    ozet = d.BASLIK ?? "Destek talebi";
  } else {
    return { error: "Bilinmeyen kayıt türü." };
  }

  return {
    draft: {
      to,
      subject,
      bodyHtml: html,
      firmaAdi,
      kayitOzeti: ozet,
    },
  };
}

export interface SendCustomMailInput {
  to: string;
  cc?: string;
  subject: string;
  bodyHtml: string;
  note?: string;
}

export interface SendCustomMailResult {
  ok?: boolean;
  message?: string;
  error?: string;
}

/**
 * Düzenlenmiş mail içeriğini gönderir.
 * - to: virgülle ayrılmış birden fazla adres olabilir
 * - cc: opsiyonel
 * - note: bodyHtml içindeki <!--UNIQUE_MAIL_NOTE--> markerına enjekte edilir
 */
export async function sendCustomMailAction(
  input: SendCustomMailInput
): Promise<SendCustomMailResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  const to = input.to?.trim();
  if (!to) return { error: "En az bir alıcı e-postası girin." };
  if (!input.subject?.trim()) return { error: "Konu boş olamaz." };

  // Basit e-mail format doğrulaması (her adres)
  const splitClean = (s: string) =>
    s
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
  const toList = splitClean(to);
  const ccList = input.cc ? splitClean(input.cc) : [];
  const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const allInvalid = [...toList, ...ccList].filter((e) => !isEmail(e));
  if (allInvalid.length) {
    return { error: `Geçersiz e-posta: ${allInvalid.slice(0, 3).join(", ")}` };
  }

  const finalHtml = injectNote(input.bodyHtml, input.note);

  const res = await sendEmail({
    to: toList.join(", "),
    cc: ccList.length ? ccList.join(", ") : undefined,
    subject: input.subject,
    html: finalHtml,
  });

  if (!res.sent) {
    return { error: "Gönderim hatası: " + (res.reason ?? "bilinmiyor") };
  }
  return {
    ok: true,
    message: `Mail gönderildi → ${toList.join(", ")}${
      ccList.length ? " (cc: " + ccList.join(", ") + ")" : ""
    }`,
  };
}

// ----------------------------------------------------------------------
// Bulk rapor mail — /belgeler sayfasında çoklu seçim için
// ----------------------------------------------------------------------

export interface BulkRaporGroup {
  firmaId: number;
  firmaAdi: string;
  mail: string | null;
  raporlar: Array<{
    id: number;
    raporId: string;
    raporAdi: string;
  }>;
}

export interface BulkRaporSingle {
  to: string;
  subject: string;
  bodyHtml: string;
  firmaAdi: string;
  kayitOzeti: string;
}

export interface BulkRaporDraftResult {
  data?: {
    gruplar: BulkRaporGroup[];
    /** Tek firma ise compose modal için hazır HTML/konu */
    single?: BulkRaporSingle;
  };
  error?: string;
}

/**
 * Seçili Rapor ID'leri için firma bazında gruplandırılmış draft döner.
 * Tek firma ise compose modal için tek bir digest payload da içerir.
 */
export async function loadBulkRaporDraftAction(
  raporIds: number[]
): Promise<BulkRaporDraftResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }
  if (!raporIds?.length) {
    return { error: "Seçili rapor yok." };
  }

  const placeholders = raporIds.map((_, i) => `@id${i}`).join(",");
  const params: Record<string, number> = {};
  raporIds.forEach((id, i) => (params[`id${i}`] = id));

  const rows = await query<{
    ID: number;
    RaporID: string | null;
    RaporNo: number | null;
    NumuneAd: string | null;
    FirmaID: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
  }>(
    `SELECT r.ID, r.RaporID, r.RaporNo, r.NumuneAd, r.FirmaID,
            f.Firma_Adi, f.Mail
     FROM Rapor r LEFT JOIN Firma f ON f.ID = r.FirmaID
     WHERE r.ID IN (${placeholders})`,
    params
  );

  const map = new Map<number, BulkRaporGroup>();
  for (const r of rows) {
    if (!r.FirmaID) continue;
    let g = map.get(r.FirmaID);
    if (!g) {
      g = {
        firmaId: r.FirmaID,
        firmaAdi: r.Firma_Adi ?? "Müşterimiz",
        mail: r.Mail,
        raporlar: [],
      };
      map.set(r.FirmaID, g);
    }
    g.raporlar.push({
      id: r.ID,
      raporId: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
      raporAdi: r.NumuneAd ?? r.RaporID ?? `Rapor #${r.ID}`,
    });
  }

  const gruplar = Array.from(map.values()).sort(
    (a, b) => b.raporlar.length - a.raporlar.length
  );

  // Tek firma varsa compose modal için single payload da hazırla
  let single: BulkRaporSingle | undefined;

  if (gruplar.length === 1) {
    const g = gruplar[0];
    const subject =
      g.raporlar.length === 1
        ? `Yeni rapor: ${g.raporlar[0].raporAdi}`
        : `${g.raporlar.length} yeni rapor sizin için hazır`;

    const list = g.raporlar
      .map(
        (r) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #edebe9;font-size:14px;"><div style="font-weight:600;color:#161519;">${r.raporAdi}</div><div style="font-size:12px;color:#585866;font-family:'JetBrains Mono',monospace;">${r.raporId}</div></td></tr>`
      )
      .join("");

    const bodyHtml = emailLayout({
      title:
        g.raporlar.length === 1
          ? "Raporunuz hazır"
          : "Yeni raporlarınız hazır",
      preheader: `${g.raporlar.length} rapor portalda paylaşıldı`,
      bodyHtml: `
        <p>Sayın <strong>${g.firmaAdi}</strong>,</p>
        <p>Sizinle paylaşılan rapor${g.raporlar.length > 1 ? "lar" : ""} aşağıdadır:</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #edebe9;border-collapse:collapse;margin-top:16px;">${list}</table>
      `,
      ctaLabel: "Belgelere Git",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/belgeler",
    });

    single = {
      to: g.mail ?? "",
      subject,
      bodyHtml,
      firmaAdi: g.firmaAdi,
      kayitOzeti: `${g.raporlar.length} belge`,
    };
  }

  return { data: { gruplar, single } };
}

export interface BulkSendResult {
  ok?: boolean;
  sent?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
}

/**
 * Çoklu firma → her firmaya kendi raporları için ayrı digest mail.
 * Note tüm mailler için ortak (her birine enjekte edilir).
 */
export async function sendBulkRaporMailsAction(
  raporIds: number[],
  note?: string
): Promise<BulkSendResult> {
  try {
    await requireAdmin();
  } catch {
    return { errors: ["Yetkisiz işlem."] };
  }

  const draft = await loadBulkRaporDraftAction(raporIds);
  if (draft.error) return { errors: [draft.error] };
  if (!draft.data) return { errors: ["Draft hazırlanamadı."] };

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const g of draft.data.gruplar) {
    if (!g.mail) {
      skipped++;
      continue;
    }
    const list = g.raporlar
      .map(
        (r) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #edebe9;font-size:14px;"><div style="font-weight:600;color:#161519;">${r.raporAdi}</div><div style="font-size:12px;color:#585866;font-family:'JetBrains Mono',monospace;">${r.raporId}</div></td></tr>`
      )
      .join("");

    const html = emailLayout({
      title:
        g.raporlar.length === 1
          ? "Raporunuz hazır"
          : "Yeni raporlarınız hazır",
      preheader: `${g.raporlar.length} rapor portalda paylaşıldı`,
      bodyHtml: `
        <p>Sayın <strong>${g.firmaAdi}</strong>,</p>
        <p>Sizinle paylaşılan rapor${g.raporlar.length > 1 ? "lar" : ""} aşağıdadır:</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #edebe9;border-collapse:collapse;margin-top:16px;">${list}</table>
      `,
      ctaLabel: "Belgelere Git",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/belgeler",
    });

    const finalHtml = injectNote(html, note);
    const subject =
      g.raporlar.length === 1
        ? `Yeni rapor: ${g.raporlar[0].raporAdi}`
        : `${g.raporlar.length} yeni rapor sizin için hazır`;

    const res = await sendEmail({ to: g.mail, subject, html: finalHtml });
    if (res.sent) sent++;
    else {
      skipped++;
      errors.push(`${g.firmaAdi}: ${res.reason}`);
    }
  }

  return {
    ok: true,
    sent,
    skipped,
    errors,
    message: `${sent} firmaya mail gönderildi${skipped ? ` (${skipped} atlandı)` : ""}`,
  };
}
