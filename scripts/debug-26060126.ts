import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] NKR kaydı:");
  const n = await query(
    `SELECT ID, RaporNo, Evrak_No, Numune_Adi, Tarih, Firma_ID, Durum, Rapor_Durumu
     FROM dbo.NKR WHERE RaporNo = 26060126`
  );
  console.dir(n, { depth: null });
  if ((n as { ID: number }[]).length === 0) {
    console.log("Bulunamadı.");
    process.exit(0);
  }
  const nID = (n[0] as { ID: number }).ID;

  console.log("\n[2] NumuneX1 satırları (analiz başına bir satır):");
  const nx = await query(
    `SELECT x.ID, x.RaporID, x.AnalizID, x.HizmetDurum, x.SonucKayitTarihi, x.Termin,
            l.Ad AS HizmetAd
     FROM dbo.NumuneX1 x
     LEFT JOIN dbo.StokAnalizListesi l ON l.ID = x.AnalizID
     WHERE x.RaporID = @id
     ORDER BY x.ID`,
    { id: nID }
  );
  console.dir(nx, { depth: null });

  console.log("\n[3] NKR_LabKabul satırları:");
  const lk = await query(
    `SELECT * FROM cosmoroot.NKR_LabKabul WHERE NkrID = @id`,
    { id: nID }
  );
  console.dir(lk, { depth: null });

  console.log("\n[4] NKR_LabKabul kolonları (analiz bazlı bir kolon var mı?):");
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME='NKR_LabKabul' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols, { depth: null });

  console.log("\n[5] NumuneX1 kolonları (HizmetDurum vb.):");
  const cols2 = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME='NumuneX1' ORDER BY ORDINAL_POSITION`
  );
  console.dir(cols2, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
