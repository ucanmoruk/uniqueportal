import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db-mysql";
import { scopeByFirma, isAdmin } from "@/lib/permissions";
import { formatTL, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import {
  FileText,
  FileBarChart,
  FileSpreadsheet,
  CircleDollarSign,
  Wallet,
  ArrowUpRight,
  ArrowRight,
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

interface ActionItems {
  bekleyenTeklif: number;
  yeniRapor: number;
  devamEdenTalep: number;
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
      `SELECT IFNULL(SUM(Toplam),0) AS toplam, IFNULL(SUM(Odenen_Tutar),0) AS odenen FROM Fatura`
    );
    ciro = Number(tot?.toplam ?? 0);
    bakiye = ciro - Number(tot?.odenen ?? 0);
  } else {
    const tot = await queryOne<{ toplam: number; odenen: number }>(
      `SELECT IFNULL(SUM(Toplam),0) AS toplam, IFNULL(SUM(Odenen_Tutar),0) AS odenen
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

async function loadActionItems(
  user: Awaited<ReturnType<typeof requireUser>>
): Promise<ActionItems> {
  const firmaFilter = isAdmin(user) ? "" : "AND tb.MusteriID = @id";
  const params = isAdmin(user) ? {} : { id: user.id };

  const bekleyenTeklif = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM TeklifBaslik tb
     WHERE tb.Durum = 'Aktif' AND tb.TeklifDurum = 'Onay Bekleniyor' ${firmaFilter}`,
    params
  ).catch(() => ({ n: 0 }));

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const raporFilter = isAdmin(user) ? "" : "AND n.Firma_ID = @id";
  const yeniRapor = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM NKR_RaporOnay o
     INNER JOIN NKR n ON n.ID = o.NkrID
     WHERE o.YayinUrl IS NOT NULL AND TRIM(o.YayinUrl) <> ''
       AND n.Durum = 'Aktif' AND o.YayinTarihi >= @since ${raporFilter}`,
    isAdmin(user) ? { since } : { since, id: user.id }
  ).catch(() => ({ n: 0 }));

  const talepScope = scopeByFirma(user, "firmakodu");
  const devamEden = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM VIEW_TALEP_LISTE
     WHERE ${talepScope.clause}
       AND Durum NOT IN ('Tamamlandı', 'Raporlandı', 'İptal', 'Pasif')`,
    talepScope.params
  ).catch(() => ({ n: 0 }));

  return {
    bekleyenTeklif: Number(bekleyenTeklif?.n ?? 0),
    yeniRapor: Number(yeniRapor?.n ?? 0),
    devamEdenTalep: Number(devamEden?.n ?? 0),
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
    `SELECT ID, \`Talep No\`, Tarih, \`Talep Oluşturan\`, \`Müşteri\`, Durum
     FROM VIEW_TALEP_LISTE
     WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC
     LIMIT 8`,
    scope.params
  );
}

export default async function OzetPage() {
  const user = await requireUser();
  const [stats, recents, actions] = await Promise.all([
    loadStats(user),
    loadRecentTalepler(user),
    loadActionItems(user),
  ]);
  const showOlusturan = isAdmin(user);

  return (
    <>
      <PageHeader
        title="Hoş geldiniz."
        description="Hesabınıza ait test, teklif ve cari hesap özetiniz aşağıdadır."
        actions={
          <Button asChild size="sm">
            <Link href="/talepler/yeni">
              <Plus className="size-4" /> Yeni Talep
            </Link>
          </Button>
        }
      />

      {(actions.bekleyenTeklif > 0 ||
        actions.yeniRapor > 0 ||
        stats.bakiye > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {actions.bekleyenTeklif > 0 && (
            <ActionBanner
              tone="primary"
              icon={FileSpreadsheet}
              title={`${actions.bekleyenTeklif} teklif onayınızı bekliyor`}
              desc="İncele ve onayla/reddet"
              href="/teklifler"
            />
          )}
          {actions.yeniRapor > 0 && (
            <ActionBanner
              tone="success"
              icon={FileBarChart}
              title={`${actions.yeniRapor} yeni rapor yayınlandı`}
              desc="Son 30 gün · Belgelerim'de"
              href="/belgeler"
            />
          )}
          {stats.bakiye > 0 && (
            <ActionBanner
              tone="warning"
              icon={Wallet}
              title={`${formatTL(stats.bakiye)} açık bakiye`}
              desc="Faturalarınızı görüntüleyin"
              href="/faturalar"
            />
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Toplam Talep"
          value={stats.talepSayisi.toLocaleString("tr-TR")}
          icon={FileText}
          href="/talepler"
          sub={
            actions.devamEdenTalep > 0
              ? `${actions.devamEdenTalep} devam ediyor`
              : undefined
          }
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
                  {showOlusturan && (
                    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide">
                      Oluşturan
                    </th>
                  )}
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
                      colSpan={showOlusturan ? 6 : 5}
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
                      {showOlusturan && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {r["Talep Oluşturan"] ?? "—"}
                        </td>
                      )}
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

function ActionBanner({
  tone,
  icon: Icon,
  title,
  desc,
  href,
}: {
  tone: "primary" | "success" | "warning";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
}) {
  const styles = {
    primary:
      "border-primary/30 bg-primary-subtle/40 hover:border-primary/50",
    success:
      "border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 hover:border-emerald-400/60",
    warning:
      "border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 hover:border-amber-400/60",
  }[tone];
  const iconCls = {
    primary: "text-primary",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg border p-4 transition-colors ${styles}`}
    >
      <span className={`inline-flex shrink-0 items-center justify-center size-10 rounded-md bg-background/70 ${iconCls}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
    </Link>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  tone = "default",
  sub,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone?: "default" | "success" | "warning";
  sub?: string;
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
          {sub && (
            <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
          )}
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
