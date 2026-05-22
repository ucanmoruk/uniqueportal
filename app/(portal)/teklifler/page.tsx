import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTeklifler, type TeklifListItem } from "@/lib/repositories/teklif";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TekliflerPage() {
  const user = await requireUser();
  const rows = await listTeklifler(user);

  const columns: ColumnDef<TeklifListItem>[] = [
    {
      key: "no",
      header: "Teklif No",
      cell: (r) => <span className="font-medium">{r["Teklif No"]}</span>,
    },
    {
      key: "tarih",
      header: "Tarih",
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Tarih)}</span>
      ),
    },
    { key: "musteri", header: "Müşteri", cell: (r) => r["Müşteri"] ?? "—" },
    { key: "proje", header: "Proje", cell: (r) => r.Proje ?? "—" },
    {
      key: "aciklama",
      header: "Açıklama",
      cell: (r) => (
        <span className="text-muted-foreground line-clamp-1 max-w-xs">
          {r.Aciklama ?? "—"}
        </span>
      ),
    },
    {
      key: "durum",
      header: "Durum",
      cell: (r) => <StatusBadge value={r.Durum} />,
    },
    {
      key: "actions",
      header: "",
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
    <>
      <PageHeader
        title="Teklifler"
        description={`Toplam ${rows.length} teklif listeleniyor.`}
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.ID}
            emptyMessage="Henüz teklif bulunmuyor."
          />
        </CardContent>
      </Card>
    </>
  );
}
