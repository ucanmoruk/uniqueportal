import { query, queryOne } from "@/lib/db-mysql";
import type { Firma } from "@/types/db";

export interface FirmaOption {
  ID: number;
  Kod: string;
  Firma_Adi: string;
  Tur: string;
}

export async function listFirmaOptions(): Promise<FirmaOption[]> {
  return query<FirmaOption>(
    `SELECT ID, Kod, Firma_Adi, Tur
     FROM Firma
     WHERE Durum = 'Aktif' AND Firma_Adi IS NOT NULL AND CHAR_LENGTH(Firma_Adi) > 0
     ORDER BY Firma_Adi ASC`
  );
}

export async function findFirmaByKod(kod: string): Promise<Firma | null> {
  return queryOne<Firma>(
    `SELECT ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer, PlasiyerID,
            Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No, Durum, Sektor,
            Hizmet, Vade, Odeme
     FROM Firma
     WHERE TRIM(Kod) = @kod
     LIMIT 1`,
    { kod: kod.trim() }
  );
}

export async function findFirmaByMail(mail: string): Promise<Firma | null> {
  return queryOne<Firma>(
    `SELECT ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer, PlasiyerID,
            Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No, Durum, Sektor,
            Hizmet, Vade, Odeme
     FROM Firma
     WHERE LOWER(TRIM(Mail)) = @mail AND Durum = 'Aktif'
     LIMIT 1`,
    { mail: mail.trim().toLowerCase() }
  );
}

export async function findFirmaById(id: number): Promise<Firma | null> {
  return queryOne<Firma>(
    `SELECT ID, Kod, Parola, Firma_Adi, Tur, Yetkili, Plasiyer, PlasiyerID,
            Adres, Telefon, Mail, Vergi_Dairesi, Vergi_No, Durum, Sektor,
            Hizmet, Vade, Odeme
     FROM Firma
     WHERE ID = @id
     LIMIT 1`,
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
