import { queryOne } from "@/lib/db";
import type { Firma } from "@/types/db";

/**
 * Bir telefondan firma bul. Normalleştir + son 10 hane ile eşleştir.
 * "whatsapp:+905551234567" → "5551234567" → Firma.Telefon LIKE '%5551234567%'
 */
export async function findFirmaByPhone(rawPhone: string): Promise<Firma | null> {
  const digits = rawPhone.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;

  // Son 10 hane — TR cep numarası uzunluğu
  const last10 = digits.slice(-10);

  // Önce tam eşleşme (10 hane sonu)
  return queryOne<Firma>(
    `SELECT TOP 1 ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer,
            PlasiyerID, Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No,
            Durum, Sektor, Hizmet, Vade, Odeme
     FROM Firma
     WHERE Telefon LIKE @last10
       AND Durum = 'Aktif'`,
    { last10: `%${last10}%` }
  );
}
