import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("\n[1] VIEW_TALEP_LISTE tanımı:");
  const def = await query<{ definition: string }>(
    `SELECT OBJECT_DEFINITION(OBJECT_ID('VIEW_TALEP_LISTE')) AS definition`
  );
  console.log(def[0]?.definition?.slice(0, 3000));

  console.log("\n[2] Son 10 Talep (ham tablo):");
  const son = await query(
    `SELECT TOP 10 ID, TalepNo, Tarih, FirmaKodu, Durum, Tur, Olusturan
     FROM Talep ORDER BY ID DESC`
  );
  console.dir(son, { depth: null });

  console.log("\n[3] Son 10 Talep VIEW_TALEP_LISTE'de:");
  const viewSon = await query(
    `SELECT TOP 10 * FROM VIEW_TALEP_LISTE ORDER BY Tarih DESC, ID DESC`
  );
  console.dir(viewSon, { depth: null });

  console.log("\n[4] ROOT KOZMETİK (UQ35701) için tüm talepler — view ve ham:");
  const hamKendi = await query(
    `SELECT ID, TalepNo, Tarih, FirmaKodu, Durum FROM Talep
     WHERE FirmaKodu = 'UQ35701' ORDER BY ID DESC`
  );
  console.log("  ham Talep tablosu:", hamKendi);
  const viewKendi = await query(
    `SELECT ID, [Talep No], Tarih, FirmaKodu, Durum FROM VIEW_TALEP_LISTE
     WHERE FirmaKodu = 'UQ35701' ORDER BY Tarih DESC, ID DESC`
  );
  console.log("  view'de:", viewKendi);

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
