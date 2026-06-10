import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[A] 26060126 için NumuneDurum kayıtları:");
  const rows = await query(
    `SELECT * FROM dbo.NumuneDurum WHERE RaporNo = 26060126 ORDER BY ID`
  );
  console.dir(rows, { depth: null });

  console.log("\n[B] NumuneDurum'daki tüm farklı Durum değerleri:");
  const distinct = await query(
    `SELECT Durum, COUNT(*) AS n FROM dbo.NumuneDurum GROUP BY Durum ORDER BY n DESC`
  );
  console.dir(distinct, { depth: null });
  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
