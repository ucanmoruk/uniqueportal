import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { getBildirimler } = await import("../lib/repositories/bildirim");
  const { listTermin } = await import("../lib/repositories/termin");
  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;

  console.log("=== Termin (26060126) ===");
  const t = await listTermin(user);
  for (const r of t.filter((r) => r["Rapor No"] === 26060126)) {
    console.log(`  ${r.Hizmet?.trim() ?? "—"} → ${r.Durum}`);
  }

  console.log("\n=== TÜM 26060126 bildirim girdileri (panel: 30 gün) ===");
  const b = await getBildirimler(user, 30);
  for (const x of b) {
    if (
      x.subtitle.includes("26060126") ||
      x.id.includes("39404") ||
      x.id.includes("10004") ||
      x.id.includes("10005")
    ) {
      console.log(`  [${x.type}] ${x.title} | ${x.subtitle} | ${x.tarih.toISOString()}`);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
