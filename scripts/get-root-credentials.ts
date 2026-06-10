import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  const rows = await query(
    `SELECT ID, Kod, Firma_Adi, Mail, Yetkili, Parola, Tur, Durum
     FROM Firma
     WHERE Firma_Adi LIKE '%Root Kozmetik%'`
  );
  console.dir(rows, { depth: null });
  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
