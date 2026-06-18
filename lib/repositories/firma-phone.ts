import { queryOne } from "@/lib/db-mysql";
import type { Firma } from "@/types/db";

export async function findFirmaByPhone(rawPhone: string): Promise<Firma | null> {
  const digits = rawPhone.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;

  const last10 = digits.slice(-10);

  return queryOne<Firma>(
    `SELECT ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer,
            PlasiyerID, Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No,
            Durum, Sektor, Hizmet, Vade, Odeme
     FROM Firma
     WHERE Telefon LIKE @last10
       AND Durum = 'Aktif'
     LIMIT 1`,
    { last10: `%${last10}%` }
  );
}
