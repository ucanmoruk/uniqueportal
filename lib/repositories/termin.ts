import { query } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface TerminListItem {
  ID: number;
  nID: number | null;
  "Evrak No": number | null;
  "Rapor No": number | null;
  Firma: string | null;
  Proje: string | null;
  Numune: string | null;
  Hizmet: string | null;
  Method: string | null;
  Kabul: Date | null;
  Termin: Date | null;
  Durum: string | null;
  Rapor: string | null;
  Yetkili: string | null;
}

/**
 * Termin takibi listesi.
 *
 * Durum + görünürlük SATIR BAZLI — her NumuneX1 (analiz/hizmet) için ayrı.
 * Lab kabulü ve rapor yayını `BolumID × RaporFormati` ikilisi bazında işliyor:
 *   StokAnalizListesi(sa) ↔ NKR_LabKabul(k) ↔ NKR_RaporOnay(o)
 *
 * CASE (sırayla):
 *   1. Bu satırın formatı yayınlandı/onaylandı → 'Onaylandı'
 *      (NKR_RaporOnay.Durum IN ('Onaylandı','Yayınlandı','Raporlandı'))
 *   2. Aynı (Bölüm,Format) için lab kabul yok → 'Kabul Bekliyor'
 *   3. Lab kabul var, sonuç yok → 'Analiz Aşamasında'
 *   4. Sonuç girilmiş → 'Onay Bekliyor'
 *
 * GÖRÜNÜRLÜK:
 *   - NKR.Rapor_Durumu='Raporlandı' ise NKR tamamen liste dışı.
 *   - Bu satırın RaporFormati'na karşılık gelen NKR_RaporOnay yayın durumunda
 *     ise satır liste dışı (müşteri /belgeler'de görür).
 *
 * Şema: NKR_RaporOnay / NKR_LabKabul → cosmoroot, NumuneX1 / StokAnalizListesi → dbo
 */
const RAPOR_ONAY_DURUMLARI = `(N'Onaylandı', N'Yayınlandı', N'Raporlandı')`;

const FORMAT_YAYINDA = `EXISTS (
  SELECT 1 FROM cosmoroot.NKR_RaporOnay o
  WHERE o.NkrID = v.nID
    AND (
      o.RaporFormati = sa.RaporFormati
      OR o.RaporFormati IS NULL
      OR sa.RaporFormati IS NULL
    )
    AND o.Durum IN ${RAPOR_ONAY_DURUMLARI}
)`;

// İç portalın "lab kabul" işareti = NKR seviyesinde NKR_LabKabul satırının
// varlığı. (HizmetDurum eski kayıtlarda hala 'Yeni Analiz' kalsa bile lab
// kabul satırı varsa analiz aşaması başlamış sayılır.)
const LAB_KABUL_VAR = `EXISTS (
  SELECT 1 FROM cosmoroot.NKR_LabKabul k WHERE k.NkrID = v.nID
)`;

// Sıra: en ileri aşamadan geriye.
//   1. Bu satırın formatı yayında → 'Onaylandı'
//   2. Sonuç kaydedilmiş         → 'Onay Bekliyor'
//   3. NKR için lab kabul satırı yok → 'Kabul Bekliyor' (yeni rapor)
//   4. Aksi → 'Analiz Aşamasında'
const DURUM_EXPR = `
  CASE
    WHEN ${FORMAT_YAYINDA} THEN N'Onaylandı'
    WHEN x.SonucKayitTarihi IS NOT NULL THEN N'Onay Bekliyor'
    WHEN NOT ${LAB_KABUL_VAR} THEN N'Kabul Bekliyor'
    ELSE N'Analiz Aşamasında'
  END
`;

// Görünürlük: rapor durumu Raporlandı olanlar VE bu satırın formatı yayında
// olanlar tamamen gizli (yayınlananlar müşteriye /belgeler'de görünür).
const RAPOR_HARIC_WHERE = `
  (v.Rapor IS NULL OR v.Rapor <> N'Raporlandı')
  AND NOT ${FORMAT_YAYINDA}
`;

// v.ID = NumuneX1.ID → x; ondan AnalizID üzerinden StokAnalizListesi (sa) — sa'dan
// BolumID + RaporFormati alıyoruz ki NKR_LabKabul ile satır bazlı eşleşelim.
const SELECT_BASE = `
  SELECT TOP 500
    v.ID, v.nID, v.[Evrak No], v.[Rapor No], v.Firma, v.Proje, v.Numune,
    v.Hizmet, v.Method, v.Kabul, v.Termin,
    ${DURUM_EXPR} AS Durum,
    v.Rapor, v.Yetkili
  FROM VIEW_TERMINTAKIP v
  LEFT JOIN dbo.NumuneX1 x ON x.ID = v.ID
  LEFT JOIN dbo.StokAnalizListesi sa ON sa.ID = x.AnalizID
`;

export async function listTermin(user: SessionUser): Promise<TerminListItem[]> {
  if (isAdmin(user)) {
    return query<TerminListItem>(
      `${SELECT_BASE}
       WHERE ${RAPOR_HARIC_WHERE}
       ORDER BY v.Termin DESC, v.nID DESC`
    );
  }

  // Müşteri / Proje / Plasiyer: VIEW_TERMINTAKIP'te [Müşteri] kolonu YOK,
  // o yüzden scopeByFirma'nın varsayılan clause'unu kullanamıyoruz — manuel
  // olarak Firma/Proje alanları üzerinden filtreliyoruz.
  if (!user.firmaAdi) {
    return [];
  }

  const isProje = user.tur === "Proje";
  const whereSahiplik = isProje
    ? "(v.Firma = @firma OR v.Proje = @firma)"
    : "v.Firma = @firma";

  return query<TerminListItem>(
    `${SELECT_BASE}
     WHERE ${RAPOR_HARIC_WHERE} AND ${whereSahiplik}
     ORDER BY v.Termin DESC, v.nID DESC`,
    { firma: user.firmaAdi }
  );
}
