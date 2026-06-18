// @ts-nocheck
import sql, { ConnectionPool, config as MSSQLConfig } from "mssql";

function buildConfig(): MSSQLConfig {
  const server = process.env.MSSQL_SERVER;
  if (!server) {
    throw new Error(
      "MSSQL_SERVER environment variable is not set. Check .env.local"
    );
  }
  return {
    server,
    database: process.env.MSSQL_DATABASE!,
    user: process.env.MSSQL_USER!,
    password: process.env.MSSQL_PASSWORD!,
    port: Number(process.env.MSSQL_PORT ?? 1433),
    options: {
      encrypt: process.env.MSSQL_ENCRYPT === "true",
      trustServerCertificate: process.env.MSSQL_TRUST_CERT !== "false",
      enableArithAbort: true,
    },
    pool: {
      max: 3,
      min: 0,
      idleTimeoutMillis: 15000,
    },
    requestTimeout: 30000,
  };
}

declare global {
  var __mssqlPool: Promise<ConnectionPool> | undefined;
}

function createPool(): Promise<ConnectionPool> {
  return new sql.ConnectionPool(buildConfig())
    .connect()
    .then((pool) => {
      pool.on("error", (err) => console.error("MSSQL pool error:", err));
      return pool;
    })
    .catch((err) => {
      console.error("MSSQL connection failed:", err);
      throw err;
    });
}

export function getPool(): Promise<ConnectionPool> {
  if (!global.__mssqlPool) {
    global.__mssqlPool = createPool();
  }
  return global.__mssqlPool;
}

type ParamValue = string | number | boolean | Date | Buffer | null | undefined;

export async function query<T = Record<string, unknown>>(
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  const result = await request.query<T>(text);
  return result.recordset;
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export { sql };
