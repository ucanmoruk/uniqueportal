/**
 * Tek seferlik migration:
 *  Mevcut DESTEK kayıtlarının DESTEK_NO alanını yeni formata dönüştürür.
 *  Yeni format: #XX/DT{N}
 *    XX = Firmanın adının ilk 2 harfi (büyük)
 *    N  = O firmaya ait kaçıncı destek talebi olduğu (tarih sırasına göre)
 *
 *  Örnek: Cosmos firmasının 3. destek talebi → #CO/DT3
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] Mevcut DESTEK kayıtları okunuyor...");
  const rows = await query<{
    ID: number;
    FirmaKodu: string | null;
    Tarih: Date | null;
    DESTEK_NO: string | null;
  }>(
    `SELECT d.ID, d.FirmaKodu, d.Tarih, d.DESTEK_NO
     FROM DESTEK d
     ORDER BY d.FirmaKodu, d.Tarih ASC, d.ID ASC`
  );
  console.log(`    ${rows.length} kayıt bulundu.\n`);

  console.log("[2] Firma adları alınıyor...");
  const firmalar = await query<{ Kod: string; Firma_Adi: string }>(
    `SELECT Kod, Firma_Adi FROM Firma WHERE Durum = 'Aktif'`
  );
  const firmaMap = new Map(firmalar.map((f) => [f.Kod, f.Firma_Adi]));
  console.log(`    ${firmalar.length} firma bulundu.\n`);

  console.log("[3] Yeni DESTEK_NO değerleri hesaplanıyor...");
  const counters = new Map<string, number>();
  const updates: { id: number; oldNo: string | null; newNo: string }[] = [];

  for (const row of rows) {
    const kod = row.FirmaKodu ?? "";
    const firmaAdi = firmaMap.get(kod) ?? "";
    const prefix = firmaAdi
      .replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "")
      .slice(0, 2)
      .toUpperCase();

    const sira = (counters.get(kod) ?? 0) + 1;
    counters.set(kod, sira);

    const newNo = `#${prefix}/DT${sira}`;
    updates.push({ id: row.ID, oldNo: row.DESTEK_NO, newNo });
  }

  console.log("[4] Güncelleniyor...");
  let updated = 0;
  for (const u of updates) {
    await query(
      `UPDATE DESTEK SET DESTEK_NO = @newNo WHERE ID = @id`,
      { id: u.id, newNo: u.newNo }
    );
    updated++;
    if (updated % 50 === 0) console.log(`    ${updated}/${updates.length}...`);
  }
  console.log(`    ${updated} kayıt güncellendi.\n`);

  console.log("[5] Örnek sonuçlar:");
  const sample = await query<{ ID: number; DESTEK_NO: string; FirmaKodu: string }>(
    `SELECT TOP 10 ID, DESTEK_NO, FirmaKodu FROM DESTEK ORDER BY ID DESC`
  );
  for (const s of sample) {
    console.log(`    ID=${s.ID}  FirmaKodu=${s.FirmaKodu}  DESTEK_NO=${s.DESTEK_NO}`);
  }

  console.log("\nTamamlandı ✓");
  process.exit(0);
}

main().catch((err) => {
  console.error("HATA:", err);
  process.exit(1);
});
