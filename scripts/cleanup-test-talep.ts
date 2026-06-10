/**
 * Test verisi temizliği:
 *  - 18162 ID'li test talebi ve buna bağlı TalepDurumLog kayıtlarını sil.
 *  - Yetim TalepDurumLog kayıtlarını (Talep tablosunda artık olmayan) sil.
 *  - Tüm cleanup'tan sonra ROOT KOZMETİK için kalan bildirim sayısını göster.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] Test talep 18162'nin mevcut durumu:");
  const t = await query(
    `SELECT ID, TalepNo, DisTalepKodu, FirmaKodu, Tur, Durum
     FROM Talep WHERE ID = 18162`
  );
  console.dir(t, { depth: null });

  const logs = await query(
    `SELECT ID, TalepID, EskiDurum, YeniDurum, Tarih
     FROM dbo.TalepDurumLog WHERE TalepID = 18162 ORDER BY ID`
  );
  console.log("\n[2] Bu talebe ait TalepDurumLog kayıtları:", logs.length);
  console.dir(logs, { depth: null });

  // Sil: önce log, sonra alt tablolar (TalepRaporlama, TalepFatura, TalepNumune), sonra Talep
  console.log("\n[3] Temizlik...");
  await query(`DELETE FROM dbo.TalepDurumLog WHERE TalepID = 18162`);
  await query(`DELETE FROM TalepRaporlama WHERE TalepID = 18162`);
  await query(`DELETE FROM TalepFatura WHERE TalepID = 18162`);
  await query(`DELETE FROM TalepNumune WHERE TalepID = 18162`);
  await query(`DELETE FROM Talep WHERE ID = 18162`);
  console.log("    OK\n");

  // Yetim log kayıtları (sürpriz olabilir, kontrol edelim)
  const yetim = await query(
    `SELECT COUNT(*) AS n
     FROM dbo.TalepDurumLog l
     WHERE NOT EXISTS (SELECT 1 FROM Talep t WHERE t.ID = l.TalepID)`
  );
  console.log("[4] Yetim TalepDurumLog kayıt sayısı:", yetim);

  // ROOT KOZMETİK için son 90 günde kaç talep durum log'u var?
  const root = await query(
    `SELECT TOP 10 l.ID, l.TalepID, l.EskiDurum, l.YeniDurum, l.Tarih,
            t.FirmaKodu, t.Durum AS TalepDurum, t.DisTalepKodu
     FROM dbo.TalepDurumLog l
     INNER JOIN Talep t ON t.ID = l.TalepID
     WHERE t.FirmaKodu = 'UQ35701'
     ORDER BY l.Tarih DESC`
  );
  console.log("\n[5] ROOT KOZMETİK için kalan durum log kayıtları:", root.length);
  console.dir(root, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
