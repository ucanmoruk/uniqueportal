import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicTalep } from "@/lib/repositories/talep";

/* ── Rate Limiting (IP başına, bellekte) ─────────────────────────── */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

/* ── CORS ────────────────────────────────────────────────────────── */
const ALLOWED_ORIGINS = [
  "https://talep.uniqueanalyse.com",
  "https://portal.uniqueanalyse.com",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

/* ── Validation ──────────────────────────────────────────────────── */
const NumuneSchema = z.object({
  Numune: z.string().max(250).default(""),
  Ozellik: z.string().max(250).default(""),
  Analiz: z.string().max(250).default(""),
  Metot: z.string().max(250).default(""),
});

const Schema = z.object({
  raporlama: z.object({
    Firma: z.string().min(1, "Firma adı zorunlu.").max(500),
    Adres: z.string().max(2000).default(""),
    Yetkili: z.string().max(150).default(""),
    Iletisim: z.string().max(150).default(""),
    Karar: z
      .enum([
        "Belirsizlik dahil edilmesin",
        "Belirsizlik pozitif yönde dahil edilsin",
        "Belirsizlik negatif yönde dahil edilsin",
      ])
      .default("Belirsizlik dahil edilmesin"),
    Dil: z
      .enum(["Türkçe", "İngilizce", "Türkçe ve İngilizce"])
      .default("Türkçe"),
    Iade: z.enum(["Evet", "Hayır"]).default("Hayır"),
    UreticiFirma: z.string().max(500).default(""),
    Note: z.string().max(2000).default(""),
    Mail: z
      .string()
      .email("Geçerli e-posta giriniz.")
      .or(z.literal(""))
      .default(""),
  }),
  fatura: z.object({
    Firma: z.string().max(500).default(""),
    Adres: z.string().max(2000).default(""),
    VergiDairesi: z.string().max(50).default(""),
    VergiNo: z.string().max(15).default(""),
    Mail: z
      .string()
      .email("Geçerli e-posta giriniz.")
      .or(z.literal(""))
      .default(""),
  }),
  numuneler: z.array(NumuneSchema).min(1, "En az bir numune ekleyin."),
  _hp: z.literal("").default(""),
});

/* ── POST ────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Çok fazla talep gönderdiniz. Lütfen bir dakika bekleyin." },
      { status: 429, headers }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Geçersiz istek formatı." },
        { status: 400, headers }
      );
    }

    const raw = body as Record<string, unknown>;
    if (raw._hp) {
      return NextResponse.json({ success: true, id: 0 }, { headers });
    }

    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      console.error("[public-talep] Validation errors:", JSON.stringify(parsed.error.issues, null, 2));
      return NextResponse.json(
        { error: "Form hatalı. Lütfen alanları kontrol edin.", details: parsed.error.issues },
        { status: 400, headers }
      );
    }

    const id = await createPublicTalep({
      raporlama: parsed.data.raporlama,
      fatura: parsed.data.fatura,
      numuneler: parsed.data.numuneler,
      sozlesme: 1,
    });

    return NextResponse.json({ success: true, id }, { headers });
  } catch (err) {
    console.error("[public-talep] POST error:", err);
    return NextResponse.json(
      { error: "Talep kaydedilemedi. Lütfen tekrar deneyin." },
      { status: 500, headers }
    );
  }
}
