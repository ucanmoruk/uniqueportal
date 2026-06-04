/**
 * Tek seferlik düzeltme: portaldan oluşturulup yanlışlıkla Tur='Web'
 * olarak işaretlenen yeni talepleri Tur='Analiz' yapar.
 * VIEW_TALEP_LISTE yalnızca Tur='Analiz' kayıtlarını gösterdiği için bu
 * talepler listede kayıp görünüyordu.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  // Önce etkilenen kayıtları göster
  const adaylar = await query(
    `SELECT ID, TalepNo, Tarih, FirmaKodu, Durum, Tur
     FROM Talep
     WHERE Tur = 'Web'
     ORDER BY ID DESC`
  );
  console.log("Düzeltilecek talepler (Tur='Web'):", adaylar.length);
  console.dir(adaylar, { depth: null });

  if (adaylar.length === 0) {
    console.log("Düzeltilecek kayıt yok.");
    process.exit(0);
  }

  // Güncelle
  const upd = await query(
    `UPDATE Talep SET Tur = 'Analiz' WHERE Tur = 'Web'`
  );
  console.log("Güncelleme tamam:", upd);

  // Görünür mü doğrula
  const ids = adaylar.map((a) => (a as { ID: number }).ID);
  if (ids.length > 0) {
    const placeholders = ids.map((_, i) => `@id${i}`).join(",");
    const params: Record<string, number> = {};
    ids.forEach((id, i) => (params[`id${i}`] = id));
    const goruluyor = await query(
      `SELECT ID, [Talep No], FirmaKodu, Durum
       FROM VIEW_TALEP_LISTE WHERE ID IN (${placeholders})`,
      params
    );
    console.log("\nArtık VIEW'de görünen:", goruluyor.length, "/", ids.length);
    console.dir(goruluyor, { depth: null });
  }

  process.exit(0);
}

main().catch((e) => { console.error("HATA:", e); process.exit(1); });
