import { requireUser } from "@/lib/auth";
import { listFaturalar, getFaturaOzet } from "@/lib/repositories/fatura";
import { isAdmin } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatTL } from "@/lib/utils";
import { FaturalarTable } from "./faturalar-table";

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

  return (
    <>
      <PageHeader
        title="Faturalar"
        description={`Toplam ${rows.length} fatura.`}
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

      <FaturalarTable rows={rows} showProje={isAdmin(user)} />
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
