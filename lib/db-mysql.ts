import mysql, {
  Pool,
  PoolConnection,
  PoolOptions,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

function buildConfig(): PoolOptions {
  const host = process.env.MYSQL_HOST ?? "localhost";
  const database = process.env.MYSQL_DATABASE;
  if (!database) {
    throw new Error(
      "MYSQL_DATABASE environment variable is not set. Check .env.local"
    );
  }
  return {
    host,
    database,
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 3,
    idleTimeout: 15000,
  };
}

declare global {
  var __mysqlPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__mysqlPool) {
    global.__mysqlPool = mysql.createPool(buildConfig());
  }
  return global.__mysqlPool;
}

type ParamValue = string | number | boolean | Date | Buffer | null | undefined;
type SqlValue = string | number | boolean | Date | Buffer | null;

/**
 * Converts SQL with @paramName placeholders to mysql2's ? format.
 * Scans the SQL for every @paramName token, replaces each with ?,
 * and builds an ordered values array matching the ? positions.
 * Handles the same @param appearing multiple times in the query.
 */
function convertNamedParams(
  text: string,
  params: Record<string, ParamValue>
): { sql: string; values: SqlValue[] } {
  const values: SqlValue[] = [];
  const converted = text.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name) => {
    values.push(params[name] ?? null);
    return "?";
  });
  return { sql: converted, values };
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<T[]> {
  const pool = getPool();
  const { sql, values } = convertNamedParams(text, params);
  const [rows] = await pool.execute<RowDataPacket[]>(sql, values);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function insertAndGetId(
  conn: PoolConnection,
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<number> {
  const { sql, values } = convertNamedParams(text, params);
  const [result] = await conn.execute<ResultSetHeader>(sql, values);
  return result.insertId;
}

export async function queryConn<T = Record<string, unknown>>(
  conn: PoolConnection,
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<T[]> {
  const { sql: sqlText, values } = convertNamedParams(text, params);
  const [rows] = await conn.execute<RowDataPacket[]>(sqlText, values);
  return rows as T[];
}

export async function queryOneConn<T = Record<string, unknown>>(
  conn: PoolConnection,
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<T | null> {
  const rows = await queryConn<T>(conn, text, params);
  return rows[0] ?? null;
}

export async function executeConn(
  conn: PoolConnection,
  text: string,
  params: Record<string, ParamValue> = {}
): Promise<void> {
  const { sql: sqlText, values } = convertNamedParams(text, params);
  await conn.execute(sqlText, values);
}

export type { PoolConnection };

export { mysql };
