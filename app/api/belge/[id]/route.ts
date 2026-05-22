import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { findRaporForUser } from "@/lib/repositories/rapor";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    return new NextResponse("Belge bulunamadı.", { status: 404 });
  }

  // Eski PHP portalındaki dosyalar farklı bir sunucuda — Vercel'den okunamaz.
  // Bu endpoint şimdilik kullanıcıyı orijinal PHP portalının indirme adresine
  // yönlendiriyor. PDF'leri Vercel Blob / S3'e taşıma sonradan eklenecek.
  const legacyBase =
    process.env.LEGACY_PORTAL_URL?.replace(/\/+$/, "") ||
    "https://portal.uqtest.com";
  const dx = Buffer.from(String(numId)).toString("base64");
  const url = `${legacyBase}/download-2.php?dx=${encodeURIComponent(dx)}`;

  return NextResponse.redirect(url, 302);
}
