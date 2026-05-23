import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query, queryOne } = await import("../lib/db");

  console.log("=== Auth debug ===\n");

  // 1) Toplam Firma sayısı + Parolası dolu olanlar
  const counts = await queryOne<{ toplam: number; parolali: number }>(
    `SELECT COUNT(*) AS toplam,
            SUM(CASE WHEN Parola IS NOT NULL AND LEN(LTRIM(RTRIM(Parola))) > 0 THEN 1 ELSE 0 END) AS parolali
     FROM Firma`
  );
  console.log(`Toplam firma : ${counts?.toplam}`);
  console.log(`Parolası dolu: ${counts?.parolali}\n`);

  // 2) Birkaç örnek Kod + Parola uzunluğu (parolayı göstermeden)
  const samples = await query<{
    ID: number;
    Kod: string;
    KodLen: number;
    KodRaw: string;
    ParolaLen: number;
    ParolaTrimLen: number;
    Firma_Adi: string;
    Tur: string;
    Durum: string;
  }>(
    `SELECT TOP 8 ID, Kod,
            LEN(Kod) AS KodLen,
            LEN(LTRIM(RTRIM(Kod))) AS KodTrimLen,
            DATALENGTH(Kod) AS KodRaw,
            LEN(Parola) AS ParolaLen,
            LEN(LTRIM(RTRIM(Parola))) AS ParolaTrimLen,
            Firma_Adi, Tur, Durum
     FROM Firma
     WHERE Parola IS NOT NULL
     ORDER BY ID DESC`
  );
  console.log("Örnek 8 firma:");
  console.table(samples);

  // 3) Kod alanında trailing space var mı?
  const trailing = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM Firma WHERE Kod LIKE '% ' OR Parola LIKE '% '`
  );
  console.log(`\nKod veya Parolasında trailing space olan: ${trailing?.n}\n`);

  // 4) Belirli bir firma için testKodu (komut satırından)
  const testKod = process.argv[2];
  if (testKod) {
    console.log(`\n--- Test ediliyor: '${testKod}' ---`);
    const r = await queryOne<{
      ID: number;
      Kod: string;
      Parola: string | null;
      ParolaTrimLen: number;
      Firma_Adi: string;
      Tur: string;
      Durum: string;
    }>(
      `SELECT TOP 1 ID, Kod, Parola,
              LEN(LTRIM(RTRIM(Parola))) AS ParolaTrimLen,
              Firma_Adi, Tur, Durum
       FROM Firma
       WHERE LTRIM(RTRIM(Kod)) = @kod`,
      { kod: testKod.trim() }
    );
    if (!r) {
      console.log(`✗ '${testKod}' bulunamadı`);
    } else {
      console.log(
        JSON.stringify(
          {
            ID: r.ID,
            Kod: r.Kod,
            Firma_Adi: r.Firma_Adi,
            Tur: r.Tur,
            Durum: r.Durum,
            ParolaTrimLen: r.ParolaTrimLen,
            ParolaIlk2: r.Parola?.slice(0, 2) + "***",
            ParolaSon2: "***" + r.Parola?.slice(-2),
          },
          null,
          2
        )
      );
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
