import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] StokAnalizListesi kolonları (BolumID var mı?):");
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME='StokAnalizListesi' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols, { depth: null });

  console.log("\n[2] 26060126 raporunun analizleri + BolumID + lab kabul satırları:");
  const rows = await query(
    `SELECT
       x.ID AS NumX1ID, x.AnalizID, x.HizmetDurum, x.SonucKayitTarihi,
       l.Ad AS HizmetAd, l.BolumID AS AnalizBolumID,
       k.ID AS LabKabulID, k.BolumID AS LabBolumID, k.KabulTarihi, k.RaporFormati
     FROM dbo.NumuneX1 x
     LEFT JOIN dbo.StokAnalizListesi l ON l.ID = x.AnalizID
     LEFT JOIN cosmoroot.NKR_LabKabul k ON k.NkrID = x.RaporID AND k.BolumID = l.BolumID
     WHERE x.RaporID = 39404
     ORDER BY x.ID`
  );
  console.dir(rows, { depth: null });

  console.log("\n[3] BolumID 1008 nedir (StokBolumListesi varsa):");
  const bolumTabs = await query(
    `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_NAME LIKE '%Bolum%' ORDER BY TABLE_NAME`
  );
  console.dir(bolumTabs, { depth: null });

  // Olası bir bolum tablosundan id=1008 detayını al
  for (const b of bolumTabs as { TABLE_SCHEMA: string; TABLE_NAME: string }[]) {
    try {
      const r = await query(
        `SELECT TOP 1 * FROM ${b.TABLE_SCHEMA}.${b.TABLE_NAME} WHERE ID = 1008`
      );
      if ((r as unknown[]).length > 0) {
        console.log(`  ${b.TABLE_NAME}:`);
        console.dir(r, { depth: null });
      }
    } catch {}
  }

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
