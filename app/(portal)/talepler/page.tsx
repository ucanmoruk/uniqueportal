import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTalepler } from "@/lib/repositories/talep";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import type { TalepListeItem } from "@/lib/repositories/talep";

export const dynamic = "force-dynamic";

export default async function TaleplerPage() {
  const user = await requireUser();
  const rows = await listTalepler(user);

  const columns: ColumnDef<TalepListeItem>[] = [
    {
      key: "talepNo",
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
    { key: "musteri", header: "Müşteri", cell: (r) => r["Müşteri"] ?? "—" },
    {
      key: "olusturan",
      header: "Oluşturan",
      cell: (r) => (
        <span className="text-muted-foreground">
          {r["Talep Oluşturan"] ?? "—"}
        </span>
      ),
    },
    { key: "durum", header: "Durum", cell: (r) => <StatusBadge value={r.Durum} /> },
    {
      key: "actions",
      header: "",
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
    <>
      <PageHeader
        title="Talepler"
        description={`Toplam ${rows.length} talep listeleniyor.`}
        actions={
          <Button size="sm" asChild>
            <Link href="/talepler/yeni">
              <Plus className="size-4" /> Yeni Talep
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.ID}
            emptyMessage="Henüz talep bulunmuyor."
          />
        </CardContent>
      </Card>
    </>
  );
}
