import mysql from 'mysql2/promise';

function parseDatabaseUrl(urlStr?: string) {
  if (!urlStr || !urlStr.startsWith('mysql://')) return null;
  try {
    const url = new URL(urlStr);
    return {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: url.username || 'root',
      password: url.password || '',
      database: url.pathname ? url.pathname.replace(/^\//, '') : 'tifa_db',
    };
  } catch {
    return null;
  }
}

const dbUrlConfig = parseDatabaseUrl(process.env.DATABASE_URL);

const mysqlConfig = dbUrlConfig || {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'tifa_db',
};

// Global pool caching for Next.js hot-reloading
const globalForMysql = global as unknown as { mysqlPool?: mysql.Pool };

export const mysqlPool: mysql.Pool =
  globalForMysql.mysqlPool ||
  mysql.createPool({
    ...mysqlConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForMysql.mysqlPool = mysqlPool;
}

export async function queryMysql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('[MySQL Error]:', error);
    throw error;
  }
}
