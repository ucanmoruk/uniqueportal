import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { queryOne } = await import("../lib/db");
  // VIEW_TERMINTAKIP'te kaydı olan firma bul
  const r = await queryOne<{Kod:string;Parola:string;Firma_Adi:string;Tur:string;n:number}>(
    `SELECT TOP 1 f.Kod, f.Parola, f.Firma_Adi, f.Tur,
            (SELECT COUNT(*) FROM VIEW_TERMINTAKIP WHERE Firma = f.Firma_Adi OR Proje = f.Firma_Adi) AS n
     FROM Firma f
     WHERE f.Parola IS NOT NULL
       AND (SELECT COUNT(*) FROM VIEW_TERMINTAKIP WHERE Firma = f.Firma_Adi OR Proje = f.Firma_Adi) > 50
     ORDER BY (SELECT COUNT(*) FROM VIEW_TERMINTAKIP WHERE Firma = f.Firma_Adi OR Proje = f.Firma_Adi) DESC`
  );
  console.log(JSON.stringify(r));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
