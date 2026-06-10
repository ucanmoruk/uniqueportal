import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] HizmetDurum dağılımı (NumuneX1 üzerinde):");
  const hd = await query(
    `SELECT TOP 20 HizmetDurum, COUNT(*) AS n FROM dbo.NumuneX1
     GROUP BY HizmetDurum ORDER BY n DESC`
  );
  console.dir(hd, { depth: null });

  console.log("\n[2] NumuneX1.SonucKayitTarihi dolu olan satır sayısı:");
  const sk = await query(
    `SELECT
       SUM(CASE WHEN SonucKayitTarihi IS NULL THEN 1 ELSE 0 END) AS bos,
       SUM(CASE WHEN SonucKayitTarihi IS NOT NULL THEN 1 ELSE 0 END) AS dolu
     FROM dbo.NumuneX1`
  );
  console.dir(sk, { depth: null });

  console.log("\n[3] NKR_LabKabul kayıt sayısı vs NKR sayısı:");
  const lk = await query(
    `SELECT (SELECT COUNT(*) FROM dbo.NKR WHERE Durum = N'Aktif') AS nkr_aktif,
            (SELECT COUNT(*) FROM cosmoroot.NKR_LabKabul) AS labkabul_toplam,
            (SELECT COUNT(DISTINCT NkrID) FROM cosmoroot.NKR_LabKabul) AS labkabul_nkr`
  );
  console.dir(lk, { depth: null });

  console.log("\n[4] ROOT KOZMETİK için son 10 termin satırının ham hizmet + lab kabul varlığı:");
  const sample = await query(
    `SELECT TOP 10
       x.ID, x.HizmetDurum, x.SonucKayitTarihi, x.Sonuc,
       sa.BolumID, sa.RaporFormati AS AnalizFormat,
       (
         SELECT COUNT(*) FROM cosmoroot.NKR_LabKabul k
         WHERE k.NkrID = x.RaporID
       ) AS lab_kabul_toplam,
       (
         SELECT COUNT(*) FROM cosmoroot.NKR_LabKabul k
         WHERE k.NkrID = x.RaporID
           AND k.BolumID = sa.BolumID
           AND (k.RaporFormati = sa.RaporFormati OR k.RaporFormati IS NULL OR sa.RaporFormati IS NULL)
       ) AS lab_kabul_eslesen,
       n.Firma_ID, n.Rapor_Durumu
     FROM dbo.NumuneX1 x
     INNER JOIN dbo.NKR n ON n.ID = x.RaporID
     LEFT JOIN dbo.StokAnalizListesi sa ON sa.ID = x.AnalizID
     WHERE n.Firma_ID = 35701 AND n.Durum = N'Aktif'
       AND (n.Rapor_Durumu IS NULL OR n.Rapor_Durumu <> N'Raporlandı')
     ORDER BY x.ID DESC`
  );
  console.dir(sample, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
