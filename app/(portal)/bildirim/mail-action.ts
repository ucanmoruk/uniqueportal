"use server";

import { requireAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import {
  sendEmail,
  raporYuklendiTemplate,
  teklifOlusturulduTemplate,
  faturaOlusturulduTemplate,
  destekYanitTemplate,
} from "@/lib/email";

export type MailKayitTuru = "rapor" | "teklif" | "fatura" | "destek";

export interface MailNotifyState {
  ok?: boolean;
  message?: string;
  error?: string;
}

/**
 * Tek bir kayıt için müşteriye mail at.
 * Type'a göre uygun template + Firma bilgisi çekilir.
 */
export async function notifyKayitMailAction(
  tur: MailKayitTuru,
  id: number
): Promise<MailNotifyState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  if (!Number.isInteger(id)) {
    return { error: "Geçersiz kayıt ID'si." };
  }

  let to: string | null = null;
  let firmaAdi = "Müşterimiz";
  let subject = "";
  let html = "";

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
    to = r.Mail;
    firmaAdi = r.Firma_Adi ?? firmaAdi;
    const tpl = raporYuklendiTemplate({
      firmaAdi,
      raporAdi: r.NumuneAd ?? r.RaporID ?? `Rapor #${r.ID}`,
      raporNo: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
    });
    subject = tpl.subject;
    html = tpl.html;
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
    to = t.Mail;
    firmaAdi = t.Firma_Adi ?? firmaAdi;
    const tpl = teklifOlusturulduTemplate({
      firmaAdi,
      teklifNo: `T-${t.TeklifNo}`,
      aciklama: t.Aciklama,
    });
    subject = tpl.subject;
    html = tpl.html;
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
    to = fa.Mail;
    firmaAdi = fa.Firma_Adi ?? firmaAdi;
    const tpl = faturaOlusturulduTemplate({
      firmaAdi,
      faturaNo: fa.Fatura_No,
      toplam: fa.Toplam,
    });
    subject = tpl.subject;
    html = tpl.html;
  } else if (tur === "destek") {
    // id = TalepID (DESTEK.TalepID)
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
    to = d.Mail;
    firmaAdi = d.Firma_Adi ?? firmaAdi;
    const tpl = destekYanitTemplate({
      firmaAdi,
      baslik: d.BASLIK ?? "Destek talebi",
      talepId: d.TalepID,
      mesajOzeti: (d.LastMessage ?? "").slice(0, 240),
    });
    subject = tpl.subject;
    html = tpl.html;
  } else {
    return { error: "Bilinmeyen kayıt türü." };
  }

  if (!to || to.length < 3) {
    return {
      error: `${firmaAdi} firmasının e-posta adresi tanımlı değil. Hesabım > Mail alanına ekleyin.`,
    };
  }

  const res = await sendEmail({ to, subject, html });
  if (!res.sent) {
    return { error: "Gönderim hatası: " + (res.reason ?? "bilinmiyor") };
  }
  return { ok: true, message: `Mail ${to} adresine gönderildi.` };
}
