"use client";

import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { TerminListItem } from "@/lib/repositories/termin";

export function TerminTable({ rows }: { rows: TerminListItem[] }) {
  const now = Date.now();

  const columns: SmartColumn<TerminListItem>[] = [
    {
      key: "evrak",
      header: "Evrak No",
      accessor: (r) => r["Evrak No"] ?? 0,
      cell: (r) => <span className="font-medium">{r["Evrak No"] ?? "—"}</span>,
    },
    {
      key: "rapor",
      header: "Rapor No",
      accessor: (r) => r["Rapor No"] ?? 0,
      cell: (r) => r["Rapor No"] ?? "—",
    },
    {
      key: "firma",
      header: "Firma",
      accessor: (r) => r.Firma,
      cell: (r) => r.Firma ?? "—",
    },
    {
      key: "proje",
      header: "Proje",
      accessor: (r) => r.Proje,
      cell: (r) => r.Proje ?? "—",
    },
    {
      key: "numune",
      header: "Numune",
      accessor: (r) => r.Numune,
      cell: (r) => r.Numune ?? "—",
    },
    {
      key: "hizmet",
      header: "Hizmet",
      accessor: (r) => r.Hizmet,
      cell: (r) => (
        <span className="line-clamp-1 max-w-xs">{r.Hizmet ?? "—"}</span>
      ),
    },
    {
      key: "kabul",
      header: "Kabul",
      accessor: (r) => (r.Kabul ? new Date(r.Kabul).getTime() : 0),
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Kabul)}</span>
      ),
    },
    {
      key: "termin",
      header: "Termin",
      accessor: (r) => (r.Termin ? new Date(r.Termin).getTime() : 0),
      cell: (r) => {
        if (!r.Termin) return <span className="text-muted-foreground">—</span>;
        const t = new Date(r.Termin).getTime();
        const overdue = t < now;
        const soon = !overdue && t - now < 1000 * 60 * 60 * 24 * 3;
        return (
          <span
            className={
              overdue
                ? "font-medium text-red-600 dark:text-red-400"
                : soon
                  ? "font-medium text-amber-600 dark:text-amber-400"
                  : ""
            }
          >
            {formatDate(r.Termin)}
          </span>
        );
      },
    },
    {
      key: "durum",
      header: "Durum",
      accessor: (r) => r.Durum,
      cell: (r) => <StatusBadge value={r.Durum} />,
    },
  ];

  return (
    <SmartTable
      rows={rows}
      columns={columns}
      rowKey={(r, idx) => `${r.nID ?? r.ID ?? "x"}-${idx}`}
      searchPlaceholder="Evrak/Rapor no, firma, numune, hizmet…"
      pageSize={50}
      emptyMessage="Henüz termin kaydı yok."
    />
  );
}
