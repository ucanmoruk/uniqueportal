/**
 * Migration: NumuneX1.HizmetDurum değişikliklerini izlemek için
 * `dbo.NumuneDurumLog` tablosu + AFTER UPDATE trigger.
 *
 * Müşteriye "Analiz aşamasında" bildirimi göndermek için durum geçiş zamanı
 * lazım; iç portalın HizmetDurum'u her güncellemesinde DB seviyesinde log
 * tutuyoruz (iç portal koduna dokunmadan).
 *
 * Yeniden çalıştırmaya güvenli.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] dbo.NumuneDurumLog tablosu (varsa atlanır)...");
  await query(
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='NumuneDurumLog'
     )
     BEGIN
       CREATE TABLE dbo.NumuneDurumLog (
         ID         INT IDENTITY(1,1) PRIMARY KEY,
         NumuneX1ID INT NOT NULL,   -- NumuneX1.ID
         NkrID      INT NULL,       -- NKR.ID (snapshot)
         EskiDurum  NVARCHAR(50) NULL,
         YeniDurum  NVARCHAR(50) NULL,
         Tarih      DATETIME NOT NULL CONSTRAINT DF_NumuneDurumLog_Tarih DEFAULT GETDATE()
       );
       CREATE INDEX IX_NumuneDurumLog_NkrID ON dbo.NumuneDurumLog(NkrID);
       CREATE INDEX IX_NumuneDurumLog_Tarih ON dbo.NumuneDurumLog(Tarih DESC);
     END`
  );
  console.log("    OK\n");

  console.log("[2] TR_NumuneDurumLog (AFTER UPDATE OF HizmetDurum on NumuneX1)...");
  await query(
    `IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'TR_NumuneDurumLog')
       DROP TRIGGER dbo.TR_NumuneDurumLog`
  );
  await query(
    `CREATE TRIGGER dbo.TR_NumuneDurumLog ON dbo.NumuneX1
     AFTER UPDATE
     AS
     BEGIN
       SET NOCOUNT ON;
       IF UPDATE(HizmetDurum)
       BEGIN
         INSERT INTO dbo.NumuneDurumLog (NumuneX1ID, NkrID, EskiDurum, YeniDurum, Tarih)
         SELECT i.ID, i.RaporID, d.HizmetDurum, i.HizmetDurum, GETDATE()
         FROM inserted i
         INNER JOIN deleted d ON d.ID = i.ID
         WHERE ISNULL(i.HizmetDurum, N'') <> ISNULL(d.HizmetDurum, N'');
       END
     END`
  );
  console.log("    OK\n");

  // Doğrulama
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='NumuneDurumLog'
     ORDER BY ORDINAL_POSITION`
  );
  console.log("[3] Kolonlar:");
  console.dir(cols, { depth: null });

  const trg = await query(
    `SELECT name, is_disabled FROM sys.triggers WHERE name = 'TR_NumuneDurumLog'`
  );
  console.log("\n[4] Trigger:", trg);

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
