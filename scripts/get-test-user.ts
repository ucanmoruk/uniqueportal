import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { queryOne } = await import("../lib/db");
  const r = await queryOne<{Kod:string;Parola:string;Firma_Adi:string;Tur:string}>(
    `SELECT TOP 1 Kod, Parola, Firma_Adi, Tur FROM Firma WHERE Tur = 'Müşteri' AND Parola IS NOT NULL ORDER BY ID DESC`
  );
  console.log(JSON.stringify(r));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
