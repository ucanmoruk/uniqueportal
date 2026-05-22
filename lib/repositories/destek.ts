import { query } from "@/lib/db";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface DestekListItem {
  ID: number;
  TALEP_ID: number;
  "Talep No": string;
  Tarih: Date | null;
  "Talep Oluşturan": string | null;
  Konu: string | null;
  Durum: string | null;
  FirmaKodu: string | null;
}

export async function listDestek(user: SessionUser): Promise<DestekListItem[]> {
  if (isAdmin(user)) {
    return query<DestekListItem>(
      `SELECT ID, TALEP_ID, [Talep No], Tarih, [Talep Oluşturan], Konu, Durum, FirmaKodu
       FROM VIEW_DESTEK_TALEBI ORDER BY Tarih DESC, TALEP_ID DESC`
    );
  }
  const scope = scopeByFirma(user, "firmakodu");
  return query<DestekListItem>(
    `SELECT ID, TALEP_ID, [Talep No], Tarih, [Talep Oluşturan], Konu, Durum, FirmaKodu
     FROM VIEW_DESTEK_TALEBI WHERE ${scope.clause}
     ORDER BY Tarih DESC, TALEP_ID DESC`,
    scope.params
  );
}
