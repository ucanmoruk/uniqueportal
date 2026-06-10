import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { listRaporlar } = await import("../lib/repositories/rapor");
  const { getBildirimler } = await import("../lib/repositories/bildirim");

  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;

  const list = await listRaporlar(user);
  console.log("Toplam belge satırı:", list.length);

  const nkrRows = list.filter((r) => r.ID < 0);
  const manuel = list.filter((r) => r.ID > 0);
  console.log("  NKR yayın:", nkrRows.length);
  console.log("  Manuel yüklenen:", manuel.length);

  console.log("\nİlk 5 NKR yayını:");
  for (const r of nkrRows.slice(0, 5)) {
    console.log(`  ${r.RaporID ?? "—"} | ${r["Dosya Türü"]} | ${r["Dosya Adı"]?.slice(0, 40)} | ${r.Yol?.slice(0, 50)}`);
  }

  console.log("\nİlk 5 manuel:");
  for (const r of manuel.slice(0, 5)) {
    console.log(`  ID=${r.ID} ${r.RaporID ?? `UQ${r["Dosya No"]}`} | ${r["Dosya Türü"]} | ${r["Dosya Adı"]?.slice(0, 40)}`);
  }

  console.log("\n=== Rapor yayın bildirimleri ===");
  const b = await getBildirimler(user, 90);
  const yayin = b.filter((x) => x.title === "Raporunuz yayınlandı");
  console.log("Toplam:", yayin.length);
  for (const x of yayin.slice(0, 5)) {
    console.log(`  - ${x.subtitle} | ${x.link} | ${x.tarih.toISOString()}`);
  }

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
