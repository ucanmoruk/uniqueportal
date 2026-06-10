import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] NKR 39404 ham durumu:");
  const n = await query(
    `SELECT ID, RaporNo, Durum, Rapor_Durumu, Firma_ID FROM dbo.NKR WHERE RaporNo = 26060126`
  );
  console.dir(n, { depth: null });

  console.log("\n[2] NumuneX1 (4 analiz) — HizmetDurum + SonucKayitTarihi:");
  const x = await query(
    `SELECT x.ID, l.Ad AS HizmetAd, l.RaporFormati,
            x.Durum, x.HizmetDurum, x.SonucKayitTarihi, x.Sonuc
     FROM dbo.NumuneX1 x
     LEFT JOIN dbo.StokAnalizListesi l ON l.ID = x.AnalizID
     WHERE x.RaporID = 39404
     ORDER BY x.ID`
  );
  console.dir(x, { depth: null });

  console.log("\n[3] NKR_RaporOnay (rapor onay kayıtları):");
  const o = await query(
    `SELECT ID, NkrID, RaporFormati, Durum, OnaylayanAd, OnayTarihi, YayinTarihi
     FROM cosmoroot.NKR_RaporOnay
     WHERE NkrID = 39404`
  );
  console.dir(o, { depth: null });

  console.log("\n[4] NKR_LabKabul:");
  const k = await query(
    `SELECT ID, NkrID, RaporFormati, KabulTarihi, OlusturmaTarihi
     FROM cosmoroot.NKR_LabKabul WHERE NkrID = 39404`
  );
  console.dir(k, { depth: null });

  console.log("\n[5] Termin view doğrudan ham:");
  const v = await query(
    `SELECT ID, nID, Rapor, [Rapor No] FROM VIEW_TERMINTAKIP WHERE nID = 39404`
  );
  console.dir(v, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
