"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db-mysql";
import { isAdmin } from "@/lib/permissions";

export type IptalResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Müşteri kendi analiz talebini iptal eder → soft-delete: `Durum = 'Pasif'`.
 * VIEW_TALEP_LISTE `Durum <> 'Pasif'` koşulu ile süzdüğünden iptal edilen
 * talep listeden otomatik kaybolur.
 *
 * Güvenlik:
 *  - requireUser ile oturum
 *  - Sahiplik: `FirmaKodu = @user.kod` (admin değilse)
 *  - Yalnızca "Yeni Talep" durumundaki talepler iptal edilebilir
 *    (iç portalda işleme alınmışsa müşteri tek başına iptal edemesin)
 */
export async function iptalTalepAction(
  talepId: number
): Promise<IptalResult> {
  const user = await requireUser();

  const row = await queryOne<{
    ID: number;
    FirmaKodu: string | null;
    Durum: string | null;
  }>(
    `SELECT ID, FirmaKodu, Durum FROM Talep WHERE ID = @id LIMIT 1`,
    { id: talepId }
  );
  if (!row) return { ok: false, error: "Talep bulunamadı." };

  if (!isAdmin(user) && row.FirmaKodu !== user.kod) {
    return { ok: false, error: "Bu talebi iptal etme yetkiniz yok." };
  }

  if (row.Durum !== "Yeni Talep") {
    return {
      ok: false,
      error: `Bu talep iptal edilemez (durum: ${row.Durum ?? "—"}). İşleme alınmış talepleri iptal etmek için destek talebi açın.`,
    };
  }

  await query(`UPDATE Talep SET Durum = 'Pasif' WHERE ID = @id`, {
    id: talepId,
  });

  revalidatePath("/talepler");
  revalidatePath(`/talepler/${talepId}`);
  revalidatePath("/ozet");

  return { ok: true };
}
