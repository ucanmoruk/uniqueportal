import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("\n[1] TeklifOnayLog'un şeması:");
  const ol = await query(
    `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TeklifOnayLog'`
  );
  console.dir(ol, { depth: null });

  console.log("\n[2] Talep tablosu kolonları:");
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'Talep' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols, { depth: null });

  console.log("\n[3] VIEW_TALEP_LISTE tanımı:");
  const def = await query<{ d: string }>(
    `SELECT OBJECT_DEFINITION(OBJECT_ID('VIEW_TALEP_LISTE')) AS d`
  );
  console.log(def[0]?.d);

  console.log("\n[4] Son 5 Talep:");
  const last = await query(
    `SELECT TOP 5 * FROM Talep ORDER BY ID DESC`
  );
  console.dir(last, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
