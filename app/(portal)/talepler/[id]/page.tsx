import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTalepDetail } from "@/lib/repositories/talep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { IptalTalepButton } from "./iptal-button";

export const dynamic = "force-dynamic";

export default async function TalepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const user = await requireUser();
  const { talep, raporlama, fatura, numuneler } = await getTalepDetail(
    user,
    numId
  );

  if (!talep) notFound();

  // Görüntülenecek talep no — yeni format `ÜGAM/26/XXXX`, eski kayıtlar `UQ<no>`
  const talepEtiket = talep.DisTalepKodu ?? `UQ${talep.TalepNo}`;
  const iptalEdilebilir = talep.Durum === "Yeni Talep";

  return (
    <>
      <PageHeader
        title={`Talep ${talepEtiket}`}
        description={`Oluşturulma tarihi: ${formatDate(talep.Tarih)}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/talepler">
                <ArrowLeft className="size-4" /> Listeye dön
              </Link>
            </Button>
            {iptalEdilebilir && (
              <IptalTalepButton talepId={talep.ID} talepNo={talepEtiket} />
            )}
            <StatusBadge value={talep.Durum} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Raporlama Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Firma" value={raporlama?.Firma} />
            <Field label="Adres" value={raporlama?.Adres} multiline />
            <Field label="Yetkili" value={raporlama?.Yetkili} />
            <Field label="İletişim" value={raporlama?.Iletisim} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Karar" value={raporlama?.Karar} />
              <Field label="Dil" value={raporlama?.Dil} />
              <Field label="İade" value={raporlama?.Iade} />
              <Field label="Üretici" value={raporlama?.UreticiFirma} />
            </div>
            <Field label="Not" value={raporlama?.Note} multiline />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fatura Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Firma" value={fatura?.Firma} />
            <Field label="Adres" value={fatura?.Adres} multiline />
            <Field label="Vergi Dairesi" value={fatura?.VergiDairesi} />
            <Field label="Vergi No" value={fatura?.VergiNo} />
            <Field label="E-posta" value={fatura?.Mail} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Numuneler ({numuneler.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Numune</th>
                  <th className="px-4 py-2 font-medium">Seri/Lot No vb.</th>
                  <th className="px-4 py-2 font-medium">Analiz</th>
                  <th className="px-4 py-2 font-medium">Metot</th>
                </tr>
              </thead>
              <tbody>
                {numuneler.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      Bu talepte numune bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  numuneler.map((n, idx) => (
                    <tr key={n.ID} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 font-medium">{n.Numune ?? "—"}</td>
                      <td className="px-4 py-2">{n.Ozellik ?? "—"}</td>
                      <td className="px-4 py-2">{n.Analiz ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {n.Metot ?? "—"}
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

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          multiline
            ? "mt-0.5 whitespace-pre-wrap"
            : "mt-0.5 truncate"
        }
      >
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
