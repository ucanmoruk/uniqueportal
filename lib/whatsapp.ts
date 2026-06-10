/**
 * WhatsApp Business — Twilio API wrapper.
 *
 * Environment:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER   ör: "whatsapp:+905551234567"
 *
 * Twilio Console:
 *   Console → Messaging → WhatsApp → Senders → API credentials
 *
 * Onaylı template gönderimi (outbound 24h dışı):
 *   sendTemplate(to, contentSid, vars)
 *
 * Free-form mesaj (24h conversation window içinde, sadece inbound sonrası):
 *   sendText(to, body)
 */

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!accountSid || !authToken || !whatsappNumber) return null;
  return { accountSid, authToken, whatsappNumber };
}

export function isWhatsAppEnabled(): boolean {
  return getConfig() !== null;
}

/**
 * Telefon numarasını WhatsApp formatına çevir.
 * "0532..." veya "+90..." → "whatsapp:+90..."
 */
export function toWhatsAppAddress(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let p = phone.trim().replace(/[^\d+]/g, "");
  if (!p) return null;
  if (p.startsWith("+")) {
    return `whatsapp:${p}`;
  }
  // 0 ile başlıyorsa 90 + p (Türk numarası varsayımı)
  if (p.startsWith("0")) p = p.slice(1);
  // 5 ile başlıyorsa (TR cep) 90 önek ekle
  if (p.length === 10 && p.startsWith("5")) p = "90" + p;
  return `whatsapp:+${p}`;
}

/**
 * WhatsApp adresinden ham telefonu al.
 * "whatsapp:+90555..." → "+90555..."
 */
export function fromWhatsAppAddress(waAddress: string): string {
  return waAddress.replace(/^whatsapp:/, "");
}

/**
 * Twilio inbound webhook imza doğrulaması (X-Twilio-Signature).
 *
 * Twilio, isteği şu formülle imzalar:
 *   base64( HMAC-SHA1( authToken, fullUrl + sıralı(key+value) ) )
 *
 * @param fullUrl  Twilio'nun çağırdığı tam URL (query string dahil)
 * @param params   POST form alanları (key→value)
 * @param signature  X-Twilio-Signature başlığı
 * @returns TWILIO_AUTH_TOKEN tanımlı değilse `null` (doğrulama atlanır)
 */
export function verifyTwilioSignature(
  fullUrl: string,
  params: Record<string, string>,
  signature: string | null
): boolean | null {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return null; // yapılandırma yoksa doğrulama yapılamaz

  if (!signature) return false;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("node:crypto") as typeof import("node:crypto");

  const data =
    fullUrl +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface SendResult {
  sent: boolean;
  sid?: string;
  reason?: string;
}

async function twilioPost(
  path: string,
  body: Record<string, string>
): Promise<{ ok: boolean; data?: unknown; status: number }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, status: 0 };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/${path}`;
  const params = new URLSearchParams(body);
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString(
    "base64"
  );
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const json = await res.json().catch(() => undefined);
  return { ok: res.ok, status: res.status, data: json };
}

/**
 * Free-form text — yalnız 24h conversation window'da çalışır.
 */
export async function sendText(
  to: string,
  body: string
): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) return { sent: false, reason: "twilio yapılandırılmadı" };
  const r = await twilioPost("Messages.json", {
    From: cfg.whatsappNumber,
    To: to,
    Body: body.slice(0, 1500),
  });
  if (!r.ok) {
    return {
      sent: false,
      reason: `twilio status=${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
    };
  }
  const data = r.data as { sid?: string };
  return { sent: true, sid: data?.sid };
}

/**
 * Onaylı template gönderimi — 24h penceresi dışı outbound için zorunlu.
 * contentSid: Twilio Content API'de hazırlanan template'in HXxxxx ID'si
 * vars: {{1}}, {{2}}, ... template değişkenleri
 */
export async function sendTemplate(
  to: string,
  contentSid: string,
  vars: Record<string, string>
): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) return { sent: false, reason: "twilio yapılandırılmadı" };
  const r = await twilioPost("Messages.json", {
    From: cfg.whatsappNumber,
    To: to,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(vars),
  });
  if (!r.ok) {
    return {
      sent: false,
      reason: `twilio status=${r.status}`,
    };
  }
  const data = r.data as { sid?: string };
  return { sent: true, sid: data?.sid };
}
