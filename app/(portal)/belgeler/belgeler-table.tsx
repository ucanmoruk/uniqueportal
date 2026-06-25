"use client";

import * as React from "react";
import { SmartTable, type SmartColumn } from "@/components/smart-table";
import { formatDate } from "@/lib/utils";
import { Eye, FileText, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkMailModal } from "./bulk-mail-modal";
import type { RaporListItem } from "@/lib/repositories/rapor";

function PdfViewerModal({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-card border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 inline-flex items-center justify-center size-8 rounded-full bg-card border shadow-md hover:bg-accent"
        >
          <X className="size-4" />
        </button>
        <iframe src={src} className="w-full h-full" title={title} />
      </div>
    </div>
  );
}

export function BelgelerTable({
  rows,
  showProje = false,
  showMusteri = true,
  isAdmin = false,
}: {
  rows: RaporListItem[];
  showProje?: boolean;
  showMusteri?: boolean;
  isAdmin?: boolean;
}) {
  const [selected, setSelected] = React.useState<RaporListItem[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [pdfViewer, setPdfViewer] = React.useState<{
    src: string;
    title: string;
  } | null>(null);

  const columns: SmartColumn<RaporListItem>[] = [
    {
      key: "tarih",
      header: "Tarih",
      accessor: (r) => (r.Tarih ? new Date(r.Tarih).getTime() : 0),
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Tarih)}</span>
      ),
    },
    {
      key: "no",
      header: "Rapor No",
      accessor: (r) => r.RaporKodu ?? r["Dosya No"],
      cell: (r) => (
        <span className="font-medium">{r.RaporKodu ?? r["Dosya No"]}</span>
      ),
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
      filterable: true,
    },
    ...(showMusteri
      ? ([
          {
            key: "musteri",
            header: "Müşteri",
            accessor: (r) => r["Müşteri"],
            cell: (r) => r["Müşteri"] ?? "—",
          },
        ] satisfies SmartColumn<RaporListItem>[])
      : []),
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
      key: "ad",
      header: "Dosya",
      accessor: (r) => r["Dosya Adı"],
      cell: (r) => (
        <span className="text-muted-foreground break-words whitespace-normal">
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
        return (
          <button
            type="button"
            onClick={() =>
              setPdfViewer({
                src: `/api/belge/${r.ID}`,
                title: r["Dosya Adı"] ?? `Rapor ${r.RaporKodu ?? r["Dosya No"]}`,
              })
            }
            className="inline-flex items-center gap-1 border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Eye className="size-3.5" /> Görüntüle
          </button>
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

      {pdfViewer && (
        <PdfViewerModal
          src={pdfViewer.src}
          title={pdfViewer.title}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  );
}
