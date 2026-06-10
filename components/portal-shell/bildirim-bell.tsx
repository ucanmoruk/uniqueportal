"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "@/app/(portal)/bildirim-actions";
import type { Bildirim } from "@/lib/repositories/bildirim";
import {
  BILDIRIM_ICONS,
  BILDIRIM_ICON_COLORS,
} from "@/components/portal-shell/bildirim-icons";

interface Props {
  bildirimler: Array<Omit<Bildirim, "tarih"> & { tarih: string }>;
  lastSeen: string | null;
  variant?: "sidebar" | "topbar" | "floating";
}

const ICONS = BILDIRIM_ICONS;
const ICON_COLORS = BILDIRIM_ICON_COLORS;

function timeAgo(d: Date): string {
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
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

export function BildirimBell({
  bildirimler,
  lastSeen,
  variant = "sidebar",
}: Props) {
  const router = useRouter();
  const [marking, startMarking] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !btnRef.current) return;
    // Floating buton sabit konumda (fixed bottom-6 right-6) — paneli rect'ten
    // hesaplamaya gerek yok, render'da doğrudan bottom/right offset uygulanır.
    if (variant === "floating") {
      setPos(null);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    const PANEL_W = 384; // 24rem
    const PANEL_H = 480;
    const M = 8;

    let left: number;
    let top: number;

    if (variant === "sidebar") {
      // Sidebar: paneli butonun SAĞINA aç (sidebar üstüne binmesin).
      left = rect.right + M;
      top = rect.top;
      if (left + PANEL_W > window.innerWidth - M) {
        left = window.innerWidth - PANEL_W - M;
      }
      if (left < rect.right) {
        left = Math.max(M, rect.left);
        top = rect.top - PANEL_H - M;
        if (top < M) top = rect.bottom + M;
      }
      if (top + PANEL_H > window.innerHeight - M) {
        top = Math.max(M, window.innerHeight - PANEL_H - M);
      }
    } else {
      // topbar: butona göre altta, sağdan hizalı
      top = rect.bottom + M;
      left = rect.right - PANEL_W;
    }

    if (left < M) left = M;
    if (left + PANEL_W > window.innerWidth - M)
      left = window.innerWidth - PANEL_W - M;

    setPos({ top, left });
  }, [open, variant]);

  const items = React.useMemo(
    () => bildirimler.map((b) => ({ ...b, tarih: new Date(b.tarih) })),
    [bildirimler]
  );

  const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
  const unread = lastSeenDate
    ? items.filter((b) => b.tarih > lastSeenDate)
    : items;
  const serverUnread = unread.length;

  // Canlı sayaç — 60 sn'de bir /api/bildirim/sayac yoklar. Sunucudan gelen
  // statik prop ile poll sonucu arasından büyüğü gösterilir; böylece sayfa
  // yenilenmeden yeni bildirim sayısı görünür. Panel açılınca listeyi tazeler.
  const [liveUnread, setLiveUnread] = React.useState<number | null>(null);
  React.useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/bildirim/sayac", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && typeof data.unread === "number") setLiveUnread(data.unread);
      } catch {
        /* sessiz */
      }
    }
    const iv = setInterval(poll, 60_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const unreadCount = Math.max(serverUnread, liveUnread ?? 0);

  // Panel açıldığında, canlı sayaç prop'tan fazlaysa liste günceldeğil demektir
  // → RSC'yi tazele ki yeni bildirimler panelde görünsün.
  React.useEffect(() => {
    if (open && liveUnread != null && liveUnread > serverUnread) {
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isSidebar = variant === "sidebar";
  const isFloating = variant === "floating";

  // Floating: panel butonun hemen üstünde fixed offset'le konumlanır
  // (button: bottom-6 right-6 + h-14 → bottom 88px, right 24px = right-6).
  // Sidebar/topbar: hesaplanan {top, left} kullanılır.
  const panelReady = open && mounted && (isFloating || pos);

  const panel = panelReady ? (
    <div
      ref={panelRef}
      data-bildirim-panel
      className={cn(
        "fixed z-[60] w-80 sm:w-96 max-h-[70vh] bg-popover text-popover-foreground border shadow-xl flex flex-col",
        isFloating && "bottom-[88px] right-6"
      )}
      style={isFloating ? undefined : { top: pos!.top, left: pos!.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">Bildirimler</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} okunmamış`
              : "Tümü okundu"}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            disabled={marking}
            onClick={() => {
              startMarking(async () => {
                await markAllReadAction();
                // Server action sonrası RSC payload'ı yenile -> Bell yeni
                // lastSeen prop alır, unread sayacı 0'a düşer.
                router.refresh();
                setOpen(false);
              });
            }}
          >
            <CheckCheck className="size-3.5" />
            {marking ? "Güncelleniyor…" : "Tümünü okudum"}
          </Button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {unread.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            <Bell className="size-8 mx-auto mb-2 opacity-30" />
            Okunmamış bildirim yok.
          </div>
        ) : (
          <ul className="divide-y">
            {unread.map((b) => {
              const Icon = ICONS[b.type];
              const isUnread = true; // listede sadece okunmamışlar var
              return (
                <li key={b.id}>
                  <Link
                    href={b.link}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-4 py-3 hover:bg-accent transition-colors",
                      isUnread && "bg-primary-subtle/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "size-9 shrink-0 inline-flex items-center justify-center",
                          ICON_COLORS[b.type]
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <div
                          className={cn(
                            "leading-tight",
                            isUnread ? "font-semibold" : "font-medium"
                          )}
                        >
                          {b.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {b.subtitle}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                          {timeAgo(b.tarih)}
                        </div>
                      </div>
                      {isUnread && (
                        <span className="size-2 bg-primary rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-4 py-2 border-t text-[10px] uppercase tracking-wider text-muted-foreground text-center">
        Son 30 gün
      </div>
    </div>
  ) : null;

  if (isFloating) {
    return (
      <>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Bildirimler"
          title="Bildirimler"
          className={cn(
            "fixed z-40 bottom-6 right-6",
            "h-14 w-14 rounded-full inline-flex items-center justify-center",
            "bg-primary text-primary-foreground shadow-lg shadow-black/20",
            "hover:brightness-110 active:scale-95 transition",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          )}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] font-bold leading-none rounded-full",
                "bg-destructive text-destructive-foreground ring-2 ring-background"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {mounted && panel ? createPortal(panel, document.body) : null}
      </>
    );
  }

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative",
          isSidebar &&
            "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
        title="Bildirimler"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold leading-none rounded-full",
              "bg-destructive text-destructive-foreground"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
