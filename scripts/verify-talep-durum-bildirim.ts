import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { getBildirimler } = await import("../lib/repositories/bildirim");
  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;
  const b = await getBildirimler(user, 90);
  console.log("Toplam bildirim:", b.length);
  const talep = b.filter((x) => x.type === "talep-durum");
  console.log("Talep durum bildirimleri:", talep.length);
  for (const t of talep.slice(0, 8)) {
    console.log("-", t.title);
    console.log("    subtitle:", t.subtitle);
    console.log("    link    :", t.link);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error("HATA:", e);
  process.exit(1);
});
