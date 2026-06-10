"use client";

import Link from "next/link";
import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ChevronRight, FileText, Plus } from "lucide-react";
import type { TalepListeItem } from "@/lib/repositories/talep";

export function TaleplerTable({
  rows,
  showOlusturan = false,
}: {
  rows: TalepListeItem[];
  showOlusturan?: boolean;
}) {
  const columns: SmartColumn<TalepListeItem>[] = [
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
      key: "musteri",
      header: "Müşteri",
      accessor: (r) => r["Müşteri"],
      cell: (r) => r["Müşteri"] ?? "—",
    },
    ...(showOlusturan
      ? ([
          {
            key: "olusturan",
            header: "Oluşturan",
            accessor: (r) => r["Talep Oluşturan"],
            cell: (r) => (
              <span className="text-muted-foreground">
                {r["Talep Oluşturan"] ?? "—"}
              </span>
            ),
          },
        ] satisfies SmartColumn<TalepListeItem>[])
      : []),
    {
      key: "durum",
      header: "Durum",
      accessor: (r) => r.Durum,
      cell: (r) => <StatusBadge value={r.Durum} />,
      filterable: true,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      searchable: false,
      align: "right",
      cell: (r) => (
        <Link
          href={`/talepler/${r.ID}`}
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
      searchPlaceholder="Talep no, müşteri, oluşturan…"
      emptyMessage={
        <div className="flex flex-col items-center gap-3 py-4">
          <span className="inline-flex items-center justify-center size-12 rounded-full bg-muted text-muted-foreground">
            <FileText className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Henüz talep yok</p>
            <p className="text-sm text-muted-foreground">
              İlk analiz talebinizi oluşturarak başlayın.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/talepler/yeni">
              <Plus className="size-4" /> Yeni Talep Oluştur
            </Link>
          </Button>
        </div>
      }
      rowHref={(r) => `/talepler/${r.ID}`}
    />
  );
}
