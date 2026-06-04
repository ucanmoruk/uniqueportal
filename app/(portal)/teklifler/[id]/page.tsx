import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  findTeklifByListId,
  getTeklifDetail,
} from "@/lib/repositories/teklif";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Printer } from "lucide-react";
import { findFirmaById } from "@/lib/repositories/firma";
import { MailNotifyButton } from "@/components/mail-notify-button";
import { TeklifOnayButton } from "@/components/teklif-onay-button";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TeklifDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const user = await requireUser();
  const ref = await findTeklifByListId(numId);
  if (!ref) notFound();

  const { baslik, satirlar } = await getTeklifDetail(ref.TeklifNo);
  if (!baslik) notFound();

  // Erişim kontrolü: Admin değilse teklifin firma ID'si veya plasiyeri eşleşmeli.
  if (user.tur !== "Admin") {
    const targetFirma = await findFirmaById(baslik.FirmaID ?? -1);
    const okMusteri =
      baslik.FirmaID != null &&
      (baslik.FirmaID === user.id ||
        baslik.Firma_Adi === user.firmaAdi ||
        targetFirma?.Kod === user.kod);
    const okPlasiyer =
      user.tur === "Plasiyer" && targetFirma?.PlasiyerID === user.plasiyerId;
    if (!okMusteri && !okPlasiyer) notFound();
  }

  const currency = baslik.ParaBirimi || "₺";

  return (
    <>
      <PageHeader
        title={`Teklif #${baslik.TeklifNo}`}
        description={`${baslik.TeklifTuru ?? "—"} · ${formatDate(baslik.Tarih)}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/teklifler">
                <ArrowLeft className="size-4" /> Listeye dön
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/teklif-print/${numId}`} target="_blank">
                <Printer className="size-4" /> Yazdır
              </Link>
            </Button>
            {baslik.TeklifDurum === "Onay Bekleniyor" && (
              <TeklifOnayButton
                teklifId={numId}
                teklif={{
                  no: baslik.TeklifNo,
                  musteriAd: baslik.Firma_Adi ?? "",
                  tarih: formatDate(baslik.Tarih),
                  durum: baslik.TeklifDurum,
                }}
              />
            )}
            {isAdmin(user) && <MailNotifyButton tur="teklif" id={numId} />}
            <StatusBadge value={baslik.TeklifDurum} />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Müşteri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="Firma" value={baslik.Firma_Adi} />
          <Field label="Adres" value={baslik.FirmaAdres} multiline />
          <Field label="Telefon" value={baslik.Telefon} />
          <Field label="E-posta" value={baslik.Mail} />
          {baslik.Aciklama && (
            <div className="sm:col-span-2">
              <Field label="Açıklama" value={baslik.Aciklama} multiline />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hizmetler ({satirlar.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Akr.</th>
                  <th className="px-4 py-2 font-medium">Hizmet</th>
                  <th className="px-4 py-2 font-medium">Metot</th>
                  <th className="px-4 py-2 font-medium text-right">Birim Fiyat</th>
                  <th className="px-4 py-2 font-medium text-right">Adet</th>
                  <th className="px-4 py-2 font-medium text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      Teklifte hizmet satırı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  satirlar.map((s, idx) => (
                    <tr key={s.ID} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2">
                        {s.Akreditasyon === "Var" ? (
                          <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 text-xs font-medium">
                            Akr.
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{s.Hizmet ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {s.Metot ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {s["Birim Fiyat"]} {currency}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {s.Adet ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {s.Toplam} {currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {satirlar.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Toplam</CardTitle>
          </CardHeader>
          <CardContent>
            <TeklifToplam
              satirlar={satirlar}
              kdvOran={baslik.KdvOran ?? 0}
              genelIskonto={baslik.GenelIskonto ?? 0}
              currency={currency}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

/**
 * Ara toplam → genel iskonto → KDV → genel toplam özetini gösterir.
 * `s.Toplam` ve `s["Birim Fiyat"]` zaten tr-TR formatında string;
 * burada gerçek sayıyı tekrar elde etmek için ondalık virgülü noktaya çevirip
 * binlik ayracını sileriz.
 */
function TeklifToplam({
  satirlar,
  kdvOran,
  genelIskonto,
  currency,
}: {
  satirlar: { Toplam: string }[];
  kdvOran: number;
  genelIskonto: number;
  currency: string;
}) {
  const araToplam = satirlar.reduce((acc, s) => acc + parseTrNumber(s.Toplam), 0);
  const iskontoTutar = araToplam * (genelIskonto / 100);
  const netAraToplam = araToplam - iskontoTutar;
  const kdvTutar = netAraToplam * (kdvOran / 100);
  const genelToplam = netAraToplam + kdvTutar;

  return (
    <div className="ml-auto w-full sm:max-w-sm text-sm">
      <Row label="Ara Toplam" value={formatMoney(araToplam, currency)} />
      {genelIskonto > 0 && (
        <Row
          label={`Genel İskonto (${genelIskonto}%)`}
          value={`− ${formatMoney(iskontoTutar, currency)}`}
        />
      )}
      <Row label={`KDV (${kdvOran}%)`} value={formatMoney(kdvTutar, currency)} />
      <div className="mt-2 pt-2 border-t flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Genel Toplam
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatMoney(genelToplam, currency)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function parseTrNumber(s: string): number {
  // "2.215,00" -> 2215.00 ; "115,00" -> 115
  const clean = s.replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n: number, currency: string): string {
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
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
      <div className={multiline ? "mt-0.5 whitespace-pre-wrap" : "mt-0.5 truncate"}>
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
