import { query, queryOne } from "@/lib/db";
import type { Firma } from "@/types/db";

export async function findFirmaByKod(kod: string): Promise<Firma | null> {
  return queryOne<Firma>(
    `SELECT TOP 1 ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer, PlasiyerID,
            Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No, Durum, Sektor,
            Hizmet, Vade, Odeme
     FROM Firma
     WHERE Kod = @kod`,
    { kod }
  );
}

export async function findFirmaById(id: number): Promise<Firma | null> {
  return queryOne<Firma>(
    `SELECT TOP 1 ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer, PlasiyerID,
            Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No, Durum, Sektor,
            Hizmet, Vade, Odeme
     FROM Firma
     WHERE ID = @id`,
    { id }
  );
}

export interface UpdateFirmaInput {
  Firma_Adi: string;
  Adres: string | null;
  Vergi_Dairesi: string | null;
  Vergi_No: string | null;
  Telefon: string | null;
  Mail: string | null;
}

export async function updateFirma(
  id: number,
  data: UpdateFirmaInput
): Promise<void> {
  await query(
    `UPDATE Firma
     SET Firma_Adi = @firma,
         Adres = @adres,
         Vergi_Dairesi = @vd,
         Vergi_No = @vno,
         Telefon = @tel,
         Mail = @mail
     WHERE ID = @id`,
    {
      id,
      firma: data.Firma_Adi,
      adres: data.Adres,
      vd: data.Vergi_Dairesi,
      vno: data.Vergi_No,
      tel: data.Telefon,
      mail: data.Mail,
    }
  );
}

export async function updateFirmaParola(
  id: number,
  parola: string
): Promise<void> {
  await query(`UPDATE Firma SET Parola = @parola WHERE ID = @id`, {
    id,
    parola,
  });
}
