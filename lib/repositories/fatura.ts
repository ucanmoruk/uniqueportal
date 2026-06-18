import { query, queryOne } from "@/lib/db-mysql";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface FaturaListItem {
  ID: number;
  "Fatura No": string;
  Tarih: Date | null;
  "Müşteri": string | null;
  Proje: string | null;
  Tutar: number;
  KDV: number;
  Toplam: number;
  Durum: string | null;
}

const FATURA_CTE = `
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY \`Fatura No\`
    ORDER BY CASE \`Ödeme\`
      WHEN 'Ödendi' THEN 1
      WHEN 'Kısmen Ödendi' THEN 2
      WHEN 'Ödeme Bekliyor' THEN 3
      WHEN 'Proforma Onaylandı' THEN 4
      WHEN 'Proforma Reddedildi' THEN 5
      WHEN 'İptal' THEN 6
      ELSE 7
    END
  ) AS rn
  FROM VIEW_FATURA
  WHERE \`Ödeme\` IS NOT NULL AND \`Ödeme\` <> 'Fatura Kesilmedi'
)`;

const FATURA_COLS = `ID, \`Fatura No\`, Tarih, \`Müşteri\`, Proje, Tutar, KDV, Toplam, \`Ödeme\` AS Durum`;

export async function listFaturalar(
  user: SessionUser
): Promise<FaturaListItem[]> {
  if (isAdmin(user)) {
    return query<FaturaListItem>(
      `${FATURA_CTE}
       SELECT ${FATURA_COLS} FROM ranked WHERE rn = 1
       ORDER BY Tarih DESC, ID DESC`
    );
  }
  if (user.tur === "Plasiyer") {
    return query<FaturaListItem>(
      `${FATURA_CTE}
       SELECT ${FATURA_COLS} FROM ranked WHERE rn = 1 AND PlasiyerID = @pid
       ORDER BY Tarih DESC, ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  }
  const scope = scopeByFirma(user, "musteri-proje");
  return query<FaturaListItem>(
    `${FATURA_CTE}
     SELECT ${FATURA_COLS} FROM ranked WHERE rn = 1 AND ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export async function getFaturaOzet(user: SessionUser) {
  if (isAdmin(user)) {
    return queryOne<{ toplam: number; odenen: number; sayi: number }>(
      `SELECT IFNULL(SUM(Toplam),0) AS toplam,
              IFNULL(SUM(Odenen_Tutar),0) AS odenen,
              COUNT(*) AS sayi FROM Fatura`
    );
  }
  return queryOne<{ toplam: number; odenen: number; sayi: number }>(
    `SELECT IFNULL(SUM(Toplam),0) AS toplam,
            IFNULL(SUM(Odenen_Tutar),0) AS odenen,
            COUNT(*) AS sayi
     FROM Fatura WHERE FaturaFirmaID = @id`,
    { id: user.id }
  );
}
