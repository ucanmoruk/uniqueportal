"use server";

import { requireAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import {
  sendEmail,
  injectNote,
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
      TeklifNo: number;
      Aciklama: string | null;
      Firma_Adi: string | null;
      Mail: string | null;
    }>(
      `SELECT t.ID, t.TeklifNo, t.Aciklama, f.Firma_Adi, f.Mail
       FROM TeklifX1 t LEFT JOIN Firma f ON f.ID = t.FirmaID
       WHERE t.ID = @id`,
      { id }
    );
    if (!t) return { error: "Teklif bulunamadı." };
    to = t.Mail ?? "";
    firmaAdi = t.Firma_Adi ?? firmaAdi;
    const tpl = teklifOlusturulduTemplate({
      firmaAdi,
      teklifNo: `T-${t.TeklifNo}`,
      aciklama: t.Aciklama,
    });
    subject = tpl.subject;
    html = tpl.html;
    ozet = `T-${t.TeklifNo}${t.Aciklama ? " · " + t.Aciklama : ""}`;
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
              (SELECT TOP 1 MESAJ FROM DESTEK_DETAY
               WHERE DESTEK_REF = d.TalepID ORDER BY DETAY_ID DESC) AS LastMessage,
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
