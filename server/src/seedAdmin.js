import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { query } from './db.js';

dotenv.config();

async function main() {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const role = process.env.ADMIN_ROLE || 'admin';

  if (!['admin', 'owner'].includes(role)) {
    console.error('ADMIN_ROLE debe ser admin u owner');
    process.exit(1);
  }

  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length) {
    console.log('Usuario ya existe:', email);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  const res = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
    [name, email, hash, role]
  );
  console.log('Usuario creado:', res.rows[0]);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
