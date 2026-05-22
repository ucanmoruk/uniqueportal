import { requireUser } from "@/lib/auth";
import { listTermin, type TerminListItem } from "@/lib/repositories/termin";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TerminPage() {
  const user = await requireUser();
  const rows = await listTermin(user);

  const now = Date.now();
  const columns: ColumnDef<TerminListItem>[] = [
    {
      key: "evrak",
      header: "Evrak No",
      cell: (r) => <span className="font-medium">{r["Evrak No"] ?? "—"}</span>,
    },
    {
      key: "rapor",
      header: "Rapor No",
      cell: (r) => r["Rapor No"] ?? "—",
    },
    {
      key: "firma",
      header: "Firma",
      cell: (r) => r.Firma ?? "—",
    },
    { key: "proje", header: "Proje", cell: (r) => r.Proje ?? "—" },
    { key: "numune", header: "Numune", cell: (r) => r.Numune ?? "—" },
    {
      key: "hizmet",
      header: "Hizmet",
      cell: (r) => (
        <span className="line-clamp-1 max-w-xs">{r.Hizmet ?? "—"}</span>
      ),
    },
    {
      key: "kabul",
      header: "Kabul",
      cell: (r) => (
        <span className="text-muted-foreground">{formatDate(r.Kabul)}</span>
      ),
    },
    {
      key: "termin",
      header: "Termin",
      cell: (r) => {
        if (!r.Termin) return <span className="text-muted-foreground">—</span>;
        const t = new Date(r.Termin).getTime();
        const overdue = t < now;
        const soon = !overdue && t - now < 1000 * 60 * 60 * 24 * 3;
        return (
          <span
            className={
              overdue
                ? "font-medium text-red-600 dark:text-red-400"
                : soon
                  ? "font-medium text-amber-600 dark:text-amber-400"
                  : ""
            }
          >
            {formatDate(r.Termin)}
          </span>
        );
      },
    },
    { key: "durum", header: "Durum", cell: (r) => <StatusBadge value={r.Durum} /> },
  ];

  return (
    <>
      <PageHeader
        title="Termin Takibi"
        description={`Son 500 kayıt gösteriliyor — toplam ${rows.length}.`}
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r, idx) => r.nID ?? `${r.ID}-${idx}`}
            emptyMessage="Henüz termin kaydı bulunmuyor."
          />
        </CardContent>
      </Card>
    </>
  );
}
