import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { query } from './db.js';

dotenv.config();

async function main() {
  const name = process.env.OWNER_NAME || 'Owner';
  const email = process.env.OWNER_EMAIL || 'owner@example.com';
  const password = process.env.OWNER_PASSWORD || 'owner123';
  const role = 'owner';

  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length) {
    console.log('Usuario owner ya existe:', email);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  const res = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
    [name, email, hash, role]
  );
  console.log('Usuario owner creado:', res.rows[0]);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
