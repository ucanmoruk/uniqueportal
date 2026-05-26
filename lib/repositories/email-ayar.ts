import { query, queryOne } from "@/lib/db";

/**
 * EmailAyar — admin'in SMTP yapılandırmasını sakladığı tablo.
 * Tek satırlık (ID=1 her zaman güncellenir).
 * İlk erişimde otomatik oluşur.
 */

export interface EmailAyar {
  ID: number;
  Host: string;
  Port: number;
  Secure: boolean;
  Username: string;
  Sifre: string;
  FromEmail: string;
  FromName: string;
  Aktif: boolean;
}

let __tableEnsured = false;

async function ensureTable() {
  if (__tableEnsured) return;
  await query(
    `IF NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmailAyar'
     )
     CREATE TABLE EmailAyar (
       ID int IDENTITY(1,1) NOT NULL PRIMARY KEY,
       Host varchar(255) NOT NULL DEFAULT '',
       Port int NOT NULL DEFAULT 587,
       Secure bit NOT NULL DEFAULT 0,
       Username varchar(255) NOT NULL DEFAULT '',
       Sifre varchar(500) NOT NULL DEFAULT '',
       FromEmail varchar(255) NOT NULL DEFAULT '',
       FromName varchar(150) NOT NULL DEFAULT 'UNIQUE Portal',
       Aktif bit NOT NULL DEFAULT 1,
       GuncellemeTarihi datetime NOT NULL CONSTRAINT DF_EmailAyar_Tarih DEFAULT GETDATE()
     )`
  );
  __tableEnsured = true;
}

export async function getEmailAyar(): Promise<EmailAyar | null> {
  await ensureTable();
  return queryOne<EmailAyar>(
    `SELECT TOP 1 ID, Host, Port, Secure, Username, Sifre, FromEmail, FromName, Aktif
     FROM EmailAyar
     ORDER BY ID ASC`
  );
}

export interface UpdateEmailAyarInput {
  Host: string;
  Port: number;
  Secure: boolean;
  Username: string;
  Sifre: string;        // boş geçerse şifreyi koru (mevcut değer kalır)
  FromEmail: string;
  FromName: string;
  Aktif: boolean;
}

export async function saveEmailAyar(data: UpdateEmailAyarInput): Promise<void> {
  await ensureTable();
  const existing = await getEmailAyar();

  // Boş şifre gönderildi ve eski şifre varsa eskiyi koru
  const sifre =
    data.Sifre || (existing?.Sifre ?? "");

  if (existing) {
    await query(
      `UPDATE EmailAyar
       SET Host = @host, Port = @port, Secure = @secure,
           Username = @user, Sifre = @sifre,
           FromEmail = @fromEmail, FromName = @fromName,
           Aktif = @aktif, GuncellemeTarihi = GETDATE()
       WHERE ID = @id`,
      {
        id: existing.ID,
        host: data.Host,
        port: data.Port,
        secure: data.Secure ? 1 : 0,
        user: data.Username,
        sifre,
        fromEmail: data.FromEmail,
        fromName: data.FromName,
        aktif: data.Aktif ? 1 : 0,
      }
    );
  } else {
    await query(
      `INSERT INTO EmailAyar (Host, Port, Secure, Username, Sifre, FromEmail, FromName, Aktif)
       VALUES (@host, @port, @secure, @user, @sifre, @fromEmail, @fromName, @aktif)`,
      {
        host: data.Host,
        port: data.Port,
        secure: data.Secure ? 1 : 0,
        user: data.Username,
        sifre,
        fromEmail: data.FromEmail,
        fromName: data.FromName,
        aktif: data.Aktif ? 1 : 0,
      }
    );
  }
}
