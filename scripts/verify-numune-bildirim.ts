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

  const kabul = b.filter((x) => x.type === "numune-kabul");
  const analiz = b.filter((x) => x.type === "numune-analiz");

  console.log("\n[numune-kabul] adet:", kabul.length);
  for (const k of kabul.slice(0, 5)) {
    console.log("  -", k.title, "|", k.subtitle, "|", k.link, "|", k.tarih.toISOString());
  }

  console.log("\n[numune-analiz] adet:", analiz.length);
  for (const a of analiz.slice(0, 5)) {
    console.log("  -", a.title, "|", a.subtitle, "|", a.link, "|", a.tarih.toISOString());
  }

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
