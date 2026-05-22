import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  const tables = [
    "Firma",
    "Talep",
    "TalepRaporlama",
    "TalepFatura",
    "TalepNumune",
    "DESTEK",
    "DESTEK_DETAY",
    "TeklifX1",
    "Fatura",
    "Rapor",
  ];

  const views = [
    "VIEW_TALEP",
    "VIEW_TALEP_LISTE",
    "VIEW_RAPOR",
    "VIEW_TEKLIFLERIM",
    "VIEW_TEKLIF_DETAY_ANALIZ",
    "VIEW_TEKLIF_DETAY_PAKET",
    "VIEW_FATURA",
    "VIEW_DESTEK_TALEBI",
    "VIEW_TERMINTAKIP",
  ];

  for (const t of [...tables, ...views]) {
    try {
      const cols = await query<{
        COLUMN_NAME: string;
        DATA_TYPE: string;
        IS_NULLABLE: string;
        CHARACTER_MAXIMUM_LENGTH: number | null;
      }>(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = @name
         ORDER BY ORDINAL_POSITION`,
        { name: t }
      );
      console.log(`\n=== ${t} (${cols.length} kolon) ===`);
      for (const c of cols) {
        const len = c.CHARACTER_MAXIMUM_LENGTH
          ? `(${c.CHARACTER_MAXIMUM_LENGTH})`
          : "";
        const nul = c.IS_NULLABLE === "YES" ? "?" : " ";
        console.log(
          `  ${nul} ${c.COLUMN_NAME.padEnd(28)} ${c.DATA_TYPE}${len}`
        );
      }
    } catch (e) {
      console.log(`✗ ${t}: ${(e as Error).message.slice(0, 80)}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
