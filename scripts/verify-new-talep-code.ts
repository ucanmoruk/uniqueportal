/**
 * createTalep() ile yeni bir test talebi üret, DisTalepKodu'nu ve view'de
 * "Talep No" sütununda ÜGAM/26/XXXX formatında göründüğünü doğrula.
 *
 * Ardından oluşturulan test kaydını Pasif yapıyoruz ki canlı listeyi
 * kirletmesin (tamamen silmek yerine soft-delete).
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { createTalep } = await import("../lib/repositories/talep");
  const { query } = await import("../lib/db");

  const user = {
    id: 35701,
    kod: "UQ35701",
    firmaAdi: "ROOT KOZMETİK A.Ş.",
    tur: "Proje",
    yetkili: null,
    plasiyerId: null,
  } as never;

  const id = await createTalep({
    user,
    raporlama: {
      Firma: "TEST Firma",
      Adres: "TEST Adres",
      Yetkili: "Test",
      Iletisim: "0000",
      Karar: "İstenmiyor",
      Dil: "Türkçe",
      Iade: "Hayır",
      UreticiFirma: "",
      Note: "auto test",
    },
    fatura: {
      Firma: "TEST Firma",
      Adres: "TEST Adres",
      VergiDairesi: "",
      VergiNo: "",
      Mail: "",
    },
    numuneler: [
      { Numune: "Test krem", Ozellik: "", Analiz: "Mikrobiyoloji", Metot: "TS EN" },
    ],
    sozlesme: 1,
  });

  console.log("Oluşturulan Talep ID:", id);

  const tek = await query(
    `SELECT TOP 1 ID, TalepNo, DisTalepKodu, Tur, Durum FROM Talep WHERE ID = @id`,
    { id }
  );
  console.log("Ham kayıt:");
  console.dir(tek, { depth: null });

  const v = await query(
    `SELECT TOP 1 ID, [Talep No], FirmaKodu, Durum FROM VIEW_TALEP_LISTE WHERE ID = @id`,
    { id }
  );
  console.log("VIEW satırı:");
  console.dir(v, { depth: null });

  // Test kaydını Pasif yap (soft delete)
  await query(`UPDATE Talep SET Durum = 'Pasif' WHERE ID = @id`, { id });
  console.log("Test kaydı Pasif olarak işaretlendi.");

  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
