"use client";

import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { formatDate } from "@/lib/utils";
import { Eye, FileText } from "lucide-react";
import type { RaporListItem } from "@/lib/repositories/rapor";

export function BelgelerTable({ rows }: { rows: RaporListItem[] }) {
  const columns: SmartColumn<RaporListItem>[] = [
    {
      key: "no",
      header: "Belge No",
      accessor: (r) => r.RaporID ?? `${r["Dosya No"]}`,
      cell: (r) => (
        <span className="font-medium">
          {r.RaporID ?? `UQ${r["Dosya No"]}`}
        </span>
      ),
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
      key: "talep",
      header: "Talep No",
      accessor: (r) => r.TalepNo ?? 0,
      cell: (r) => r.TalepNo ?? "—",
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
      key: "tur",
      header: "Tür",
      accessor: (r) => r["Dosya Türü"],
      cell: (r) => (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <FileText className="size-3.5" />
          {r["Dosya Türü"] ?? "PDF"}
        </span>
      ),
    },
    {
      key: "ad",
      header: "Dosya",
      accessor: (r) => r["Dosya Adı"],
      cell: (r) => (
        <span className="text-muted-foreground line-clamp-1 max-w-xs">
          {r["Dosya Adı"] ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      searchable: false,
      align: "right",
      cell: (r) => (
        <a
          href={`/api/belge/${r.ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <Eye className="size-3.5" /> Görüntüle
        </a>
      ),
    },
  ];

  return (
    <SmartTable
      rows={rows}
      columns={columns}
      rowKey={(r, idx) => `${r.ID}-${idx}`}
      searchPlaceholder="Belge no, müşteri, dosya adı…"
      emptyMessage="Henüz belge yok."
    />
  );
}
