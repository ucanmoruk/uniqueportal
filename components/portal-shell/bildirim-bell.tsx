"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  FileText,
  FileSpreadsheet,
  Receipt,
  CheckCheck,
  LifeBuoy,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "@/app/(portal)/bildirim-actions";
import type { Bildirim, BildirimTuru } from "@/lib/repositories/bildirim";

interface Props {
  bildirimler: Array<Omit<Bildirim, "tarih"> & { tarih: string }>;
  lastSeen: string | null;
  variant?: "sidebar" | "topbar";
}

const ICONS: Record<BildirimTuru, React.ComponentType<{ className?: string }>> = {
  rapor: FileText,
  teklif: FileSpreadsheet,
  fatura: Receipt,
  "destek-yeni": LifeBuoy,
  "destek-yanit": MessageSquare,
};

const ICON_COLORS: Record<BildirimTuru, string> = {
  rapor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  teklif: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  fatura: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  "destek-yeni": "text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
  "destek-yanit": "text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
};

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
    const rect = btnRef.current.getBoundingClientRect();
    const PANEL_W = 384; // 24rem
    const PANEL_H = 480;
    const M = 8;

    let left: number;
    let top: number;

    if (variant === "sidebar") {
      // butona göre üstte ve hizalı, sağdan taşma kontrolü
      top = rect.top - PANEL_H - M;
      left = rect.left;
      if (top < M) top = rect.bottom + M;
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
  const unreadCount = unread.length;

  const isSidebar = variant === "sidebar";

  const panel = open && pos && mounted ? (
    <div
      ref={panelRef}
      data-bildirim-panel
      className="fixed z-[60] w-80 sm:w-96 max-h-[70vh] bg-popover text-popover-foreground border shadow-xl flex flex-col"
      style={{ top: pos.top, left: pos.left }}
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
          <form action={markAllReadAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => setOpen(false)}
            >
              <CheckCheck className="size-3.5" /> Tümünü okudum
            </Button>
          </form>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            <Bell className="size-8 mx-auto mb-2 opacity-30" />
            Son 30 günde bildirim yok.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((b) => {
              const Icon = ICONS[b.type];
              const isUnread = lastSeenDate
                ? b.tarih > lastSeenDate
                : true;
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
