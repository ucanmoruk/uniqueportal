import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("\n[1] TeklifBaslik kolonları:");
  const baslikCols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'TeklifBaslik'
     ORDER BY ORDINAL_POSITION`
  );
  console.dir(baslikCols, { depth: null });

  // TeklifBaslik ile ilgili olası satır / detay tabloları
  console.log("\n[2] Adı 'Teklif%' olan tüm tablolar:");
  const teklifTables = await query(
    `SELECT TABLE_NAME, TABLE_TYPE
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_NAME LIKE 'Teklif%'
     ORDER BY TABLE_NAME`
  );
  console.dir(teklifTables, { depth: null });

  // Olası detail tablolarının kolonları
  for (const t of teklifTables as { TABLE_NAME: string; TABLE_TYPE: string }[]) {
    if (t.TABLE_NAME === "TeklifX1" || t.TABLE_NAME === "TeklifBaslik") continue;
    console.log(`\n  --- ${t.TABLE_NAME} (${t.TABLE_TYPE}) ---`);
    const cols = await query(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = @t
       ORDER BY ORDINAL_POSITION`,
      { t: t.TABLE_NAME }
    );
    console.dir(cols, { depth: null });
  }

  console.log("\n[3] TeklifBaslik içindeki kayıt sayısı ve durum dağılımı:");
  const total = await query(`SELECT COUNT(*) AS n FROM TeklifBaslik`);
  console.log("  Toplam:", total);
  const durumlar = await query(
    `SELECT TeklifDurum, COUNT(*) AS n FROM TeklifBaslik GROUP BY TeklifDurum ORDER BY n DESC`
  );
  console.log("  TeklifDurum:");
  console.dir(durumlar, { depth: null });
  const durumlar2 = await query(
    `SELECT Durum, COUNT(*) AS n FROM TeklifBaslik GROUP BY Durum ORDER BY n DESC`
  );
  console.log("  Durum:");
  console.dir(durumlar2, { depth: null });

  console.log("\n[4] Örnek TeklifBaslik kayıtları:");
  const samples = await query(
    `SELECT TOP 5 * FROM TeklifBaslik ORDER BY ID DESC`
  );
  console.dir(samples, { depth: null });

  console.log("\n[5] Bildirim ile ilgili tablolar/sütunlar:");
  const bildirimTables = await query(
    `SELECT TABLE_NAME, TABLE_TYPE
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_NAME LIKE '%ildirim%' OR TABLE_NAME LIKE '%Bildirim%'
     ORDER BY TABLE_NAME`
  );
  console.dir(bildirimTables, { depth: null });
  for (const t of bildirimTables as { TABLE_NAME: string }[]) {
    console.log(`\n  --- ${t.TABLE_NAME} kolonları ---`);
    const c = await query(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @t
       ORDER BY ORDINAL_POSITION`,
      { t: t.TABLE_NAME }
    );
    console.dir(c, { depth: null });
    const s = await query(`SELECT TOP 3 * FROM [${t.TABLE_NAME}] ORDER BY 1 DESC`);
    console.dir(s, { depth: null });
  }

  console.log("\n[6] ÜGAM teklifi için detay satırları ve revizyonlar:");
  const ugamRows = await query(
    `SELECT TOP 20 * FROM TeklifBaslik WHERE DisTeklifKodu LIKE '%J5YRK%' OR DisTeklifKodu LIKE '%ÜGAM%'`
  );
  console.dir(ugamRows, { depth: null });

  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
