import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  const patterns = ["%nemu%", "%selen%"];
  for (const p of patterns) {
    const rows = await query<{ID:number;Kod:string;Parola:string;Firma_Adi:string;Tur:string;Durum:string;Mail:string}>(
      `SELECT ID, Kod, Parola, Firma_Adi, Tur, Durum, Mail
       FROM Firma WHERE Firma_Adi LIKE @p
       ORDER BY ID DESC`,
      { p }
    );
    console.log(`\n>>> Aranan: ${p}  → ${rows.length} sonuç`);
    rows.forEach(r => console.log(JSON.stringify(r)));
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
