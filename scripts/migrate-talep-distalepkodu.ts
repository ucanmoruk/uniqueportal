/**
 * Tek seferlik migration:
 *  1) `Talep` tablosuna `DisTalepKodu NVARCHAR(20) NULL` kolonunu ekle (yoksa).
 *  2) `VIEW_TALEP_LISTE` view'ini DisTalepKodu varsa onu, yoksa eski 'UQ' + TalepNo
 *     formatını gösterecek şekilde günceller.
 *
 * Geri uyumluluk:
 *  - Mevcut talepler DisTalepKodu = NULL → view eski 'UQXXX' formatını gösterir.
 *  - Yeni talepler DisTalepKodu = 'ÜGAM/26/XXXX' → view bunu gösterir.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] DisTalepKodu kolonu ekleniyor (varsa atlanır)...");
  await query(
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Talep'
         AND COLUMN_NAME = 'DisTalepKodu'
     )
     BEGIN
       ALTER TABLE dbo.Talep ADD DisTalepKodu NVARCHAR(20) NULL;
     END`
  );
  console.log("    OK\n");

  console.log("[2] VIEW_TALEP_LISTE güncelleniyor (CREATE OR ALTER)...");
  await query(
    `CREATE OR ALTER VIEW cosmoroot.VIEW_TALEP_LISTE
     AS
     SELECT
       COALESCE(t.DisTalepKodu, { fn CONCAT('UQ', CAST(t.TalepNo AS varchar)) }) AS [Talep No],
       t.ID, t.Tarih, t.Yetkili, t.FirmaKodu,
       f.ID AS FirmaID, f.Firma_Adi AS [Talep Oluşturan],
       k.Firma AS Müşteri, t.Durum
     FROM dbo.Talep AS t
       LEFT OUTER JOIN dbo.Firma AS f ON t.FirmaKodu = f.Kod
       LEFT OUTER JOIN dbo.TalepRaporlama AS k ON t.ID = k.TalepID
     WHERE (t.Durum <> 'Pasif') AND (t.Tur = 'Analiz')`
  );
  console.log("    OK\n");

  // Doğrulama
  const r = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM VIEW_TALEP_LISTE`
  );
  console.log("[3] VIEW_TALEP_LISTE kayıt sayısı:", r[0]?.n);

  const son = await query(
    `SELECT TOP 3 ID, [Talep No], FirmaKodu, Durum FROM VIEW_TALEP_LISTE ORDER BY Tarih DESC, ID DESC`
  );
  console.log("    Son 3:", son);

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
