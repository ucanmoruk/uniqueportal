import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] NumuneX1 (Durum + HizmetDurum + ek alanlar):");
  const rows = await query(
    `SELECT ID, AnalizID, Durum, HizmetDurum, Sonuc, SonucKayitTarihi, Termin, x3ID
     FROM dbo.NumuneX1 WHERE RaporID = 39404 ORDER BY ID`
  );
  console.dir(rows, { depth: null });

  console.log("\n[2] Numune* tabloları:");
  const tabs = await query(
    `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_NAME LIKE 'Numune%' ORDER BY TABLE_NAME`
  );
  console.dir(tabs, { depth: null });

  console.log("\n[3] NumuneDetay 39404:");
  try {
    const d = await query(
      `SELECT TOP 5 * FROM dbo.NumuneDetay WHERE RaporID = 39404`
    );
    console.dir(d, { depth: null });
  } catch (e) {
    console.log("  err:", (e as Error).message);
  }

  console.log("\n[4] NKR_LabKabul tüm satırları (39404):");
  const k = await query(
    `SELECT * FROM cosmoroot.NKR_LabKabul WHERE NkrID = 39404`
  );
  console.dir(k, { depth: null });

  console.log("\n[5] NumuneX3 var mı, 39404:");
  try {
    const tabs2 = await query(
      `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='NumuneX3'`
    );
    console.dir(tabs2, { depth: null });
    const x3 = await query(
      `SELECT TOP 10 * FROM dbo.NumuneX3 WHERE RaporID = 39404`
    );
    console.dir(x3, { depth: null });
  } catch (e) {
    console.log("  NumuneX3 yok ya da err:", (e as Error).message);
  }

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
