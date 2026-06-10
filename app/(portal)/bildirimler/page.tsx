import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getBildirimler, getSonGoruldu } from "@/lib/repositories/bildirim";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCheck, Bell } from "lucide-react";
import { markAllReadAction } from "@/app/(portal)/bildirim-actions";
import {
  BILDIRIM_ICONS,
  BILDIRIM_ICON_COLORS,
} from "@/components/portal-shell/bildirim-icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function timeAgo(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return "az önce";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} saat önce`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} gün önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default async function BildirimlerPage() {
  const user = await requireUser();
  // Geçmişi 90 gün olarak göster (panel sadece 30 gün)
  const [bildirimler, sonGoruldu] = await Promise.all([
    getBildirimler(user, 90),
    getSonGoruldu(user.id).catch(() => null),
  ]);

  const lastSeen = sonGoruldu ? new Date(sonGoruldu) : null;
  const unreadCount = lastSeen
    ? bildirimler.filter((b) => b.tarih > lastSeen).length
    : bildirimler.length;

  return (
    <>
      <PageHeader
        title="Bildirimler"
        description={
          bildirimler.length === 0
            ? "Son 90 gün içinde bildirim yok."
            : `Son 90 gün · ${bildirimler.length} bildirim · ${unreadCount} okunmamış`
        }
        actions={
          unreadCount > 0 ? (
            <form action={markAllReadAction}>
              <Button type="submit" variant="outline" size="sm">
                <CheckCheck className="size-4" /> Tümünü okundu işaretle
              </Button>
            </form>
          ) : undefined
        }
      />

      {bildirimler.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Bell className="size-10 mx-auto mb-3 opacity-30" />
            Henüz bildirim yok.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {bildirimler.map((b) => {
                const Icon = BILDIRIM_ICONS[b.type];
                const isUnread = lastSeen ? b.tarih > lastSeen : true;
                return (
                  <li key={b.id}>
                    <Link
                      href={b.link}
                      className={cn(
                        "flex items-start gap-4 px-5 py-4 hover:bg-accent transition-colors",
                        isUnread && "bg-primary-subtle/30"
                      )}
                    >
                      <div
                        className={cn(
                          "size-10 shrink-0 inline-flex items-center justify-center rounded-md",
                          BILDIRIM_ICON_COLORS[b.type]
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-sm leading-tight",
                            isUnread ? "font-semibold" : "font-medium"
                          )}
                        >
                          {b.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">
                          {b.subtitle}
                        </div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1.5">
                          {timeAgo(b.tarih)} ·{" "}
                          {new Intl.DateTimeFormat("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(b.tarih)}
                        </div>
                      </div>
                      {isUnread && (
                        <span className="size-2 bg-primary rounded-full shrink-0 mt-2.5" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
