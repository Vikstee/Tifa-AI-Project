import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local') });

async function main() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'tifa_db';

  console.log(`🔌 Connecting to MySQL Server at ${host}:${port} as ${user}...`);

  let connection;
  try {
    // Connect without selecting database first to create database if missing
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`✅ Connected successfully to MySQL server!`);

    const schemaPath = path.join(rootDir, 'db', 'schema_mysql.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const sqlScript = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`🚀 Executing schema initialization script for database '${database}'...`);
    await connection.query(sqlScript);

    console.log(`🎉 Database '${database}' and all required tables were created successfully!`);
  } catch (error) {
    console.error(`❌ Failed to initialize MySQL database:`, error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
