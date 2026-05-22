import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { scopeByFirma, isAdmin } from "@/lib/permissions";
import { formatTL, formatDate } from "@/lib/utils";
import {
  FileText,
  FileBarChart,
  CircleDollarSign,
  Wallet,
  Clock,
} from "lucide-react";

interface Stats {
  talepSayisi: number;
  raporSayisi: number;
  ciro: number;
  bakiye: number;
}

async function loadStats(user: Awaited<ReturnType<typeof requireUser>>): Promise<Stats> {
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
    `SELECT TOP 10 ID, [Talep No], Tarih, [Talep Oluşturan], [Müşteri], Durum
     FROM VIEW_TALEP_LISTE
     WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

function statusBadge(durum: string | null) {
  const d = (durum ?? "").toLowerCase();
  let cls = "bg-muted text-muted-foreground";
  if (d.includes("yeni")) cls = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  else if (d.includes("onay") || d.includes("aktif"))
    cls = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  else if (d.includes("pasif") || d.includes("iptal"))
    cls = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  else if (d.includes("bekle"))
    cls = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {durum ?? "—"}
    </span>
  );
}

export default async function OzetPage() {
  const user = await requireUser();
  const [stats, recents] = await Promise.all([
    loadStats(user),
    loadRecentTalepler(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hoş geldiniz, {user.firmaAdi}
        </h1>
        <p className="text-sm text-muted-foreground">
          Hesabınıza ait özet bilgiler aşağıdadır.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Talep"
          value={stats.talepSayisi.toLocaleString("tr-TR")}
          icon={<FileText className="size-5" />}
        />
        <StatCard
          title="Aktif Belge"
          value={stats.raporSayisi.toLocaleString("tr-TR")}
          icon={<FileBarChart className="size-5" />}
        />
        <StatCard
          title="Toplam Ciro"
          value={formatTL(stats.ciro)}
          icon={<CircleDollarSign className="size-5" />}
          tone="success"
        />
        <StatCard
          title="Açık Bakiye"
          value={formatTL(stats.bakiye)}
          icon={<Wallet className="size-5" />}
          tone={stats.bakiye > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            Son Talepler
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Talep No</th>
                  <th className="px-4 py-2 font-medium">Tarih</th>
                  <th className="px-4 py-2 font-medium">Müşteri</th>
                  <th className="px-4 py-2 font-medium">Oluşturan</th>
                  <th className="px-4 py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {recents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      Henüz talep bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  recents.map((r) => (
                    <tr key={r.ID} className="border-t hover:bg-accent/30">
                      <td className="px-4 py-2 font-medium">{r["Talep No"]}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(r.Tarih)}</td>
                      <td className="px-4 py-2">{r["Müşteri"] ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r["Talep Oluşturan"] ?? "—"}</td>
                      <td className="px-4 py-2">{statusBadge(r.Durum)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneCls =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {title}
            </div>
            <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
          </div>
          <div className={`inline-flex items-center justify-center size-10 rounded-lg bg-muted ${toneCls}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
