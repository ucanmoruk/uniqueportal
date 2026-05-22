import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query, queryOne } = await import("../lib/db");
  console.log("MSSQL bağlantısı test ediliyor...\n");

  const ver = await queryOne<{ ver: string }>("SELECT @@VERSION AS ver");
  console.log("✓ Bağlantı OK");
  console.log("  Sürüm:", ver?.ver?.slice(0, 60), "...\n");

  const firmaCount = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM Firma"
  );
  console.log(`✓ Firma tablosu: ${firmaCount?.n} kayıt`);

  const firstFirma = await queryOne<{
    ID: number;
    Kod: string;
    Firma_Adi: string;
    Tur: string;
  }>("SELECT TOP 1 ID, Kod, Firma_Adi, Tur FROM Firma ORDER BY ID DESC");
  console.log("  Son firma:", firstFirma);

  const talepCount = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM Talep"
  );
  console.log(`\n✓ Talep tablosu: ${talepCount?.n} kayıt`);

  for (const view of [
    "VIEW_RAPOR",
    "VIEW_TALEP",
    "VIEW_TALEP_LISTE",
    "VIEW_TEKLIFLERIM",
    "VIEW_FATURA",
    "VIEW_DESTEK_TALEBI",
    "VIEW_TERMINTAKIP",
    "VIEW_TEKLIF_DETAY_ANALIZ",
    "VIEW_TEKLIF_DETAY_PAKET",
  ]) {
    try {
      const r = await queryOne<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${view}`
      );
      console.log(`✓ ${view}: ${r?.n} kayıt`);
    } catch (e) {
      console.log(`✗ ${view}: ${(e as Error).message.slice(0, 80)}`);
    }
  }

  await query("SELECT 1");
  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
