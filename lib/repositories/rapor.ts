import { query, queryOne } from "@/lib/db";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface RaporListItem {
  ID: number;
  Tarih: Date | null;
  "Dosya No": number;
  TalepNo: number | null;
  "Müşteri": string | null;
  Proje: string | null;
  "Dosya Türü": string | null;
  "Dosya Adı": string | null;
  RaporID: string | null;
  Yol: string | null;
}

export async function listRaporlar(
  user: SessionUser
): Promise<RaporListItem[]> {
  if (isAdmin(user)) {
    return query<RaporListItem>(
      `SELECT ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
              [Dosya Türü], [Dosya Adı], RaporID, Yol
       FROM VIEW_RAPOR WHERE Durum = 'Aktif'
       ORDER BY Tarih DESC, ID DESC`
    );
  }
  if (user.tur === "Plasiyer") {
    return query<RaporListItem>(
      `SELECT ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
              [Dosya Türü], [Dosya Adı], RaporID, Yol
       FROM VIEW_RAPOR
       WHERE Durum = 'Aktif' AND PlasiyerID = @pid
       ORDER BY Tarih DESC, ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  }
  const scope = scopeByFirma(user, "musteri-proje");
  return query<RaporListItem>(
    `SELECT ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
            [Dosya Türü], [Dosya Adı], RaporID, Yol
     FROM VIEW_RAPOR
     WHERE Durum = 'Aktif' AND ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export async function findRaporForUser(user: SessionUser, raporId: number) {
  const r = await queryOne<RaporListItem>(
    `SELECT TOP 1 ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
            [Dosya Türü], [Dosya Adı], RaporID, Yol
     FROM VIEW_RAPOR WHERE ID = @id AND Durum = 'Aktif'`,
    { id: raporId }
  );
  if (!r) return null;
  if (isAdmin(user)) return r;
  if (user.tur === "Müşteri" && r["Müşteri"] === user.firmaAdi) return r;
  if (
    user.tur === "Proje" &&
    (r.Proje === user.firmaAdi || r["Müşteri"] === user.firmaAdi)
  )
    return r;
  return null;
}
