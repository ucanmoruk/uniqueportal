"use client";

import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatTL } from "@/lib/utils";
import type { FaturaListItem } from "@/lib/repositories/fatura";

export function FaturalarTable({ rows }: { rows: FaturaListItem[] }) {
  const columns: SmartColumn<FaturaListItem>[] = [
    {
      key: "no",
      header: "Fatura No",
      accessor: (r) => r["Fatura No"],
      cell: (r) => <span className="font-medium">{r["Fatura No"]}</span>,
    },
    {
      key: "tarih",
      header: "Tarih",
      accessor: (r) => (r.Tarih ? new Date(r.Tarih).getTime() : 0),
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Tarih)}</span>
      ),
    },
    {
      key: "musteri",
      header: "Müşteri",
      accessor: (r) => r["Müşteri"],
      cell: (r) => r["Müşteri"] ?? "—",
    },
    {
      key: "proje",
      header: "Proje",
      accessor: (r) => r.Proje,
      cell: (r) => r.Proje ?? "—",
    },
    {
      key: "tutar",
      header: "Tutar",
      accessor: (r) => Number(r.Tutar),
      align: "right",
      searchable: false,
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTL(Number(r.Tutar))}
        </span>
      ),
    },
    {
      key: "kdv",
      header: "KDV",
      accessor: (r) => Number(r.KDV),
      align: "right",
      searchable: false,
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTL(Number(r.KDV))}
        </span>
      ),
    },
    {
      key: "toplam",
      header: "Toplam",
      accessor: (r) => Number(r.Toplam),
      align: "right",
      searchable: false,
      cell: (r) => (
        <span className="tabular-nums font-medium">
          {formatTL(Number(r.Toplam))}
        </span>
      ),
    },
    {
      key: "odeme",
      header: "Ödeme",
      accessor: (r) => r["Ödeme"],
      cell: (r) => <StatusBadge value={r["Ödeme"]} />,
    },
  ];

  return (
    <SmartTable
      rows={rows}
      columns={columns}
      rowKey={(r, idx) => `${r.ID}-${idx}`}
      searchPlaceholder="Fatura no, müşteri, proje…"
      emptyMessage="Henüz fatura bulunmuyor."
    />
  );
}
