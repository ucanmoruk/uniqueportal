import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
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

  console.log("=== Termin durumları (26060126) ===");
  const t = await listTermin(user);
  const filt = t.filter((r) => r["Rapor No"] === 26060126);
  for (const r of filt) {
    console.log(`  ${r.Hizmet?.trim() ?? "—".padEnd(40)}  →  ${r.Durum}`);
  }

  console.log("\n=== Bildirimler — numune-analiz ===");
  const b = await getBildirimler(user, 90);
  const analiz = b.filter((x) => x.type === "numune-analiz");
  for (const a of analiz.slice(0, 5)) {
    console.log(`  - ${a.title} | ${a.subtitle} | ${a.tarih.toISOString()}`);
  }
  console.log("  toplam:", analiz.length);

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
