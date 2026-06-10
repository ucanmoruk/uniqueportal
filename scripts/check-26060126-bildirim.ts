import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { getBildirimler } = await import("../lib/repositories/bildirim");
  const { query } = await import("../lib/db");

  console.log("[1] 26060126 NKR_LabKabul satırı:");
  const k = await query(
    `SELECT k.ID, k.NkrID, k.BolumID, k.RaporFormati, k.KabulTarihi,
            n.Firma_ID, n.Durum, n.Rapor_Durumu, n.Tarih,
            COALESCE(k.KabulTarihi, n.Tarih) AS EffectiveTarih
     FROM cosmoroot.NKR_LabKabul k
     INNER JOIN dbo.NKR n ON n.ID = k.NkrID
     WHERE n.RaporNo = 26060126`
  );
  console.dir(k, { depth: null });

  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;

  console.log("\n[2] Panel (30 gün) için tüm bildirimler:");
  const b30 = await getBildirimler(user, 30);
  console.log("  toplam:", b30.length);
  const a30 = b30.filter((x) => x.type === "numune-analiz");
  console.log("  numune-analiz:", a30.length);
  for (const a of a30.slice(0, 10)) {
    console.log(`    ${a.tarih.toISOString().slice(0, 10)} | ${a.subtitle}`);
  }

  console.log("\n[3] 26060126 bildirim listede mi?");
  const has = b30.find((x) => x.subtitle.includes("26060126"));
  if (has) {
    console.log("  EVET:", has);
  } else {
    console.log("  HAYIR — 26060126 bildirimde gözükmüyor.");
    // 90 günle bak
    const b90 = await getBildirimler(user, 90);
    const has2 = b90.find((x) => x.subtitle.includes("26060126"));
    console.log("  90 gün penceresinde:", has2 ? "EVET" : "HAYIR");
    if (has2) console.log("  ", has2);
  }

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
