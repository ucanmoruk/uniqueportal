import { query } from "@/lib/db";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
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

export async function listTermin(user: SessionUser): Promise<TerminListItem[]> {
  // VIEW_TERMINTAKIP'te Müşteri kolonu yok, Firma var (firma adı).
  if (isAdmin(user)) {
    return query<TerminListItem>(
      `SELECT TOP 500 ID, nID, [Evrak No], [Rapor No], Firma, Proje, Numune,
             Hizmet, Method, Kabul, Termin, Durum, Rapor, Yetkili
       FROM VIEW_TERMINTAKIP
       ORDER BY Termin DESC, nID DESC`
    );
  }
  // Plasiyer için PlasiyerID kolonu bu view'da yok; firma adı kullan.
  const scope = scopeByFirma(user, "musteri-proje");
  const altClause = scope.clause
    .replaceAll("[Müşteri]", "Firma")
    .replaceAll('"Müşteri"', "Firma");
  return query<TerminListItem>(
    `SELECT TOP 500 ID, nID, [Evrak No], [Rapor No], Firma, Proje, Numune,
           Hizmet, Method, Kabul, Termin, Durum, Rapor, Yetkili
     FROM VIEW_TERMINTAKIP
     WHERE ${altClause}
     ORDER BY Termin DESC, nID DESC`,
    scope.params
  );
}
