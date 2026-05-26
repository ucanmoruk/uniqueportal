import nodemailer from "nodemailer";
import { getEmailAyar } from "@/lib/repositories/email-ayar";

let __transporter: nodemailer.Transporter | null = null;
let __cachedSettings: string | null = null;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const ayar = await getEmailAyar();
  if (!ayar || !ayar.Aktif || !ayar.Host || !ayar.FromEmail) return null;

  const fingerprint = `${ayar.Host}|${ayar.Port}|${ayar.Secure}|${ayar.Username}|${ayar.Sifre}`;
  if (__transporter && __cachedSettings === fingerprint) return __transporter;

  __transporter = nodemailer.createTransport({
    host: ayar.Host,
    port: ayar.Port,
    secure: ayar.Secure,
    auth: ayar.Username
      ? {
          user: ayar.Username,
          pass: ayar.Sifre,
        }
      : undefined,
  });
  __cachedSettings = fingerprint;
  return __transporter;
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  sent: boolean;
  reason?: string;
  id?: string;
}

/**
 * E-posta gönderir. EmailAyar tablosunda yapılandırma yoksa no-op döner.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: EmailParams): Promise<EmailResult> {
  const transporter = await getTransporter();
  const ayar = await getEmailAyar();
  if (!transporter || !ayar) {
    return {
      sent: false,
      reason: "SMTP yapılandırılmadı (Ayarlar > Mail Ayarları)",
    };
  }

  const fromHeader = ayar.FromName
    ? `"${ayar.FromName}" <${ayar.FromEmail}>`
    : ayar.FromEmail;

  try {
    const info = await transporter.sendMail({
      from: fromHeader,
      to,
      subject,
      html,
    });
    return { sent: true, id: info.messageId };
  } catch (err) {
    console.error("[email] gönderim hatası:", err);
    return { sent: false, reason: (err as Error).message };
  }
}

/** SMTP bağlantısı test eder (verify). */
export async function verifyEmailConfig(): Promise<EmailResult> {
  const transporter = await getTransporter();
  if (!transporter) {
    return { sent: false, reason: "SMTP yapılandırılmadı." };
  }
  try {
    await transporter.verify();
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: (err as Error).message };
  }
}

// ---- Email layout + templates --------------------------------------------

