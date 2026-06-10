import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] ROOT'un termin satırları için: HizmetDurum + LabKabul varlık çıkarımı");
  const r = await query(
    `SELECT TOP 20
       x.ID AS X1,
       x.HizmetDurum,
       sa.BolumID, sa.RaporFormati AS sFmt,
       (SELECT COUNT(*) FROM cosmoroot.NKR_LabKabul k WHERE k.NkrID = x.RaporID) AS NKR_LabKabul_TOPLAM,
       (SELECT COUNT(*) FROM cosmoroot.NKR_LabKabul k
         WHERE k.NkrID = x.RaporID
           AND (sa.BolumID IS NULL OR k.BolumID = sa.BolumID)
           AND (k.RaporFormati = sa.RaporFormati OR k.RaporFormati IS NULL OR sa.RaporFormati IS NULL)) AS NKR_LabKabul_ESLESEN
     FROM dbo.NumuneX1 x
     INNER JOIN dbo.NKR n ON n.ID = x.RaporID
     LEFT JOIN dbo.StokAnalizListesi sa ON sa.ID = x.AnalizID
     WHERE n.Firma_ID = 35701 AND n.Durum = N'Aktif'
       AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> N'Raporlandı')
     ORDER BY x.ID DESC`
  );
  console.dir(r, { depth: null });

  console.log("\n[2] Genel istatistik — ROOT için 'NkrID lab kabul varlığı' dağılımı:");
  const stat = await query(
    `WITH src AS (
       SELECT x.ID,
         CASE WHEN EXISTS (SELECT 1 FROM cosmoroot.NKR_LabKabul k WHERE k.NkrID = x.RaporID) THEN 1 ELSE 0 END AS has_lab
       FROM dbo.NumuneX1 x
       INNER JOIN dbo.NKR n ON n.ID = x.RaporID
       WHERE n.Firma_ID = 35701 AND n.Durum = N'Aktif'
         AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> N'Raporlandı')
     )
     SELECT
       SUM(has_lab) AS lab_kabul_var,
       SUM(1 - has_lab) AS lab_kabul_yok,
       COUNT(*) AS toplam
     FROM src`
  );
  console.dir(stat, { depth: null });

  console.log("\n[3] HizmetDurum farklı değer dağılımı (ROOT için):");
  const hd = await query(
    `SELECT x.HizmetDurum, COUNT(*) AS n
     FROM dbo.NumuneX1 x
     INNER JOIN dbo.NKR n ON n.ID = x.RaporID
     WHERE n.Firma_ID = 35701 AND n.Durum = N'Aktif'
       AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> N'Raporlandı')
     GROUP BY x.HizmetDurum ORDER BY n DESC`
  );
  console.dir(hd, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
