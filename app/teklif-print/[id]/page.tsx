import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import TeklifPrintDocument, {
  type TeklifHeader,
  type TeklifSatir,
} from "./TeklifPrintDocument";
import { PrintToolbar } from "./PrintToolbar";
import { TeklifOnayButton } from "@/components/teklif-onay-button";

/**
 * Müşteri tarafına çıkan teklif yazdırma sayfası.
 * Veri sözleşmesi: docs/musteri-portali-teklif-sozlesmesi.md (§3-7).
 *
 * - Sahiplik kontrolü: müşteri ise `TeklifBaslik.MusteriID = user.id` ŞART.
 * - Taslak görünmez (`TeklifDurum NOT IN ('Taslak', ...)`).
 * - URL parametresi `id` = `TeklifBaslik.ID`. (Spec'te DisTeklifKodu önerilir;
 *   şu an portal listede ID üzerinden ilerliyor, sahiplik kontrolü zorunlu
 *   olduğu için pratikte enumerasyon riski yok.)
 */
export const dynamic = "force-dynamic";

interface RawBaslik {
  ID: number;
  TeklifNo: number | null;
  DisTeklifKodu: string | null;
  RevNo: number;
  Tarih: Date | null;
  Notlar: string | null;
  TeklifKonusu: string | null;
  TeklifVeren: string | null;
  KdvOran: number | null;
  GenelIskonto: string | number | null;
  TeklifDurum: string | null;
  MusteriID: number | null;
  // Firma JOIN
  MusteriAd: string | null;
  MusteriAdres: string | null;
  MusteriTelefon: string | null;
  MusteriEmail: string | null;
  MusteriYetkili: string | null;
  VergiDairesi: string | null;
  VergiNo: string | null;
}

interface RawKalem {
  HizmetAdi: string | null;
  Adet: number | null;
  Fiyat: string | number | null;
  ParaBirimi: string | null;
  Iskonto: string | number | null;
  Metot: string | null;
  Akreditasyon: string | null;
  Notlar: string | null;
}

function trDate(d: Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
}

export default async function TeklifPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const user = await requireUser();

  const baslik = await queryOne<RawBaslik>(
    `SELECT TOP 1
        tb.ID, tb.TeklifNo, tb.DisTeklifKodu, tb.RevNo, tb.Tarih,
        tb.Notlar, tb.TeklifKonusu, tb.TeklifVeren,
        tb.KdvOran, tb.GenelIskonto, tb.TeklifDurum, tb.MusteriID,
        f.Firma_Adi  AS MusteriAd,
        f.Adres      AS MusteriAdres,
        f.Telefon    AS MusteriTelefon,
        f.Mail       AS MusteriEmail,
        f.Yetkili    AS MusteriYetkili,
        f.Vergi_Dairesi AS VergiDairesi,
        f.Vergi_No      AS VergiNo
     FROM cosmoroot.TeklifBaslik tb
     LEFT JOIN dbo.Firma f ON f.ID = tb.MusteriID
     WHERE tb.ID = @id
       AND tb.Durum = 'Aktif'
       AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))`,
    { id: numId }
  );

  if (!baslik) notFound();

  // Sahiplik kontrolü: müşteri/proje ise MusteriID = user.id şart.
  if (!isAdmin(user) && baslik.MusteriID !== user.id) {
    notFound();
  }

  const kalemler = await query<RawKalem>(
    `SELECT HizmetAdi, Adet, Fiyat, ParaBirimi, Iskonto, Metot, Akreditasyon, Notlar
     FROM cosmoroot.TeklifKalem
     WHERE TeklifID = @id
     ORDER BY ID`,
    { id: baslik.ID }
  );

  const header: TeklifHeader = {
    TeklifNo: baslik.TeklifNo,
    DisTeklifKodu: baslik.DisTeklifKodu,
    RevNo: baslik.RevNo,
    Tarih: trDate(baslik.Tarih),
    Notlar: baslik.Notlar,
    TeklifKonusu: baslik.TeklifKonusu ?? undefined,
    TeklifVeren: baslik.TeklifVeren ?? undefined,
    KdvOran: baslik.KdvOran,
    GenelIskonto: baslik.GenelIskonto,
    MusteriAd: baslik.MusteriAd ?? "",
    MusteriAdres: baslik.MusteriAdres ?? "",
    MusteriTelefon: baslik.MusteriTelefon ?? undefined,
    MusteriEmail: baslik.MusteriEmail ?? "",
    VergiDairesi: baslik.VergiDairesi ?? undefined,
    VergiNo: baslik.VergiNo ?? undefined,
    MusteriYetkili: baslik.MusteriYetkili ?? "",
  };

  const satirlar: TeklifSatir[] = kalemler.map((k) => ({
    HizmetAdi: k.HizmetAdi ?? "",
    Adet: k.Adet,
    Fiyat: k.Fiyat,
    ParaBirimi: k.ParaBirimi,
    Iskonto: k.Iskonto,
    Metot: k.Metot ?? "",
    Akreditasyon: k.Akreditasyon ?? "",
    Notlar: k.Notlar,
  }));

  const onayBekliyor = baslik.TeklifDurum === "Onay Bekleniyor";
  const noLabel = header.DisTeklifKodu
    ? `${header.DisTeklifKodu}/${String(header.RevNo).padStart(2, "0")}`
    : header.TeklifNo != null
      ? `${header.TeklifNo}/${String(header.RevNo).padStart(2, "0")}`
      : "—";

  return (
    <TeklifPrintDocument
      header={header}
      satirlar={satirlar}
      sirketAdi="UNIQUE ANALYSE"
      sirketEmail="info@uniqueanalyse.com"
      toolbar={<PrintToolbar backHref={`/teklifler/${numId}`} />}
      approvalSlot={
        onayBekliyor ? (
          <TeklifOnayButton
            variant="inline"
            teklifId={numId}
            teklif={{
              no: noLabel,
              musteriAd: header.MusteriAd,
              musteriYetkili: header.MusteriYetkili || undefined,
              tarih: header.Tarih,
              durum: baslik.TeklifDurum ?? undefined,
            }}
          />
        ) : null
      }
    />
  );
}
