"use client";

import * as React from "react";
import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { formatDate } from "@/lib/utils";
import { Eye, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkMailModal } from "./bulk-mail-modal";
import type { RaporListItem } from "@/lib/repositories/rapor";

export function BelgelerTable({
  rows,
  showProje = false,
  isAdmin = false,
}: {
  rows: RaporListItem[];
  showProje?: boolean;
  isAdmin?: boolean;
}) {
  const [selected, setSelected] = React.useState<RaporListItem[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);

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
    ...(showProje
      ? ([
          {
            key: "proje",
            header: "Proje",
            accessor: (r) => r.Proje,
            cell: (r) => r.Proje ?? "—",
          },
        ] satisfies SmartColumn<RaporListItem>[])
      : []),
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
      filterable: true,
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
      cell: (r) => {
        // Yol http(s) ile başlıyorsa dış URL (NKR_RaporOnay.YayinUrl) — direkt aç.
        // Aksi takdirde manuel yüklenmiş PDF — /api/belge/[id] üzerinden.
        const isExternal =
          !!r.Yol && /^https?:\/\//i.test(r.Yol.trim());
        const href = isExternal ? (r.Yol as string) : `/api/belge/${r.ID}`;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Eye className="size-3.5" /> Görüntüle
          </a>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      {isAdmin && selected.length > 0 && (
        <div className="border bg-primary-subtle/30 border-primary/30 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <strong>{selected.length}</strong> belge seçildi
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
            >
              Seçimi Temizle
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Mail className="size-4" /> Mail Oluştur
            </Button>
          </div>
        </div>
      )}

      <SmartTable
        rows={rows}
        columns={columns}
        rowKey={(r, idx) => `${r.ID}-${idx}`}
        searchPlaceholder="Belge no, müşteri, dosya adı…"
        emptyMessage="Henüz belge yok."
        selectable={isAdmin}
        onSelectionChange={setSelected}
      />

      {modalOpen && (
        <BulkMailModal
          raporIds={selected.map((r) => r.ID)}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setSelected([]);
          }}
        />
      )}
    </div>
  );
}
