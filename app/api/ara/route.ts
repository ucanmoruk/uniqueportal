import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { aramaYap } from "@/lib/repositories/arama";
import { hit, clientIpFromHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Hafif debounce/abuse koruması — dakikada 60 sorgu
  const ip = clientIpFromHeaders(req.headers);
  const rl = hit(`ara:${user.id}:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ results: [] }, { status: 429 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await aramaYap(user, q);
  return NextResponse.json({ results });
}
