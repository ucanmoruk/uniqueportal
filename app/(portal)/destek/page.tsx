import { requireUser } from "@/lib/auth";
import { listDestek, type DestekListItem } from "@/lib/repositories/destek";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DestekPage() {
  const user = await requireUser();
  const rows = await listDestek(user);

  const columns: ColumnDef<DestekListItem>[] = [
    {
      key: "no",
      header: "Talep No",
      cell: (r) => <span className="font-medium">{r["Talep No"]}</span>,
    },
    {
      key: "tarih",
      header: "Tarih",
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Tarih)}</span>
      ),
    },
    {
      key: "olusturan",
      header: "Oluşturan",
      cell: (r) => r["Talep Oluşturan"] ?? "—",
    },
    {
      key: "konu",
      header: "Konu",
      cell: (r) => (
        <span className="line-clamp-1 max-w-md">{r.Konu ?? "—"}</span>
      ),
    },
    {
      key: "durum",
      header: "Durum",
      cell: (r) => <StatusBadge value={r.Durum} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Destek Talepleri"
        description={`Toplam ${rows.length} talep. Yeni talep oluşturma ve mesajlaşma yakında.`}
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.TALEP_ID}
            emptyMessage="Henüz destek talebi bulunmuyor."
          />
        </CardContent>
      </Card>
    </>
  );
}
