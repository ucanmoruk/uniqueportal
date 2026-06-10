import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] 39404 NumuneX1 + StokAnalizListesi (BolumID, RaporFormati):");
  const rows = await query(
    `SELECT
       x.ID AS NumX1ID, x.AnalizID, x.HizmetDurum,
       l.Ad AS HizmetAd, l.BolumID, l.RaporFormati AS AnalizRaporFormati
     FROM dbo.NumuneX1 x
     LEFT JOIN dbo.StokAnalizListesi l ON l.ID = x.AnalizID
     WHERE x.RaporID = 39404
     ORDER BY x.ID`
  );
  console.dir(rows, { depth: null });

  console.log("\n[2] 39404 NKR_LabKabul (BolumID + RaporFormati):");
  const k = await query(
    `SELECT ID, NkrID, BolumID, RaporFormati, KabulTarihi
     FROM cosmoroot.NKR_LabKabul WHERE NkrID = 39404`
  );
  console.dir(k, { depth: null });

  console.log("\n[3] Manuel eşleştirme — bölüm+format bazlı kabul varlığı:");
  const match = await query(
    `SELECT
       x.ID AS NumX1ID,
       l.Ad AS HizmetAd,
       l.BolumID, l.RaporFormati,
       CASE WHEN EXISTS (
         SELECT 1 FROM cosmoroot.NKR_LabKabul k
         WHERE k.NkrID = x.RaporID
           AND k.BolumID = l.BolumID
           AND (k.RaporFormati = l.RaporFormati OR k.RaporFormati IS NULL OR l.RaporFormati IS NULL)
       ) THEN 'Kabul Edildi' ELSE 'Kabul Bekliyor' END AS Kabul
     FROM dbo.NumuneX1 x
     LEFT JOIN dbo.StokAnalizListesi l ON l.ID = x.AnalizID
     WHERE x.RaporID = 39404
     ORDER BY x.ID`
  );
  console.dir(match, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
