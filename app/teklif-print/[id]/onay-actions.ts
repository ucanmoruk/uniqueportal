"use server";

/**
 * Teklif onay/red yazımı — sözleşme §11.b.
 *
 * Müşteri portalında token yok; güvenlik:
 *   1) Firma oturumu (requireUser)
 *   2) UPDATE'in WHERE'inde `MusteriID = @firmaId AND TeklifDurum = N'Onay Bekleniyor'`
 *      → başkasının teklifini onaylayamaz, zaten karar verilmiş teklif tekrar
 *        karara bağlanamaz (tek-kullanım).
 * Aksiyon log'u `TeklifOnayLog`'a yazılır; iç portalın "Geçmiş" sekmesi otomatik
 * günceller (aynı DB, aktarım yok).
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPool, sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { userMessage } from "@/lib/errors";

interface ResultOk {
  ok: true;
  aksiyon: "Onaylandı" | "Reddedildi";
  firmaAd: string;
  yetkili: string | null;
  tarih: string;
}
interface ResultErr {
  ok: false;
  error: string;
}
export type OnayResult = ResultOk | ResultErr;

/**
 * Teklif numarası etiketi: `DisTeklifKodu/RevNo` (fallback `UQ<TeklifNo>/RevNo`).
 */
function teklifEtiket(
  disKod: string | null,
  teklifNo: number | null,
  revNo: number
) {
  const head = disKod ?? (teklifNo != null ? `UQ${teklifNo}` : "—");
  return `${head}/${String(revNo).padStart(2, "0")}`;
}

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      ""
    );
  } catch {
    return "";
  }
}

async function loadTeklifGuard(teklifId: number) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.Int, teklifId)
    .query<{
      ID: number;
      MusteriID: number | null;
      TeklifDurum: string | null;
      DisTeklifKodu: string | null;
      TeklifNo: number | null;
      RevNo: number;
    }>(
      `SELECT TOP 1 ID, MusteriID, TeklifDurum, DisTeklifKodu, TeklifNo, RevNo
       FROM cosmoroot.TeklifBaslik
       WHERE ID = @id AND Durum = 'Aktif'`
    );
  return r.recordset[0] ?? null;
}

async function karariYaz(
  teklifId: number,
  karar: "Onaylandı" | "Reddedildi",
  aciklama: string
): Promise<OnayResult> {
  const user = await requireUser();

  const baslik = await loadTeklifGuard(teklifId);
  if (!baslik) return { ok: false, error: "Teklif bulunamadı." };

  // Sahiplik: admin bu eylemi yapmaz (müşteri kararı), müşteri sadece kendisininkini karara bağlar.
  if (!isAdmin(user) && baslik.MusteriID !== user.id) {
    return { ok: false, error: "Bu teklifi karara bağlama yetkiniz yok." };
  }

  // Sözleşme §11: yalnızca "Onay Bekleniyor" karara bağlanır
  if (baslik.TeklifDurum !== "Onay Bekleniyor") {
    return {
      ok: false,
      error: `Bu teklif şu an karara bağlanamaz (durum: ${baslik.TeklifDurum ?? "—"}).`,
    };
  }

  const ip = await getClientIp();
  const firmaAd = user.firmaAdi ?? "";
  const yetkili = user.yetkili ?? null;
  const mail = ""; // session'da yok; eklenebilirse buraya

  const etiket = teklifEtiket(baslik.DisTeklifKodu, baslik.TeklifNo, baslik.RevNo);

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1) Durum — tek-kullanım guard'lı
    const upd = await new sql.Request(tx)
      .input("id", sql.Int, teklifId)
      .input("fid", sql.Int, user.id)
      .input("karar", sql.NVarChar(20), karar)
      .query(
        `UPDATE cosmoroot.TeklifBaslik
         SET TeklifDurum = @karar
         WHERE ID = @id
           AND MusteriID = @fid
           AND TeklifDurum = N'Onay Bekleniyor'`
      );
    if ((upd.rowsAffected[0] ?? 0) === 0) {
      await tx.rollback();
      return {
        ok: false,
        error:
          "Teklif karara bağlanamadı — yetki yok ya da durum değişmiş olabilir.",
      };
    }

    // 2) Log
    await new sql.Request(tx)
      .input("tid", sql.Int, teklifId)
      .input("etiket", sql.NVarChar(50), etiket)
      .input("aksiyon", sql.NVarChar(20), karar)
      .input("aciklama", sql.NVarChar(sql.MAX), aciklama ?? "")
      .input("ip", sql.NVarChar(100), ip)
      .input("musteriAd", sql.NVarChar(255), firmaAd)
      .input("mail", sql.NVarChar(255), mail)
      .input("yetkili", sql.NVarChar(255), yetkili ?? "")
      .query(
        `INSERT INTO dbo.TeklifOnayLog
         (TeklifID, TeklifNo, Aksiyon, Aciklama, IpAdresi, MusteriAd, MusteriEmail, MusteriYetkili, Tarih)
         VALUES (@tid, @etiket, @aksiyon, @aciklama, @ip, @musteriAd, @mail, @yetkili, GETDATE())`
      );

    await tx.commit();
  } catch (err) {
    try {
      await tx.rollback();
    } catch {}
    return {
      ok: false,
      error: userMessage(err, "İşlem tamamlanamadı. Lütfen tekrar deneyin."),
    };
  }

  // Cache invalidation
  revalidatePath(`/teklifler/${teklifId}`);
  revalidatePath(`/teklif-print/${teklifId}`);
  revalidatePath("/teklifler");
  revalidatePath("/ozet");

  return {
    ok: true,
    aksiyon: karar,
    firmaAd,
    yetkili,
    tarih: new Date().toLocaleDateString("tr-TR"),
  };
}

export async function teklifOnaylaAction(teklifId: number): Promise<OnayResult> {
  return karariYaz(teklifId, "Onaylandı", "");
}

export async function teklifReddetAction(
  teklifId: number,
  aciklama: string
): Promise<OnayResult> {
  const a = (aciklama ?? "").trim();
  if (!a) return { ok: false, error: "Red / revizyon açıklaması zorunludur." };
  return karariYaz(teklifId, "Reddedildi", a);
}
