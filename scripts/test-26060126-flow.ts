/**
 * Tüm akışı test eder:
 * 1) Termin listesinde 26060126 raporunun 4 satırının durumları ne?
 * 2) İç portal "Koruyucu Etkinlik Testi"ni kabul etmiş gibi NumuneX1.HizmetDurum
 *    'YeniAnaliz' → 'AnalizdeKayit' yapalım, trigger log atsın.
 * 3) Termin listesinde değişen satırın durumu artık "Analiz Aşamasında" mı?
 * 4) Bildirim listesinde "Analiz aşamasında" düştü mü?
 *
 * NOT: Test sonunda HizmetDurum'u eski haline çeviriyoruz.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  const { listTermin } = await import("../lib/repositories/termin");
  const { getBildirimler } = await import("../lib/repositories/bildirim");

  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;

  // 1) Termin listesi - bu rapora ait satırlar
  console.log("=== ADIM 1: Mevcut termin durumları (26060126) ===");
  const t1 = await listTermin(user);
  const r1 = t1.filter((r) => r["Rapor No"] === 26060126);
  for (const r of r1) {
    console.log(`  ID=${r.ID} ${r.Hizmet} → ${r.Durum}`);
  }

  // 2) Koruyucu Etkinlik Testi (NumuneX1 ID=53579) kabul edildi gibi yap
  console.log("\n=== ADIM 2: NumuneX1 ID=53579 HizmetDurum 'AnalizdeKayit' ===");
  await query(
    `UPDATE dbo.NumuneX1 SET HizmetDurum = N'AnalizdeKayit' WHERE ID = 53579`
  );
  const log = await query(
    `SELECT TOP 3 ID, NumuneX1ID, NkrID, EskiDurum, YeniDurum, Tarih
     FROM dbo.NumuneDurumLog
     WHERE NumuneX1ID = 53579 ORDER BY ID DESC`
  );
  console.log("  Trigger log kayıtları:");
  console.dir(log, { depth: null });

  // 3) Termin yeniden
  console.log("\n=== ADIM 3: Termin durumları (değişim sonrası) ===");
  const t2 = await listTermin(user);
  const r2 = t2.filter((r) => r["Rapor No"] === 26060126);
  for (const r of r2) {
    console.log(`  ID=${r.ID} ${r.Hizmet} → ${r.Durum}`);
  }

  // 4) Bildirim
  console.log("\n=== ADIM 4: Bildirimler — numune-analiz türü ===");
  const b = await getBildirimler(user, 90);
  const analiz = b.filter((x) => x.type === "numune-analiz");
  for (const a of analiz.slice(0, 5)) {
    console.log(`  - ${a.title} | ${a.subtitle} | ${a.tarih.toISOString()}`);
  }

  // 5) Geri al
  console.log("\n=== ADIM 5: Test sonrası geri alma ===");
  await query(
    `UPDATE dbo.NumuneX1 SET HizmetDurum = N'YeniAnaliz' WHERE ID = 53579`
  );
  console.log("  HizmetDurum geri çekildi.");

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
