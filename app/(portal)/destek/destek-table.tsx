"use client";

import Link from "next/link";
import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { DestekListItem } from "@/lib/repositories/destek";

export function DestekTable({ rows }: { rows: DestekListItem[] }) {
  const columns: SmartColumn<DestekListItem>[] = [
    {
      key: "no",
      header: "Talep No",
      accessor: (r) => r["Talep No"],
      cell: (r) => <span className="font-medium">{r["Talep No"]}</span>,
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
      key: "olusturan",
      header: "Oluşturan",
      accessor: (r) => r["Talep Oluşturan"],
      cell: (r) => r["Talep Oluşturan"] ?? "—",
    },
    {
      key: "konu",
      header: "Konu",
      accessor: (r) => r.Konu,
      cell: (r) => (
        <span className="line-clamp-1 max-w-md">{r.Konu ?? "—"}</span>
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
          href={`/destek/${r.TALEP_ID}`}
          className="inline-flex items-center text-primary hover:underline gap-1 text-sm"
        >
          Aç <ChevronRight className="size-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <SmartTable
      rows={rows}
      columns={columns}
      rowKey={(r, idx) => `${r.TALEP_ID}-${idx}`}
      searchPlaceholder="Talep no, konu, oluşturan…"
      emptyMessage="Henüz destek talebi yok."
      rowHref={(r) => `/destek/${r.TALEP_ID}`}
    />
  );
}
