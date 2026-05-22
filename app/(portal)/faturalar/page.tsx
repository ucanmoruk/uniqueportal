import { requireUser } from "@/lib/auth";
import {
  listFaturalar,
  getFaturaOzet,
  type FaturaListItem,
} from "@/lib/repositories/fatura";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatTL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FaturalarPage() {
  const user = await requireUser();
  const [rows, ozet] = await Promise.all([
    listFaturalar(user),
    getFaturaOzet(user),
  ]);

  const ciro = Number(ozet?.toplam ?? 0);
  const odenen = Number(ozet?.odenen ?? 0);
  const bakiye = ciro - odenen;

  const columns: ColumnDef<FaturaListItem>[] = [
    {
      key: "no",
      header: "Fatura No",
      cell: (r) => <span className="font-medium">{r["Fatura No"]}</span>,
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
      key: "tutar",
      header: "Tutar",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTL(Number(r.Tutar))}
        </span>
      ),
    },
    {
      key: "kdv",
      header: "KDV",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTL(Number(r.KDV))}
        </span>
      ),
    },
    {
      key: "toplam",
      header: "Toplam",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums font-medium">
          {formatTL(Number(r.Toplam))}
        </span>
      ),
    },
    {
      key: "odeme",
      header: "Ödeme",
      cell: (r) => <StatusBadge value={r["Ödeme"]} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Faturalar"
        description={`Toplam ${rows.length} fatura listeleniyor.`}
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <SummaryCard label="Toplam Ciro" value={formatTL(ciro)} tone="primary" />
        <SummaryCard label="Tahsil Edilen" value={formatTL(odenen)} tone="success" />
        <SummaryCard
          label="Açık Bakiye"
          value={formatTL(bakiye)}
          tone={bakiye > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.ID}
            emptyMessage="Henüz fatura bulunmuyor."
          />
        </CardContent>
      </Card>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "default";
}) {
  const cls = {
    primary: "text-primary",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    default: "text-foreground",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
