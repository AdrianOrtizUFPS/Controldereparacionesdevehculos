import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT 1 as ok');
    res.json({ status: 'ok', db: result.rows[0].ok === 1 });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Auth routes
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });
  try {
    const { rows } = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'credenciales inválidas' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/auth/me', authRequired, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    const me = rows[0];
    if (!me) return res.status(404).json({ error: 'usuario no encontrado' });
    res.json(me);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Protect all API routes below
app.use('/api', authRequired);

// Clients CRUD minimal
app.get('/api/clientes', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, nombre, telefono, email FROM clientes ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nombre, telefono, email } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await query(
      'INSERT INTO clientes (nombre, telefono, email) VALUES ($1, $2, $3) RETURNING id, nombre, telefono, email',
      [nombre, telefono || null, email || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, email } = req.body || {};
  try {
    const { rows } = await query(
      'UPDATE clientes SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), email = COALESCE($3, email) WHERE id = $4 RETURNING id, nombre, telefono, email',
      [nombre || null, telefono || null, email || null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'cliente no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM clientes WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'cliente no encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Vehicles CRUD
app.get('/api/vehiculos', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT v.id, v.placa, v.marca, v.modelo, v.anio, v.vin,
              v.cliente_id, c.nombre AS cliente_nombre
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       ORDER BY v.id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/vehiculos', async (req, res) => {
  const { cliente_id, placa, marca, modelo, anio, vin } = req.body || {};
  if (!cliente_id || !placa) return res.status(400).json({ error: 'cliente_id y placa son requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO vehiculos (cliente_id, placa, marca, modelo, anio, vin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, cliente_id, placa, marca, modelo, anio, vin`,
      [cliente_id, placa, marca || null, modelo || null, anio || null, vin || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/vehiculos/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente_id, placa, marca, modelo, anio, vin } = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE vehiculos SET
         cliente_id = COALESCE($1, cliente_id),
         placa = COALESCE($2, placa),
         marca = COALESCE($3, marca),
         modelo = COALESCE($4, modelo),
         anio = COALESCE($5, anio),
         vin = COALESCE($6, vin)
       WHERE id = $7
       RETURNING id, cliente_id, placa, marca, modelo, anio, vin`,
      [cliente_id || null, placa || null, marca || null, modelo || null, anio || null, vin || null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'vehiculo no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/vehiculos/:id', roleRequired('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM vehiculos WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'vehiculo no encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Repairs CRUD
app.get('/api/reparaciones', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.descripcion, r.estado, r.costo_estimado, r.costo_final, r.fecha_ingreso, r.fecha_salida,
              r.tecnico, r.tipo_servicio,
              r.vehiculo_id, v.placa, v.marca, v.modelo
       FROM reparaciones r
       JOIN vehiculos v ON v.id = r.vehiculo_id
       ORDER BY r.id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reparaciones', async (req, res) => {
  const { vehiculo_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio } = req.body || {};
  if (!vehiculo_id || !descripcion) return res.status(400).json({ error: 'vehiculo_id y descripcion son requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO reparaciones (vehiculo_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio)
       VALUES ($1, $2, COALESCE($3, 'pendiente'), $4, $5, COALESCE($6, CURRENT_DATE), $7, $8, $9)
       RETURNING id, vehiculo_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio`,
      [vehiculo_id, descripcion, estado || null, costo_estimado || null, costo_final || null, fecha_ingreso || null, fecha_salida || null, tecnico || null, tipo_servicio || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/reparaciones/:id', async (req, res) => {
  const { id } = req.params;
  const { vehiculo_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio } = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE reparaciones SET
         vehiculo_id = COALESCE($1, vehiculo_id),
         descripcion = COALESCE($2, descripcion),
         estado = COALESCE($3, estado),
         costo_estimado = COALESCE($4, costo_estimado),
         costo_final = COALESCE($5, costo_final),
         fecha_ingreso = COALESCE($6, fecha_ingreso),
         fecha_salida = COALESCE($7, fecha_salida),
         tecnico = COALESCE($8, tecnico),
         tipo_servicio = COALESCE($9, tipo_servicio)
       WHERE id = $10
       RETURNING id, vehiculo_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio`,
      [vehiculo_id || null, descripcion || null, estado || null, costo_estimado || null, costo_final || null, fecha_ingreso || null, fecha_salida || null, tecnico || null, tipo_servicio || null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'reparacion no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reports endpoint: rango de fechas + filtros por técnico y tipo de servicio
app.get('/api/reportes', async (req, res) => {
  try {
    const { desde, hasta, tecnico, tipo_servicio } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'desde y hasta son requeridos (YYYY-MM-DD)' });
    }
    const params = [desde, hasta];
    let idx = params.length;
    const filters = [];
    if (tecnico) { idx += 1; params.push(tecnico); filters.push(`r.tecnico = $${idx}`); }
    if (tipo_servicio) { idx += 1; params.push(tipo_servicio); filters.push(`r.tipo_servicio = $${idx}`); }

    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT r.id, r.descripcion, r.estado, r.costo_estimado, r.costo_final, r.fecha_ingreso, r.fecha_salida,
             r.tecnico, r.tipo_servicio,
             r.vehiculo_id, v.placa, v.marca, v.modelo
      FROM reparaciones r
      JOIN vehiculos v ON v.id = r.vehiculo_id
      WHERE r.fecha_ingreso BETWEEN $1 AND $2
      ${where}
      ORDER BY r.fecha_ingreso ASC
    `;
    const { rows } = await query(sql, params);

    // Totales de ingresos: usar costo_final si existe, sino costo_estimado
    const total_ingresos = rows.reduce((sum, r) => sum + Number(r.costo_final ?? r.costo_estimado ?? 0), 0);
    const total_reparaciones = rows.length;
    res.json({ items: rows, total_reparaciones, total_ingresos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/reparaciones/:id', roleRequired('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM reparaciones WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'reparacion no encontrada' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
