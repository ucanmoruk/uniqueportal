/**
 * Yeni teklif kanalını test eder: ÜGAM teklifi listede ve detayda görünüyor mu?
 * Müşterinin (ROOT KOZMETİK A.Ş., FirmaID=35701) kimliğiyle çağırıyoruz.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { listTeklifler, getTeklifDetail, findTeklifByListId } = await import(
    "../lib/repositories/teklif"
  );
  const { getBildirimler } = await import("../lib/repositories/bildirim");

  // ROOT KOZMETİK A.Ş. (35701, Tur=Proje)
  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  };

  console.log("\n[1] listTeklifler(ROOT KOZMETİK A.Ş.):");
  const list = await listTeklifler(user as never);
  console.log("  toplam:", list.length);
  for (const r of list) {
    console.log(`  - ID=${r.ID} ${r["Teklif No"]} | ${r.Tarih?.toISOString().slice(0,10)} | ${r["Müşteri"]} | ${r.Durum}`);
  }

  console.log("\n[2] findTeklifByListId(2):");
  const ref = await findTeklifByListId(2);
  console.log(ref);

  console.log("\n[3] getTeklifDetail(2):");
  const detail = await getTeklifDetail(2);
  console.dir(detail, { depth: null });

  console.log("\n[4] getBildirimler(ROOT KOZMETİK A.Ş., 365 gün):");
  const bildirimler = await getBildirimler(user as never, 365);
  const teklifBildirimleri = bildirimler.filter((b) => b.type === "teklif");
  console.log("  Teklif bildirimleri:", teklifBildirimleri.length);
  console.dir(teklifBildirimleri, { depth: null });

  process.exit(0);
}

main().catch((e) => {
  console.error("HATA:", e);
  process.exit(1);
});
