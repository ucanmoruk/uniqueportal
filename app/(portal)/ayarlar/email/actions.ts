"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveEmailAyar } from "@/lib/repositories/email-ayar";
import { sendEmail, verifyEmailConfig } from "@/lib/email";
import { userMessage } from "@/lib/errors";

const Schema = z.object({
  Host: z.string().min(1, "SMTP host zorunlu.").max(255),
  Port: z.coerce.number().int().min(1).max(65535).default(587),
  Secure: z.boolean(),
  Username: z.string().max(255).default(""),
  Sifre: z.string().max(500).default(""),
  FromEmail: z
    .string()
    .email("Geçerli gönderen e-postası girin.")
    .max(255),
  FromName: z.string().max(150).default("UNIQUE Portal"),
  Aktif: z.boolean(),
});

export interface EmailAyarState {
  ok?: boolean;
  error?: string;
  message?: string;
}

export async function saveEmailAyarAction(
  _prev: EmailAyarState,
  formData: FormData
): Promise<EmailAyarState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  const payload = {
    Host: formData.get("Host")?.toString() ?? "",
    Port: formData.get("Port")?.toString() ?? "587",
    Secure: formData.get("Secure") === "on",
    Username: formData.get("Username")?.toString() ?? "",
    Sifre: formData.get("Sifre")?.toString() ?? "",
    FromEmail: formData.get("FromEmail")?.toString() ?? "",
    FromName: formData.get("FromName")?.toString() ?? "UNIQUE Portal",
    Aktif: formData.get("Aktif") === "on",
  };

  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." };
  }

  try {
    await saveEmailAyar(parsed.data);
    revalidatePath("/ayarlar/email");
    return { ok: true, message: "Ayarlar kaydedildi." };
  } catch (err) {
    return { error: userMessage(err, "Ayarlar kaydedilemedi. Lütfen tekrar deneyin.") };
  }
}

export interface TestMailState {
  ok?: boolean;
  error?: string;
  message?: string;
}

export async function testMailAction(
  _prev: TestMailState,
  formData: FormData
): Promise<TestMailState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  const to = formData.get("to")?.toString().trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { error: "Geçerli bir e-posta adresi girin." };
  }

  // Önce bağlantıyı doğrula
  const verify = await verifyEmailConfig();
  if (!verify.sent) {
    return { error: "SMTP bağlantı hatası: " + (verify.reason ?? "bilinmiyor") };
  }

  const res = await sendEmail({
    to,
    subject: "UNIQUE Portal — Test E-postası",
    html: `<!doctype html>
<html><body style="font-family:-apple-system,sans-serif;padding:32px;">
  <h2 style="color:#463aed;">SMTP Ayarları Çalışıyor ✓</h2>
  <p>Bu mesaj UNIQUE Services Portal'daki SMTP yapılandırmasının doğru olduğunu teyit eder.</p>
  <p style="color:#585866;font-size:13px;">Gönderim zamanı: ${new Date().toLocaleString("tr-TR")}</p>
</body></html>`,
  });

  if (!res.sent) {
    return { error: "Gönderim hatası: " + (res.reason ?? "bilinmiyor") };
  }
  return { ok: true, message: `Test maili ${to} adresine gönderildi.` };
}
