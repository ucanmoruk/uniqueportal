import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");

  console.log("[1] Talep DGGR ham kaydı:");
  const t = await query(
    `SELECT ID, TalepNo, DisTalepKodu, FirmaKodu, Tur, Durum, Tarih
     FROM Talep WHERE DisTalepKodu LIKE '%DGGR%' OR DisTalepKodu LIKE '%dggr%'`
  );
  console.dir(t, { depth: null });

  if (t.length === 0) {
    console.log("\n--> DGGR talep DB'de yok!");
    process.exit(0);
  }
  const talepId = (t[0] as { ID: number }).ID;

  console.log("\n[2] Bu talebe ait TalepDurumLog kayıtları:");
  const logs = await query(
    `SELECT ID, TalepID, EskiDurum, YeniDurum, Tarih
     FROM dbo.TalepDurumLog
     WHERE TalepID = @id
     ORDER BY ID`,
    { id: talepId }
  );
  console.dir(logs, { depth: null });

  console.log("\n[3] Trigger durumu:");
  const trg = await query(
    `SELECT name, is_disabled FROM sys.triggers WHERE name = 'TR_TalepDurumLog'`
  );
  console.dir(trg, { depth: null });

  console.log("\n[4] DB time vs since (90 gün):");
  const dbTime = await query<{ now: Date; since: Date }>(
    `SELECT GETDATE() AS [now], DATEADD(day, -90, GETDATE()) AS [since]`
  );
  console.dir(dbTime, { depth: null });

  console.log("\n[5] Bildirim sorgusunu manuel çalıştır (ROOT KOZMETİK = UQ35701):");
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sim = await query(
    `SELECT TOP 10
        l.ID AS LogID, l.TalepID, l.EskiDurum, l.YeniDurum, l.Tarih,
        t.FirmaKodu, t.Durum AS TalepDurum, t.DisTalepKodu
     FROM dbo.TalepDurumLog l
     INNER JOIN dbo.Talep t ON t.ID = l.TalepID
     WHERE l.Tarih >= @since
       AND l.YeniDurum <> N'Pasif'
       AND t.Durum    <> N'Pasif'
       AND t.FirmaKodu = @kod
     ORDER BY l.Tarih DESC, l.ID DESC`,
    { since, kod: "UQ35701" }
  );
  console.dir(sim, { depth: null });

  console.log("\n[6] DGGR talebinin sahibi kim?");
  const firma = await query(
    `SELECT t.ID, t.DisTalepKodu, t.FirmaKodu, f.Firma_Adi
     FROM Talep t LEFT JOIN Firma f ON f.Kod = t.FirmaKodu
     WHERE t.ID = @id`,
    { id: talepId }
  );
  console.dir(firma, { depth: null });

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
