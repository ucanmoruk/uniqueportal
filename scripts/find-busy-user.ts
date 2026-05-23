import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { queryOne } = await import("../lib/db");
  // En çok talebi olan müşteri firmayı bul
  const r = await queryOne<{Kod:string;Parola:string;Firma_Adi:string;Tur:string;n:number}>(
    `SELECT TOP 1 f.Kod, f.Parola, f.Firma_Adi, f.Tur,
            (SELECT COUNT(*) FROM Talep t WHERE t.FirmaKodu = f.Kod) AS n
     FROM Firma f
     WHERE f.Tur IN ('Müşteri','Proje') AND f.Parola IS NOT NULL
     ORDER BY (SELECT COUNT(*) FROM Talep t WHERE t.FirmaKodu = f.Kod) DESC`
  );
  console.log(JSON.stringify(r));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
