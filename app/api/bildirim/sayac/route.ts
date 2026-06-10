import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getBildirimler,
  getSonGoruldu,
  countUnread,
} from "@/lib/repositories/bildirim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Okunmamış bildirim sayısını döner — istemci tarafı periyodik poll için.
 * Hafif: yalnızca son 30 gün penceresi + son görülme zamanı karşılaştırması.
 */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ unread: 0 }, { status: 401 });
  }

  try {
    const [bildirimler, sonGoruldu] = await Promise.all([
      getBildirimler(user, 30),
      getSonGoruldu(user.id).catch(() => null),
    ]);
    const unread = countUnread(bildirimler, sonGoruldu);
    return NextResponse.json({ unread });
  } catch {
    return NextResponse.json({ unread: 0 });
  }
}
