import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getSonGoruldu,
  countUnreadBildirim,
} from "@/lib/repositories/bildirim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Okunmamış bildirim sayısını döner — istemci tarafı periyodik poll için.
 * Hafif: tüm satırları çekmeden tek SELECT'te COUNT(*) ile sayar.
 */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ unread: 0 }, { status: 401 });
  }

  try {
    const sonGoruldu = await getSonGoruldu(user.id).catch(() => null);
    const unread = await countUnreadBildirim(user, sonGoruldu, 30);
    return NextResponse.json({ unread });
  } catch {
    return NextResponse.json({ unread: 0 });
  }
}
