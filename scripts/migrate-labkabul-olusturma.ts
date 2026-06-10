/**
 * Migration: NKR_LabKabul satırlarının gerçek INSERT zamanını saklayan
 * OlusturmaTarihi kolonu. KabulTarihi iç portalda elle dolduruluyor ve
 * sıklıkla NULL kalıyor; bildirim tarihi için gerçek INSERT anı lazım.
 *
 * - Yeni satırlar: DEFAULT GETDATE() ile otomatik dolar.
 * - Eski (NULL) satırlar: bildirim için fallback NKR.Tarih kullanılır
 *   (bildirim sorgusunda COALESCE).
 *
 * Yeniden çalıştırmaya güvenli.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] cosmoroot.NKR_LabKabul.OlusturmaTarihi kolonu (varsa atlanır)...");
  await query(
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA='cosmoroot' AND TABLE_NAME='NKR_LabKabul'
         AND COLUMN_NAME='OlusturmaTarihi'
     )
     BEGIN
       ALTER TABLE cosmoroot.NKR_LabKabul
       ADD OlusturmaTarihi DATETIME NULL
         CONSTRAINT DF_NKR_LabKabul_OlusturmaTarihi DEFAULT GETDATE();
     END`
  );
  console.log("    OK\n");

  // Doğrulama
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA='cosmoroot' AND TABLE_NAME='NKR_LabKabul'
       AND COLUMN_NAME='OlusturmaTarihi'`
  );
  console.log("[2] Kolon durumu:");
  console.dir(cols, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
