import { requireUser } from "@/lib/auth";
import { listRaporlar, type RaporListItem } from "@/lib/repositories/rapor";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { Download, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BelgelerPage() {
  const user = await requireUser();
  const rows = await listRaporlar(user);

  const columns: ColumnDef<RaporListItem>[] = [
    {
      key: "no",
      header: "Belge No",
      cell: (r) => (
        <span className="font-medium">
          {r.RaporID ?? `UQ${r["Dosya No"]}`}
        </span>
      ),
    },
    {
      key: "tarih",
      header: "Tarih",
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Tarih)}</span>
      ),
    },
    {
      key: "talep",
      header: "Talep No",
      cell: (r) => r.TalepNo ?? "—",
    },
    { key: "musteri", header: "Müşteri", cell: (r) => r["Müşteri"] ?? "—" },
    { key: "proje", header: "Proje", cell: (r) => r.Proje ?? "—" },
    {
      key: "tur",
      header: "Tür",
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
      cell: (r) => (
        <span className="text-muted-foreground line-clamp-1 max-w-xs">
          {r["Dosya Adı"] ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <a
          href={`/api/belge/${r.ID}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
        >
          <Download className="size-3.5" /> İndir
        </a>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Belgeler"
        description={`Toplam ${rows.length} aktif rapor.`}
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.ID}
            emptyMessage="Henüz belge bulunmuyor."
          />
        </CardContent>
      </Card>
    </>
  );
}
