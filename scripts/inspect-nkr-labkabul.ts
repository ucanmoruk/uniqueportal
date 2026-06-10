import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] NKR_LabKabul kolonları:");
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'NKR_LabKabul' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols, { depth: null });

  console.log("\n[2] NKR_LabKabul örnek (5):");
  const rows = await query(
    `SELECT TOP 5 * FROM cosmoroot.NKR_LabKabul ORDER BY 1 DESC`
  );
  console.dir(rows, { depth: null });

  console.log("\n[3] NKR_RaporOnay kolonları:");
  const cols2 = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'NKR_RaporOnay' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols2, { depth: null });

  console.log("\n[4] NKR_RaporOnay örnek (3):");
  const rows2 = await query(
    `SELECT TOP 3 * FROM cosmoroot.NKR_RaporOnay ORDER BY 1 DESC`
  );
  console.dir(rows2, { depth: null });

  console.log("\n[5] NKR kolonları (Firma_ID ve Tarih ekseni için):");
  const cols3 = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'NKR' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols3, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
