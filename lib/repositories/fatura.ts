import { query, queryOne } from "@/lib/db";
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
  "Ödeme": string | null;
  Durum: string | null;
}

export async function listFaturalar(
  user: SessionUser
): Promise<FaturaListItem[]> {
  if (isAdmin(user)) {
    return query<FaturaListItem>(
      `SELECT ID, [Fatura No], Tarih, [Müşteri], Proje, Tutar, KDV, Toplam, [Ödeme], Durum
       FROM VIEW_FATURA ORDER BY Tarih DESC, ID DESC`
    );
  }
  if (user.tur === "Plasiyer") {
    return query<FaturaListItem>(
      `SELECT ID, [Fatura No], Tarih, [Müşteri], Proje, Tutar, KDV, Toplam, [Ödeme], Durum
       FROM VIEW_FATURA WHERE PlasiyerID = @pid
       ORDER BY Tarih DESC, ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  }
  const scope = scopeByFirma(user, "musteri-proje");
  return query<FaturaListItem>(
    `SELECT ID, [Fatura No], Tarih, [Müşteri], Proje, Tutar, KDV, Toplam, [Ödeme], Durum
     FROM VIEW_FATURA WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export async function getFaturaOzet(user: SessionUser) {
  if (isAdmin(user)) {
    return queryOne<{ toplam: number; odenen: number; sayi: number }>(
      `SELECT ISNULL(SUM(Toplam),0) AS toplam,
              ISNULL(SUM(Odenen_Tutar),0) AS odenen,
              COUNT(*) AS sayi FROM Fatura`
    );
  }
  return queryOne<{ toplam: number; odenen: number; sayi: number }>(
    `SELECT ISNULL(SUM(Toplam),0) AS toplam,
            ISNULL(SUM(Odenen_Tutar),0) AS odenen,
            COUNT(*) AS sayi
     FROM Fatura WHERE FaturaFirmaID = @id`,
    { id: user.id }
  );
}
