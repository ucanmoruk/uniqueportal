import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { findRaporForUser } from "@/lib/repositories/rapor";

export const dynamic = "force-dynamic";

const LEGACY_BASE = (
  process.env.LEGACY_PORTAL_URL ?? "https://portal.uqtest.com"
).replace(/\/+$/, "");

/**
 * Belge PDF'ini eski portal sunucusundan çeker ve inline olarak servisle.
 * Adresler:
 *  - {LEGACY}/{Yol}                 → direkt statik dosya (öncelikli)
 *  - {LEGACY}/serve-pdf.php?file=NAME → inline serve fallback
 */
async function fetchPdf(yol: string, dosyaAdi: string | null) {
  const candidates: string[] = [];
  const trimmed = yol.trim().replace(/^\/+/, "");

  // 1) Direkt yol
  candidates.push(`${LEGACY_BASE}/${trimmed}`);
  // 2) "upload/" ile başlamıyorsa upload/ ile dene
  if (!trimmed.toLowerCase().startsWith("upload/")) {
    candidates.push(`${LEGACY_BASE}/upload/${trimmed}`);
  }
  // 3) serve-pdf.php ile sadece dosya adı
  const base = (dosyaAdi || trimmed.split("/").pop() || "").trim();
  if (base) {
    candidates.push(
      `${LEGACY_BASE}/serve-pdf.php?file=${encodeURIComponent(base)}`
    );
  }

  for (const url of candidates) {
    try {
      const resp = await fetch(url, {
        redirect: "follow",
        // Bazı sunucular User-Agent zorunlu kılar
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; UniquePortalProxy/1.0; +https://uqtest.com)",
          Accept: "application/pdf,application/octet-stream,*/*",
        },
      });
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type") ?? "";
      if (
        ct.toLowerCase().includes("text/html") &&
        !ct.toLowerCase().includes("pdf")
      ) {
        // HTML hata sayfası gelmiş, atla
        continue;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      // PDF magic byte kontrolü (%PDF-)
      if (buf.length < 5 || !buf.subarray(0, 5).toString().startsWith("%PDF-")) {
        continue;
      }
      return { buf, source: url };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchDirectPdf(url: string) {
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UniquePortalProxy/1.0; +https://uqtest.com)",
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 5 || !buf.subarray(0, 5).toString().startsWith("%PDF-")) {
      return null;
    }
    return { buf, source: url };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("Yetkisiz", { status: 401 });
  }

  const rapor = await findRaporForUser(user, numId);
  if (!rapor) {
    return new NextResponse("Belge bulunamadı veya erişim yetkiniz yok.", {
      status: 404,
    });
  }

  if (!rapor.Yol) {
    return new NextResponse("Bu belgenin dosya yolu kayıtlı değil.", {
      status: 404,
    });
  }

  const isExternal = /^https?:\/\//i.test(rapor.Yol.trim());
  const result = isExternal
    ? await fetchDirectPdf(rapor.Yol.trim())
    : await fetchPdf(rapor.Yol, rapor["Dosya Adı"]);
  if (!result) {
    return new NextResponse(
      "PDF dosyasına erişilemedi. Lütfen daha sonra tekrar deneyin.",
      { status: 502 }
    );
  }

  const raporNo = rapor.RaporKodu ?? rapor["Dosya No"];
  const urunAdi = rapor["Dosya Adı"] ?? "";
  const baseName = urunAdi
    ? `${raporNo} - ${urunAdi}`
    : `Rapor-${raporNo}`;
  const niceName = baseName
    .replace(/[^a-zA-Z0-9ÇĞİÖŞÜçğıöşü._\s-]+/g, "_")
    .trim()
    .concat(".pdf");
  // HTTP başlık değerleri Latin1 (≤255) olmak zorunda. Türkçe karakterler
  // (ı=305, ş=351, ğ=287…) ham filename="" içinde ByteString hatası fırlatır.
  // RFC 6266/5987: ASCII fallback + filename*=UTF-8'' ile çift değer veriyoruz.
  const asciiName = niceName.replace(/[^\x20-\x7E]/g, "_");
  const encodedName = encodeURIComponent(niceName);
  const disposition =
    `${download ? "attachment" : "inline"}; ` +
    `filename="${asciiName}"; filename*=UTF-8''${encodedName}`;

  return new NextResponse(new Uint8Array(result.buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(result.buf.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
