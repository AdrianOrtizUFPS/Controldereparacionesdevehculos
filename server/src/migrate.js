import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getConnParams(dbNameOverride) {
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || '';
  const database = dbNameOverride || process.env.PGDATABASE || 'crv';
  const ssl = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false;
  return { host, port, user, password, database, ssl };
}

async function ensureDatabaseExists(dbName) {
  const targetParams = getConnParams(dbName);
  try {
    const testPool = new Pool(targetParams);
    await testPool.query('SELECT 1');
    await testPool.end();
    console.log(`Base de datos '${dbName}' ya existe.`);
    return;
  } catch (err) {
    if (err.code !== '3D000') { // invalid_catalog_name -> DB no existe
      throw err;
    }
    console.log(`Base de datos '${dbName}' no existe. Creando...`);
    const adminParams = getConnParams('postgres');
    const adminPool = new Pool(adminParams);
    await adminPool.query(`CREATE DATABASE ${pg.Client.prototype.escapeIdentifier ? pg.Client.prototype.escapeIdentifier(dbName) : dbName}`);
    await adminPool.end();
    console.log(`Base de datos '${dbName}' creada.`);
  }
}

async function runSqlFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
}

async function main() {
  const dbName = process.env.PGDATABASE || 'crv';
  await ensureDatabaseExists(dbName);

  const pool = new Pool(getConnParams(dbName));
  const sqlDir = path.resolve(__dirname, '..', 'sql');
  const files = ['001_init.sql', '002_auth.sql', '003_reporting.sql'];
  console.log('Iniciando migraciones...');
  for (const f of files) {
    const full = path.join(sqlDir, f);
    console.log('Ejecutando', full);
    await runSqlFile(pool, full);
  }
  await pool.end();
  console.log('Migraciones completadas.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error en migraciones:', err);
    process.exit(1);
  });
