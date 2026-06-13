/**
 * Tanı scripti: TeklifBaslik.Notlar sütununun durumunu kontrol eder.
 * Notlar dolu mu, boş mu, NULL mı — istatistik verir.
 *
 *   cd uniqueportal && npx tsx scripts/check-teklif-notlar.ts
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("=== TeklifBaslik.Notlar Durumu ===\n");

  const stats = await query<{ durum: string; adet: number }>(`
    SELECT
      CASE
        WHEN Notlar IS NULL THEN 'NULL'
        WHEN LTRIM(RTRIM(Notlar)) = '' THEN 'BOS_STRING'
        ELSE 'DOLU'
      END AS durum,
      COUNT(*) AS adet
    FROM cosmoroot.TeklifBaslik
    WHERE Durum = 'Aktif'
    GROUP BY
      CASE
        WHEN Notlar IS NULL THEN 'NULL'
        WHEN LTRIM(RTRIM(Notlar)) = '' THEN 'BOS_STRING'
        ELSE 'DOLU'
      END
  `);

  for (const s of stats) {
    console.log(`  ${s.durum}: ${s.adet} kayıt`);
  }

  console.log("\n--- Notlar DOLU olan son 10 teklif ---");
  const dolu = await query<{
    ID: number;
    TeklifNo: number | null;
    DisTeklifKodu: string | null;
    Notlar: string | null;
    TeklifDurum: string | null;
  }>(`
    SELECT TOP 10 ID, TeklifNo, DisTeklifKodu, Notlar, TeklifDurum
    FROM cosmoroot.TeklifBaslik
    WHERE Durum = 'Aktif' AND Notlar IS NOT NULL AND LTRIM(RTRIM(Notlar)) <> ''
    ORDER BY ID DESC
  `);
  for (const d of dolu) {
    const no = d.DisTeklifKodu ?? `UQ${d.TeklifNo}`;
    console.log(`  ${no} | Durum: ${d.TeklifDurum} | Notlar: "${d.Notlar}"`);
  }

  if (dolu.length === 0) {
    console.log("  (hiç yok — Notlar sütunu hiçbir kayıtta dolu değil)");
  }

  console.log("\n--- Notlar NULL olan son 5 teklif ---");
  const bos = await query<{
    ID: number;
    TeklifNo: number | null;
    DisTeklifKodu: string | null;
    TeklifDurum: string | null;
  }>(`
    SELECT TOP 5 ID, TeklifNo, DisTeklifKodu, TeklifDurum
    FROM cosmoroot.TeklifBaslik
    WHERE Durum = 'Aktif' AND (Notlar IS NULL OR LTRIM(RTRIM(Notlar)) = '')
    ORDER BY ID DESC
  `);
  for (const b of bos) {
    const no = b.DisTeklifKodu ?? `UQ${b.TeklifNo}`;
    console.log(`  ${no} | Durum: ${b.TeklifDurum} | Notlar: NULL`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
