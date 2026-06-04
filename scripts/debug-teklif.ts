import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const NEEDLE_FULL = "ÜGAM-26-J5YRK/00";
const NEEDLE_CORE = "J5YRK";
const NEEDLE_ALT = "UGAM"; // ASCII versiyon — bazı veriler accent'siz tutulabilir

async function main() {
  const { query } = await import("../lib/db");

  // ÜGAM kelimesini ve J5YRK kodunu içeren TÜM tablolardaki sütunları tara.
  console.log("\n[A] 'ÜGAM' / 'UGAM' / 'J5YRK' içeren tablolar — şema taraması\n");
  const tables = await query<{ TABLE_NAME: string; COLUMN_NAME: string; DATA_TYPE: string }>(
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE DATA_TYPE IN ('varchar','nvarchar','char','nchar','text','ntext')
       AND (
         COLUMN_NAME LIKE '%Teklif%' OR
         COLUMN_NAME LIKE '%No%' OR
         COLUMN_NAME LIKE '%Kod%' OR
         COLUMN_NAME LIKE '%UGAM%'
       )
     ORDER BY TABLE_NAME, COLUMN_NAME`
  );
  console.log(`  Aday sütun sayısı: ${tables.length}`);

  // Tablo bazlı içerik araması — sadece BASE_TABLE'ları (view değil) tara.
  const baseTables = await query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'`
  );
  const baseSet = new Set(baseTables.map((b) => b.TABLE_NAME));
  const tableColMap = new Map<string, string[]>();
  for (const row of tables) {
    if (!baseSet.has(row.TABLE_NAME)) continue;
    const list = tableColMap.get(row.TABLE_NAME) ?? [];
    list.push(row.COLUMN_NAME);
    tableColMap.set(row.TABLE_NAME, list);
  }

  for (const [table, cols] of tableColMap) {
    const where = cols
      .map((c) => `CAST([${c}] AS NVARCHAR(MAX)) LIKE @needle`)
      .join(" OR ");
    try {
      const hit = await query(
        `SELECT TOP 3 * FROM [${table}] WHERE ${where}`,
        { needle: `%${NEEDLE_CORE}%` }
      );
      if (hit.length > 0) {
        console.log(`\n  >>> ${table} (${hit.length} eşleşme) — sütunlar: ${cols.join(", ")}`);
        console.dir(hit, { depth: null });
      }
    } catch (e) {
      // sessiz geç — bazı kolonlar CAST edilemiyor olabilir
    }
  }

  // ÜGAM ile başlayan numaraları da tara (örnek görmek için)
  console.log("\n\n[B] ÜGAM prefix'i geçen herhangi bir string sütun var mı?");
  for (const [table, cols] of tableColMap) {
    const where = cols
      .map((c) => `CAST([${c}] AS NVARCHAR(MAX)) LIKE @needle`)
      .join(" OR ");
    try {
      const hit = await query(
        `SELECT TOP 1 * FROM [${table}] WHERE ${where}`,
        { needle: `%ÜGAM%` }
      );
      if (hit.length > 0) {
        console.log(`  ÜGAM içeren tablo: ${table}`);
        console.dir(hit, { depth: null });
      }
    } catch {}
  }

  // VIEW_TEKLIFLERIM definition — view'in tanımına bakalım, hangi tabloları topluyor?
  console.log("\n\n[C] VIEW_TEKLIFLERIM tanımı:");
  const def = await query<{ definition: string }>(
    `SELECT OBJECT_DEFINITION(OBJECT_ID('VIEW_TEKLIFLERIM')) AS definition`
  );
  console.log(def[0]?.definition?.slice(0, 2000));

  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
