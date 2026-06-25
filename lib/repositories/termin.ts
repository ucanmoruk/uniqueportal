import { query } from "@/lib/db-mysql";
import { isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface TerminListItem {
  ID: number;
  nID: number | null;
  "Evrak No": number | null;
  "Rapor No": number | null;
  /** Müşteriye gösterilen dış rapor kodu (ör. "ÜGAM/GE26/K6HV"). */
  RaporKodu: string | null;
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

const RAPOR_ONAY_DURUMLARI = `('Onaylandı', 'Yayınlandı', 'Raporlandı')`;

const FORMAT_YAYINDA = `EXISTS (
  SELECT 1 FROM NKR_RaporOnay o
  WHERE o.NkrID = v.nID
    AND (
      o.RaporFormati = sa.RaporFormati
      OR o.RaporFormati IS NULL
      OR sa.RaporFormati IS NULL
    )
    AND o.Durum IN ${RAPOR_ONAY_DURUMLARI}
)`;

const LAB_KABUL_VAR = `EXISTS (
  SELECT 1 FROM NKR_LabKabul k WHERE k.NkrID = v.nID
)`;

const DURUM_EXPR = `
  CASE
    WHEN ${FORMAT_YAYINDA} THEN 'Onaylandı'
    WHEN x.SonucKayitTarihi IS NOT NULL THEN 'Onay Bekliyor'
    WHEN NOT ${LAB_KABUL_VAR} THEN 'Kabul Bekliyor'
    ELSE 'Analiz Aşamasında'
  END
`;

const RAPOR_HARIC_WHERE = `
  (v.Rapor IS NULL OR v.Rapor <> 'Raporlandı')
  AND NOT ${FORMAT_YAYINDA}
`;

const SELECT_BASE = `
  SELECT
    v.ID, v.nID, v.\`Evrak No\`, v.\`Rapor No\`,
    (SELECT o2.DisRaporKodu FROM NKR_RaporOnay o2
       WHERE o2.NkrID = v.nID
         AND o2.DisRaporKodu IS NOT NULL AND TRIM(o2.DisRaporKodu) <> ''
       ORDER BY o2.ID DESC LIMIT 1) AS RaporKodu,
    v.Firma, v.Proje, v.Numune,
    v.Hizmet, v.Method, v.Kabul, v.Termin,
    ${DURUM_EXPR} AS Durum,
    v.Rapor, v.Yetkili
  FROM VIEW_TERMINTAKIP v
  LEFT JOIN NumuneX1 x ON x.ID = v.ID
  LEFT JOIN StokAnalizListesi sa ON sa.ID = x.AnalizID
`;

export async function listTermin(user: SessionUser): Promise<TerminListItem[]> {
  if (isAdmin(user)) {
    return query<TerminListItem>(
      `${SELECT_BASE}
       WHERE ${RAPOR_HARIC_WHERE}
       ORDER BY v.Termin DESC, v.nID DESC
       LIMIT 500`
    );
  }

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
     ORDER BY v.Termin DESC, v.nID DESC
     LIMIT 500`,
    { firma: user.firmaAdi }
  );
}
