"use server";

/**
 * Teklif onay/red yazımı — sözleşme §11.b.
 *
 * Müşteri portalında token yok; güvenlik:
 *   1) Firma oturumu (requireUser)
 *   2) UPDATE'in WHERE'inde `MusteriID = @firmaId AND TeklifDurum = 'Onay Bekleniyor'`
 *      → başkasının teklifini onaylayamaz, zaten karar verilmiş teklif tekrar
 *        karara bağlanamaz (tek-kullanım).
 * Aksiyon log'u `TeklifOnayLog`'a yazılır; iç portalın "Geçmiş" sekmesi otomatik
 * günceller (aynı DB, aktarım yok).
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  queryOne,
  withTransaction,
  queryOneConn,
  executeConn,
} from "@/lib/db-mysql";
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
  return queryOne<{
    ID: number;
    MusteriID: number | null;
    TeklifDurum: string | null;
    DisTeklifKodu: string | null;
    TeklifNo: number | null;
    RevNo: number;
  }>(
    `SELECT ID, MusteriID, TeklifDurum, DisTeklifKodu, TeklifNo, RevNo
     FROM TeklifBaslik
     WHERE ID = @id AND Durum = 'Aktif'
     LIMIT 1`,
    { id: teklifId }
  );
}

async function karariYaz(
  teklifId: number,
  karar: "Onaylandı" | "Reddedildi",
  aciklama: string
): Promise<OnayResult> {
  const user = await requireUser();

  const baslik = await loadTeklifGuard(teklifId);
  if (!baslik) return { ok: false, error: "Teklif bulunamadı." };

  if (!isAdmin(user) && baslik.MusteriID !== user.id) {
    return { ok: false, error: "Bu teklifi karara bağlama yetkiniz yok." };
  }

  if (baslik.TeklifDurum !== "Onay Bekleniyor") {
    return {
      ok: false,
      error: `Bu teklif şu an karara bağlanamaz (durum: ${baslik.TeklifDurum ?? "—"}).`,
    };
  }

  const ip = await getClientIp();
  const firmaAd = user.firmaAdi ?? "";
  const yetkili = user.yetkili ?? null;
  const mail = "";

  const etiket = teklifEtiket(baslik.DisTeklifKodu, baslik.TeklifNo, baslik.RevNo);

  try {
    await withTransaction(async (conn) => {
      const result = await queryOneConn<{ cnt: number }>(
        conn,
        `SELECT COUNT(*) AS cnt FROM TeklifBaslik
         WHERE ID = @id AND MusteriID = @fid AND TeklifDurum = 'Onay Bekleniyor'`,
        { id: teklifId, fid: user.id }
      );
      if ((result?.cnt ?? 0) === 0) {
        throw new Error("GUARD_FAIL");
      }

      await executeConn(
        conn,
        `UPDATE TeklifBaslik SET TeklifDurum = @karar
         WHERE ID = @id AND MusteriID = @fid AND TeklifDurum = 'Onay Bekleniyor'`,
        { id: teklifId, fid: user.id, karar }
      );

      await executeConn(
        conn,
        `INSERT INTO TeklifOnayLog
         (TeklifID, TeklifNo, Aksiyon, Aciklama, IpAdresi, MusteriAd, MusteriEmail, MusteriYetkili, Tarih)
         VALUES (@tid, @etiket, @aksiyon, @aciklama, @ip, @musteriAd, @mail, @yetkili, NOW())`,
        {
          tid: teklifId,
          etiket,
          aksiyon: karar,
          aciklama: aciklama ?? "",
          ip,
          musteriAd: firmaAd,
          mail,
          yetkili: yetkili ?? "",
        }
      );
    });
  } catch (err) {
    if ((err as Error).message === "GUARD_FAIL") {
      return {
        ok: false,
        error:
          "Teklif karara bağlanamadı — yetki yok ya da durum değişmiş olabilir.",
      };
    }
    return {
      ok: false,
      error: userMessage(err, "İşlem tamamlanamadı. Lütfen tekrar deneyin."),
    };
  }

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
