import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { scopeByFirma, isAdmin } from "@/lib/permissions";
import { formatTL, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import {
  FileText,
  FileBarChart,
  CircleDollarSign,
  Wallet,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Stats {
  talepSayisi: number;
  raporSayisi: number;
  ciro: number;
  bakiye: number;
}

async function loadStats(
  user: Awaited<ReturnType<typeof requireUser>>
): Promise<Stats> {
  const talepScope = scopeByFirma(user, "firmakodu");
  const talep = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM VIEW_TALEP_LISTE WHERE ${talepScope.clause}`,
    talepScope.params
  );

  const raporScope = scopeByFirma(user, "musteri-proje");
  const rapor = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM VIEW_RAPOR
     WHERE Durum = 'Aktif' AND ${raporScope.clause}`,
    raporScope.params
  );

  let ciro = 0;
  let bakiye = 0;
  if (isAdmin(user)) {
    const tot = await queryOne<{ toplam: number; odenen: number }>(
      `SELECT ISNULL(SUM(Toplam),0) AS toplam, ISNULL(SUM(Odenen_Tutar),0) AS odenen FROM Fatura`
    );
    ciro = Number(tot?.toplam ?? 0);
    bakiye = ciro - Number(tot?.odenen ?? 0);
  } else {
    const tot = await queryOne<{ toplam: number; odenen: number }>(
      `SELECT ISNULL(SUM(Toplam),0) AS toplam, ISNULL(SUM(Odenen_Tutar),0) AS odenen
       FROM Fatura WHERE FaturaFirmaID = @id`,
      { id: user.id }
    );
    ciro = Number(tot?.toplam ?? 0);
    bakiye = ciro - Number(tot?.odenen ?? 0);
  }

  return {
    talepSayisi: Number(talep?.n ?? 0),
    raporSayisi: Number(rapor?.n ?? 0),
    ciro,
    bakiye,
  };
}

async function loadRecentTalepler(
  user: Awaited<ReturnType<typeof requireUser>>
) {
  const scope = scopeByFirma(user, "firmakodu");
  return query<{
    ID: number;
    "Talep No": string;
    Tarih: Date | null;
    "Talep Oluşturan": string | null;
    "Müşteri": string | null;
    Durum: string | null;
  }>(
    `SELECT TOP 8 ID, [Talep No], Tarih, [Talep Oluşturan], [Müşteri], Durum
     FROM VIEW_TALEP_LISTE
     WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export default async function OzetPage() {
  const user = await requireUser();
  const [stats, recents] = await Promise.all([
    loadStats(user),
    loadRecentTalepler(user),
  ]);

  return (
    <>
      <PageHeader
        title={`Hoş geldiniz, ${user.firmaAdi}`}
        description="Hesabınıza ait test, teklif ve cari hesap özetiniz aşağıdadır."
        actions={
          <Button asChild size="sm">
            <Link href="/talepler/yeni">
              <Plus className="size-4" /> Yeni Talep
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Toplam Talep"
          value={stats.talepSayisi.toLocaleString("tr-TR")}
          icon={FileText}
          href="/talepler"
        />
        <StatCard
          title="Aktif Belge"
          value={stats.raporSayisi.toLocaleString("tr-TR")}
          icon={FileBarChart}
          href="/belgeler"
        />
        <StatCard
          title="Toplam Ciro"
          value={formatTL(stats.ciro)}
          icon={CircleDollarSign}
          href="/faturalar"
          tone="success"
        />
        <StatCard
          title="Açık Bakiye"
          value={formatTL(stats.bakiye)}
          icon={Wallet}
          href="/faturalar"
          tone={stats.bakiye > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Son Talepler</CardTitle>
          <Link
            href="/talepler"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Tümünü gör <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="px-6 py-2.5 font-medium text-xs uppercase tracking-wide">
                    Talep No
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide">
                    Tarih
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide">
                    Müşteri
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide">
                    Oluşturan
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide">
                    Durum
                  </th>
                  <th className="px-6 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {recents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      Henüz talep bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  recents.map((r) => (
                    <tr
                      key={r.ID}
                      className="border-b last:border-b-0 hover:bg-accent/30"
                    >
                      <td className="px-6 py-3 font-medium">{r["Talep No"]}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(r.Tarih)}
                      </td>
                      <td className="px-4 py-3">{r["Müşteri"] ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r["Talep Oluşturan"] ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={r.Durum} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/talepler/${r.ID}`}
                          className="text-primary hover:underline text-sm"
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone?: "default" | "success" | "warning";
}) {
  const valueCls = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];

  const iconBg = {
    default: "bg-primary/10 text-primary",
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  }[tone];

  return (
    <Link
      href={href}
      className="group block rounded-lg border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <div className={`text-2xl font-semibold mt-1.5 ${valueCls}`}>
            {value}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center justify-center size-9 rounded-md ${iconBg}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1 group-hover:text-primary transition-colors">
        Görüntüle <ArrowUpRight className="size-3" />
      </div>
    </Link>
  );
}
