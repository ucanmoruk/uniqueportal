import { query, queryOne } from "@/lib/db-mysql";

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
    `CREATE TABLE IF NOT EXISTS EmailAyar (
       ID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
       Host VARCHAR(255) NOT NULL DEFAULT '',
       Port INT NOT NULL DEFAULT 587,
       Secure TINYINT(1) NOT NULL DEFAULT 0,
       Username VARCHAR(255) NOT NULL DEFAULT '',
       Sifre VARCHAR(500) NOT NULL DEFAULT '',
       FromEmail VARCHAR(255) NOT NULL DEFAULT '',
       FromName VARCHAR(150) NOT NULL DEFAULT 'UNIQUE Portal',
       Aktif TINYINT(1) NOT NULL DEFAULT 1,
       GuncellemeTarihi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci`
  );
  __tableEnsured = true;
}

export async function getEmailAyar(): Promise<EmailAyar | null> {
  await ensureTable();
  return queryOne<EmailAyar>(
    `SELECT ID, Host, Port, Secure, Username, Sifre, FromEmail, FromName, Aktif
     FROM EmailAyar
     ORDER BY ID ASC
     LIMIT 1`
  );
}

export interface UpdateEmailAyarInput {
  Host: string;
  Port: number;
  Secure: boolean;
  Username: string;
  Sifre: string;
  FromEmail: string;
  FromName: string;
  Aktif: boolean;
}

export async function saveEmailAyar(data: UpdateEmailAyarInput): Promise<void> {
  await ensureTable();
  const existing = await getEmailAyar();

  const sifre =
    data.Sifre || (existing?.Sifre ?? "");

  if (existing) {
    await query(
      `UPDATE EmailAyar
       SET Host = @host, Port = @port, Secure = @secure,
           Username = @user, Sifre = @sifre,
           FromEmail = @fromEmail, FromName = @fromName,
           Aktif = @aktif, GuncellemeTarihi = NOW()
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
