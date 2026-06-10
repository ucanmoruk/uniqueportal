import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] NumuneDurum kolonları:");
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME='NumuneDurum' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols, { depth: null });

  console.log("\n[2] NumuneDurum — 39404 ile ilişkili kayıtlar (RaporID veya NkrID gibi):");
  try {
    const rows1 = await query(
      `SELECT TOP 20 * FROM dbo.NumuneDurum WHERE RaporID = 39404`
    );
    console.dir(rows1, { depth: null });
  } catch {
    try {
      const rows2 = await query(
        `SELECT TOP 20 * FROM dbo.NumuneDurum WHERE NkrID = 39404`
      );
      console.dir(rows2, { depth: null });
    } catch {
      console.log("RaporID/NkrID kolonları yok, son 10 kayıt:");
      const last = await query(`SELECT TOP 10 * FROM dbo.NumuneDurum ORDER BY 1 DESC`);
      console.dir(last, { depth: null });
    }
  }

  console.log("\n[3] NumuneX1_Log var:");
  const logCols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME='NumuneX1_Log' ORDER BY ORDINAL_POSITION`
  );
  console.dir(logCols, { depth: null });

  console.log("\n[4] NumuneX1_Log — 39404 raporu için:");
  try {
    const lg = await query(
      `SELECT TOP 30 * FROM cosmoroot.NumuneX1_Log
       WHERE NumuneX1ID IN (SELECT ID FROM dbo.NumuneX1 WHERE RaporID = 39404)
       ORDER BY 1 DESC`
    );
    console.dir(lg, { depth: null });
  } catch (e) {
    try {
      const lg2 = await query(
        `SELECT TOP 5 * FROM cosmoroot.NumuneX1_Log ORDER BY 1 DESC`
      );
      console.dir(lg2, { depth: null });
    } catch (e2) {
      console.log("  err:", (e2 as Error).message);
    }
  }

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
