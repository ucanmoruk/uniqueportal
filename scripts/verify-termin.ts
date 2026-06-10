import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { listTermin } = await import("../lib/repositories/termin");

  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;

  const rows = await listTermin(user);
  console.log("Toplam termin satırı (ROOT için):", rows.length);

  // Durum dağılımı
  const sayim: Record<string, number> = {};
  for (const r of rows) {
    const d = r.Durum ?? "NULL";
    sayim[d] = (sayim[d] ?? 0) + 1;
  }
  console.log("Durum dağılımı:");
  console.dir(sayim, { depth: null });

  // Rapor durumu kontrolü — Raporlandı olmamalı
  const raporlandi = rows.filter((r) => r.Rapor === "Raporlandı");
  console.log("\nRapor = 'Raporlandı' satırı:", raporlandi.length, "(0 olmalı)");

  console.log("\nİlk 5 satır:");
  for (const r of rows.slice(0, 5)) {
    console.log(
      `  - nID=${r.nID}, RaporNo=${r["Rapor No"]}, Numune=${r.Numune}, Durum=${r.Durum}, Rapor=${r.Rapor}`
    );
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("HATA:", e);
  process.exit(1);
});
