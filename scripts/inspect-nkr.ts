import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] NKR* tablo varlığı:");
  const tabs = await query(
    `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_NAME IN ('NKR','NKR_RaporOnay','NKR_LabKabul','NumuneX1')
     ORDER BY TABLE_NAME`
  );
  console.dir(tabs, { depth: null });

  console.log("\n[2] VIEW_TERMINTAKIP'in Rapor kolonu dağılımı:");
  const rapor = await query(
    `SELECT TOP 10 Rapor, COUNT(*) AS n FROM VIEW_TERMINTAKIP
     GROUP BY Rapor ORDER BY n DESC`
  );
  console.dir(rapor, { depth: null });

  console.log("\n[3] VIEW_TERMINTAKIP tanımı (Rapor & Durum nasıl hesaplanıyor):");
  const def = await query<{ d: string }>(
    `SELECT OBJECT_DEFINITION(OBJECT_ID('VIEW_TERMINTAKIP')) AS d`
  );
  console.log(def[0]?.d);

  console.log("\n[4] NKR örnek (5):");
  const nkr = await query(
    `SELECT TOP 5 ID, RaporNo, Evrak_No, Numune_Adi, Tarih, Durum, Firma_ID
     FROM dbo.NKR ORDER BY ID DESC`
  );
  console.dir(nkr, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
