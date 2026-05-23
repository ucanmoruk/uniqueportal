"use client";

import Link from "next/link";
import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { TeklifListItem } from "@/lib/repositories/teklif";

export function TekliflerTable({
  rows,
  showProje = false,
}: {
  rows: TeklifListItem[];
  showProje?: boolean;
}) {
  const columns: SmartColumn<TeklifListItem>[] = [
    {
      key: "no",
      header: "Teklif No",
      accessor: (r) => r["Teklif No"],
      cell: (r) => <span className="font-medium">{r["Teklif No"]}</span>,
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
    ...(showProje
      ? ([
          {
            key: "proje",
            header: "Proje",
            accessor: (r) => r.Proje,
            cell: (r) => r.Proje ?? "—",
          },
        ] satisfies SmartColumn<TeklifListItem>[])
      : []),
    {
      key: "aciklama",
      header: "Açıklama",
      accessor: (r) => r.Aciklama,
      cell: (r) => (
        <span className="text-muted-foreground line-clamp-1 max-w-sm">
          {r.Aciklama ?? "—"}
        </span>
      ),
    },
    {
      key: "durum",
      header: "Durum",
      accessor: (r) => r.Durum,
      cell: (r) => <StatusBadge value={r.Durum} />,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      searchable: false,
      align: "right",
      cell: (r) => (
        <Link
          href={`/teklifler/${r.ID}`}
          className="inline-flex items-center text-primary hover:underline gap-1 text-sm"
        >
          Detay <ChevronRight className="size-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <SmartTable
      rows={rows}
      columns={columns}
      rowKey={(r, idx) => `${r.ID}-${idx}`}
      searchPlaceholder="Teklif no, müşteri, proje, açıklama…"
      emptyMessage="Henüz teklif bulunmuyor."
      rowHref={(r) => `/teklifler/${r.ID}`}
    />
  );
}
