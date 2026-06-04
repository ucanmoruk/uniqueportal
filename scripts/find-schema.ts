import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  const rows = await query(
    `SELECT TABLE_SCHEMA, TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_NAME IN ('TeklifBaslik','TeklifKalem','TeklifX1','Firma','Rapor','Fatura','DESTEK')
     ORDER BY TABLE_NAME`
  );
  console.dir(rows, { depth: null });
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
