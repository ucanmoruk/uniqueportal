import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  for (const v of ["VIEW_TALEP_LISTE","VIEW_TEKLIFLERIM","VIEW_FATURA","VIEW_RAPOR","VIEW_TERMINTAKIP","VIEW_DESTEK_TALEBI"]) {
    try {
      const r = await query<{ID:number;n:number}>(`SELECT ID, COUNT(*) AS n FROM ${v} GROUP BY ID HAVING COUNT(*) > 1`);
      console.log(`${v}: ${r.length} duplicate ID (örnek: ${JSON.stringify(r.slice(0,3))})`);
    } catch (e) {
      console.log(`${v}: ERROR ${(e as Error).message.slice(0,60)}`);
    }
  }
  // Termin için nID/ID dağılımı
  try {
    const t = await query<{nID:number|null;n:number}>(`SELECT TOP 5 nID, COUNT(*) AS n FROM VIEW_TERMINTAKIP GROUP BY nID HAVING COUNT(*) > 1`);
    console.log(`VIEW_TERMINTAKIP nID dupes (top 5):`, t);
  } catch (e) { console.log('termintakip err', (e as Error).message); }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
