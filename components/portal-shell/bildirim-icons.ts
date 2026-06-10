/**
 * Bildirim türü → ikon ve renk eşlemeleri.
 *
 * Bu dosya server-safe (no "use client"); hem client BildirimBell hem de
 * server `/bildirimler` sayfası buradan okur. `"use client"` directive'li bir
 * dosyadan const export edersek server bundle'ında `undefined` olarak gelir;
 * bu yüzden paylaşımlı sabitleri ayrı modülde tutuyoruz.
 */

import type { ComponentType } from "react";
import {
  FileText,
  FileSpreadsheet,
  Receipt,
  ClipboardList,
  Inbox,
  FlaskConical,
  LifeBuoy,
  MessageSquare,
} from "lucide-react";
import type { BildirimTuru } from "@/lib/repositories/bildirim";

export const BILDIRIM_ICONS: Record<
  BildirimTuru,
  ComponentType<{ className?: string }>
> = {
  rapor: FileText,
  teklif: FileSpreadsheet,
  fatura: Receipt,
  "talep-durum": ClipboardList,
  "numune-kabul": Inbox,
  "numune-analiz": FlaskConical,
  "destek-yeni": LifeBuoy,
  "destek-yanit": MessageSquare,
};

export const BILDIRIM_ICON_COLORS: Record<BildirimTuru, string> = {
  rapor:
    "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  teklif: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  fatura: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  "talep-durum":
    "text-cyan-700 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300",
  "numune-kabul":
    "text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300",
  "numune-analiz":
    "text-fuchsia-700 bg-fuchsia-50 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  "destek-yeni":
    "text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
  "destek-yanit":
    "text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
};