export function emailLayout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const base = process.env.AUTH_URL ?? "";
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<a href="${opts.ctaUrl}" style="display:inline-block;background:#463aed;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;font-size:13px;margin-top:24px;">${opts.ctaLabel}</a>`
      : "";

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#161519;line-height:1.5;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${opts.preheader}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #e5e5ea;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e5e5ea;">
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;font-size:14px;color:#161519;">UNIQUE <span style="color:#463aed;">ANALYSE</span></div>
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#585866;">Services Portal</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:22px;line-height:1.2;margin:0 0 16px;color:#161519;letter-spacing:-0.02em;">${opts.title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#161519;">${opts.bodyHtml}</div>
        ${cta}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e5e5ea;background:#fafafa;font-size:12px;color:#585866;">
        ${opts.footerNote ?? "Bu mesaj UNIQUE Services Portal tarafından gönderilmiştir."}
        ${base ? `<div style="margin-top:8px;"><a href="${base}" style="color:#463aed;text-decoration:none;">${base.replace(/^https?:\/\//, "")}</a></div>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// Template'ler
export interface RaporMailData {
  firmaAdi: string;
  raporAdi: string;
  raporNo: string;
}

export function raporYuklendiTemplate(d: RaporMailData) {
  return {
    subject: `Yeni rapor yüklendi: ${d.raporAdi}`,
    html: emailLayout({
      title: "Raporunuz hazır",
      preheader: `${d.raporAdi} raporunuz portala yüklendi.`,
      bodyHtml: `
        <p>Sayın <strong>${d.firmaAdi}</strong>,</p>
        <p>Talebiniz üzerine hazırlanan rapor portala yüklendi:</p>
        <table cellpadding="6" cellspacing="0" border="0" style="margin:16px 0;border:1px solid #e5e5ea;border-collapse:collapse;font-size:14px;">
          <tr><td style="background:#fafafa;border:1px solid #e5e5ea;color:#585866;text-transform:uppercase;font-size:11px;letter-spacing:0.08em;">Rapor No</td><td style="border:1px solid #e5e5ea;">${d.raporNo}</td></tr>
          <tr><td style="background:#fafafa;border:1px solid #e5e5ea;color:#585866;text-transform:uppercase;font-size:11px;letter-spacing:0.08em;">Belge</td><td style="border:1px solid #e5e5ea;">${d.raporAdi}</td></tr>
        </table>
        <p>Raporu portaldan görüntüleyebilir veya indirebilirsiniz.</p>
      `,
      ctaLabel: "Belgelere Git",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/belgeler",
    }),
  };
}

export interface TeklifMailData {
  firmaAdi: string;
  teklifNo: string;
  aciklama?: string | null;
}

export function teklifOlusturulduTemplate(d: TeklifMailData) {
  return {
    subject: `Yeni teklif: ${d.teklifNo}`,
    html: emailLayout({
      title: "Yeni teklifiniz var",
      preheader: `${d.teklifNo} numaralı teklif portala yüklendi.`,
      bodyHtml: `
        <p>Sayın <strong>${d.firmaAdi}</strong>,</p>
        <p>Sizin için <strong>${d.teklifNo}</strong> numaralı teklif hazırlandı.${d.aciklama ? ` Konu: <em>${d.aciklama}</em>.` : ""}</p>
        <p>Teklifi inceleyip portal üzerinden onaylayabilirsiniz.</p>
      `,
      ctaLabel: "Teklifi Görüntüle",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/teklifler",
    }),
  };
}

export interface FaturaMailData {
  firmaAdi: string;
  faturaNo: string;
  toplam: number | null;
}

export function faturaOlusturulduTemplate(d: FaturaMailData) {
  return {
    subject: `Yeni fatura: ${d.faturaNo}`,
    html: emailLayout({
      title: "Yeni faturanız hazır",
      preheader: `${d.faturaNo} numaralı fatura oluşturuldu.`,
      bodyHtml: `
        <p>Sayın <strong>${d.firmaAdi}</strong>,</p>
        <p><strong>${d.faturaNo}</strong> numaralı fatura cari hesabınıza işlendi${d.toplam != null ? ` (toplam: <strong>${d.toplam.toLocaleString("tr-TR")} ₺</strong>)` : ""}.</p>
      `,
      ctaLabel: "Faturalara Git",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/faturalar",
    }),
  };
}

export interface DestekYeniMailData {
  baslik: string;
  acanFirma: string;
  talepId: number;
}

export function destekYeniTemplate(d: DestekYeniMailData) {
  return {
    subject: `Yeni destek talebi: ${d.baslik}`,
    html: emailLayout({
      title: "Yeni destek talebi",
      bodyHtml: `
        <p><strong>${d.acanFirma}</strong> tarafından yeni bir destek talebi açıldı.</p>
        <p><strong>Konu:</strong> ${d.baslik}</p>
      `,
      ctaLabel: "Talebi Aç",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/destek/" + d.talepId,
    }),
  };
}

export interface DestekYanitMailData {
  firmaAdi: string;
  baslik: string;
  talepId: number;
  mesajOzeti: string;
}

export function destekYanitTemplate(d: DestekYanitMailData) {
  return {
    subject: `Destek talebinize yanıt geldi: ${d.baslik}`,
    html: emailLayout({
      title: "Destek talebinize yanıt geldi",
      bodyHtml: `
        <p>Sayın <strong>${d.firmaAdi}</strong>,</p>
        <p><strong>${d.baslik}</strong> başlıklı destek talebinize yeni bir yanıt geldi:</p>
        <blockquote style="margin:16px 0;padding:12px 16px;background:#fafafa;border-left:3px solid #463aed;font-size:14px;color:#161519;">${d.mesajOzeti}</blockquote>
      `,
      ctaLabel: "Talebi Görüntüle",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/destek/" + d.talepId,
    }),
  };
}

// ---- Digest (toplu özet) --------------------------------------------------

export interface DigestItem {
  type: "rapor" | "teklif" | "fatura" | "destek-yanit";
  baslik: string;
  altBaslik?: string;
  link?: string;
}

export interface DigestMailData {
  firmaAdi: string;
  raporlar: DigestItem[];
  teklifler: DigestItem[];
  faturalar: DigestItem[];
  destekYanitlari: DigestItem[];
}

function digestSection(title: string, items: DigestItem[]): string {
  if (items.length === 0) return "";
  const rows = items
    .slice(0, 20)
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #edebe9;font-size:14px;">
          <div style="font-weight:600;color:#161519;">${it.baslik}</div>
          ${
            it.altBaslik
              ? `<div style="font-size:12px;color:#585866;font-family:'JetBrains Mono',monospace;">${it.altBaslik}</div>`
              : ""
          }
        </td>
      </tr>`
    )
    .join("");
  const fazlasi =
    items.length > 20
      ? `<tr><td style="padding:8px 12px;font-size:13px;color:#585866;background:#fafafa;">…ve ${items.length - 20} tane daha</td></tr>`
      : "";

  return `
    <div style="margin-top:24px;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:#585866;margin-bottom:8px;">
        ${title} <span style="color:#463aed;">(${items.length})</span>
      </div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #edebe9;border-collapse:collapse;">
        ${rows}
        ${fazlasi}
      </table>
    </div>`;
}

export function digestTemplate(d: DigestMailData) {
  const total =
    d.raporlar.length +
    d.teklifler.length +
    d.faturalar.length +
    d.destekYanitlari.length;

  if (total === 0) return null;

  const counts: string[] = [];
  if (d.raporlar.length) counts.push(`${d.raporlar.length} rapor`);
  if (d.teklifler.length) counts.push(`${d.teklifler.length} teklif`);
  if (d.faturalar.length) counts.push(`${d.faturalar.length} fatura`);
  if (d.destekYanitlari.length)
    counts.push(`${d.destekYanitlari.length} destek yanıtı`);

  const subjectSummary = counts.join(", ");
  const subject =
    total === 1
      ? buildSingleSubject(d)
      : `${total} yeni güncelleme: ${subjectSummary}`;

  const bodyHtml = `
    <p>Sayın <strong>${d.firmaAdi}</strong>,</p>
    <p>Portal hesabınıza son güncellemeler aşağıdadır:</p>
    ${digestSection("Yeni raporlar", d.raporlar)}
    ${digestSection("Yeni teklifler", d.teklifler)}
    ${digestSection("Yeni faturalar", d.faturalar)}
    ${digestSection("Destek yanıtları", d.destekYanitlari)}
  `;

  return {
    subject,
    html: emailLayout({
      title: "Hesabınızdaki güncellemeler",
      preheader: subjectSummary,
      bodyHtml,
      ctaLabel: "Portala Git",
      ctaUrl: (process.env.AUTH_URL ?? "") + "/ozet",
    }),
  };
}

function buildSingleSubject(d: DigestMailData): string {
  const r = d.raporlar[0];
  if (r) return `Yeni rapor yüklendi: ${r.baslik}`;
  const t = d.teklifler[0];
  if (t) return `Yeni teklif: ${t.baslik}`;
  const f = d.faturalar[0];
  if (f) return `Yeni fatura: ${f.baslik}`;
  const s = d.destekYanitlari[0];
  if (s) return `Destek talebinize yanıt geldi: ${s.baslik}`;
  return "Portal güncellemesi";
}
