/**
 * Migration: Talep durum değişikliklerini izlemek için `dbo.TalepDurumLog`
 * tablosu + `Talep` üzerinde AFTER UPDATE trigger.
 *
 * - İç portal kodunu hiç değiştirmiyoruz; trigger DB seviyesinde otomatik
 *   log tutar.
 * - Müşteri portalı `TalepDurumLog`'tan bildirimleri besler.
 *
 * Yeniden çalıştırmaya güvenli: tablo / trigger varsa atlanır.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] dbo.TalepDurumLog tablosu (varsa atlanır)...");
  await query(
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='TalepDurumLog'
     )
     BEGIN
       CREATE TABLE dbo.TalepDurumLog (
         ID        INT IDENTITY(1,1) PRIMARY KEY,
         TalepID   INT NOT NULL,
         EskiDurum NVARCHAR(50) NULL,
         YeniDurum NVARCHAR(50) NULL,
         Tarih     DATETIME NOT NULL CONSTRAINT DF_TalepDurumLog_Tarih DEFAULT GETDATE()
       );
       CREATE INDEX IX_TalepDurumLog_TalepID ON dbo.TalepDurumLog(TalepID);
       CREATE INDEX IX_TalepDurumLog_Tarih ON dbo.TalepDurumLog(Tarih DESC);
     END`
  );
  console.log("    OK\n");

  console.log("[2] TR_TalepDurumLog trigger (AFTER UPDATE on Talep)...");
  // Önce varsa düşür, sonra oluştur — definition güncellemesi için
  await query(
    `IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'TR_TalepDurumLog')
       DROP TRIGGER dbo.TR_TalepDurumLog`
  );
  await query(
    `CREATE TRIGGER dbo.TR_TalepDurumLog ON dbo.Talep
     AFTER UPDATE
     AS
     BEGIN
       SET NOCOUNT ON;
       IF UPDATE(Durum)
       BEGIN
         INSERT INTO dbo.TalepDurumLog (TalepID, EskiDurum, YeniDurum, Tarih)
         SELECT i.ID, d.Durum, i.Durum, GETDATE()
         FROM inserted i
         INNER JOIN deleted d ON d.ID = i.ID
         WHERE ISNULL(i.Durum, N'') <> ISNULL(d.Durum, N'');
       END
     END`
  );
  console.log("    OK\n");

  // Doğrulama
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='TalepDurumLog'
     ORDER BY ORDINAL_POSITION`
  );
  console.log("[3] TalepDurumLog kolonları:");
  console.dir(cols, { depth: null });

  const trg = await query(
    `SELECT name, is_disabled FROM sys.triggers WHERE name = 'TR_TalepDurumLog'`
  );
  console.log("\n[4] Trigger durumu:", trg);

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
