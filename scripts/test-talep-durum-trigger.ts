import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  // ID=18162 daha önce Pasif yapılmıştı; testin görünür olması için tekrar
  // Aktif yapıp durum değişikliği uyguluyoruz.
  await query(`UPDATE Talep SET Durum = 'Yeni Talep' WHERE ID = 18162`);
  await query(`UPDATE Talep SET Durum = 'İşleme Alındı' WHERE ID = 18162`);
  await query(`UPDATE Talep SET Durum = 'Tamamlandı' WHERE ID = 18162`);

  const log = await query(
    `SELECT TOP 10 * FROM dbo.TalepDurumLog WHERE TalepID = 18162 ORDER BY ID DESC`
  );
  console.log("Trigger log kayıtları (en yeniden eskiye):");
  console.dir(log, { depth: null });

  // Test sonrası Pasif yap, listeyi kirletmesin
  await query(`UPDATE Talep SET Durum = 'Pasif' WHERE ID = 18162`);
  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
