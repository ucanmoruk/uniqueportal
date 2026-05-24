import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  const rows = await query<{ID:number;Kod:string;Parola:string;Firma_Adi:string;Tur:string;Durum:string}>(
    `SELECT TOP 3 ID, Kod, Parola, Firma_Adi, Tur, Durum FROM Firma WHERE Tur = 'Admin' AND Parola IS NOT NULL ORDER BY ID DESC`
  );
  rows.forEach(r => console.log(JSON.stringify(r)));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
