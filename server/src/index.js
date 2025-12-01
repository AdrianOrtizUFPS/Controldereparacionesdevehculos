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
app.use(express.json({ limit: '10mb' })); // Aumentar límite para imágenes base64
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    const { rows } = await query('SELECT cedula, nombre, telefono, email, direccion FROM clientes ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { cedula, nombre, telefono, email, direccion } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await query(
      'INSERT INTO clientes (cedula, nombre, telefono, email, direccion) VALUES ($1, $2, $3, $4, $5) RETURNING cedula, nombre, telefono, email, direccion',
      [cedula, nombre, telefono || null, email || null, direccion || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/clientes/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { cedula: newCedula, nombre, telefono, email, direccion } = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE clientes SET cedula = COALESCE($1, cedula), nombre = COALESCE($2, nombre), telefono = COALESCE($3, telefono), email = COALESCE($4, email), direccion = COALESCE($5, direccion) WHERE cedula = $6 RETURNING cedula, nombre, telefono, email, direccion`,
      [newCedula || null, nombre || null, telefono || null, email || null, direccion || null, cedula]
    );
    if (!rows.length) return res.status(404).json({ error: 'cliente no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/clientes/:cedula', async (req, res) => {
  const { cedula } = req.params;
  try {
    const { rowCount } = await query('DELETE FROM clientes WHERE cedula = $1', [cedula]);
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
              v.cliente_cc, c.nombre AS cliente_nombre
       FROM vehiculos v
       JOIN clientes c ON c.cedula = v.cliente_cc
       ORDER BY v.id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/vehiculos', async (req, res) => {
  const { cliente_cc, placa, marca, modelo, anio, vin } = req.body || {};
  if (!cliente_cc || !placa) return res.status(400).json({ error: 'cliente_cc y placa son requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO vehiculos (cliente_cc, placa, marca, modelo, anio, vin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, cliente_cc, placa, marca, modelo, anio, vin`,
      [cliente_cc, placa, marca || null, modelo || null, anio || null, vin || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/vehiculos/:placa', async (req, res) => {
  const { placa, marca, modelo, anio, vin, cliente_cc } = req.body || {};
  console.log('Updating vehicle with ID:', id);
  console.log('Nueva placa:', placa);
  console.log('Marca:', marca);
  console.log('Modelo:', modelo);
  console.log('Año:', anio);
  console.log('VIN:', vin);
  console.log('Cliente CC:', cliente_cc);
  try {
    const { rows } = await query(
      `UPDATE vehiculos SET
         placa = COALESCE($1, placa),
         marca = COALESCE($2, marca),
         modelo = COALESCE($3, modelo),
         anio = COALESCE($4, anio),
         vin = COALESCE($5, vin),
         cliente_cc = COALESCE($6, cliente_cc)
       WHERE placa = $1
       RETURNING cliente_cc, placa, marca, modelo, anio, vin`,
      [cliente_cc || null, placa || null, marca || null, modelo || null, anio || null, vin || null]
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
              r.tecnico, r.tipo_servicio, r.kms,
              r.vehiculo_id, v.placa, v.marca, v.modelo, r.cliente_id
       FROM reparaciones r
       JOIN vehiculos v ON v.placa = r.vehiculo_id
       ORDER BY r.id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reparaciones', async (req, res) => {
  const { vehiculo_id, cliente_id, descripcion, estado, costo_estimado, costo_final, fecha_salida, tecnico, tipo_servicio, kms } = req.body || {};
  if (!vehiculo_id || !descripcion) return res.status(400).json({ error: 'vehiculo_id y descripcion son requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO reparaciones (vehiculo_id, cliente_id, descripcion, estado, costo_estimado, costo_final, fecha_salida, tecnico, tipo_servicio, kms)
       VALUES ($1, $2, $3, COALESCE($4, 'pendiente'), $5, $6, $7, $8, $9, $10)
       RETURNING id, vehiculo_id, cliente_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio, kms`,
      [vehiculo_id, cliente_id || null, descripcion, estado || null, costo_estimado || null, costo_final || null, fecha_salida || null, tecnico || null, tipo_servicio || null, kms || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/reparaciones/:id', async (req, res) => {
  const { id } = req.params;
  const { vehiculo_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio } = req.body || {};
  console.log('Updating repair with ID:', id);
  console.log('vehiculo_id:', vehiculo_id);
  console.log('descripcion:', descripcion); 
  console.log('estado:', estado);
  console.log('costo_estimado:', costo_estimado);
  console.log('costo_final:', costo_final);
  console.log('fecha_ingreso:', fecha_ingreso);
  console.log('fecha_salida:', fecha_salida);
  console.log('tecnico:', tecnico);
  console.log('tipo_servicio:', tipo_servicio);
  try {
    // Construir la consulta dinámicamente según los campos presentes
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (vehiculo_id !== undefined) {
      updates.push(`vehiculo_id = $${paramIndex++}`);
      values.push(vehiculo_id);
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(descripcion);
    }
    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      values.push(estado);
    }
    if (costo_estimado !== undefined) {
      updates.push(`costo_estimado = $${paramIndex++}`);
      values.push(costo_estimado);
    }
    if (costo_final !== undefined) {
      updates.push(`costo_final = $${paramIndex++}`);
      values.push(costo_final);
    }
    if (fecha_ingreso !== undefined) {
      updates.push(`fecha_ingreso = $${paramIndex++}`);
      values.push(fecha_ingreso);
    }
    if (fecha_salida !== undefined) {
      updates.push(`fecha_salida = $${paramIndex++}`);
      values.push(fecha_salida);
    }
    if (tecnico !== undefined) {
      updates.push(`tecnico = $${paramIndex++}`);
      values.push(tecnico);
    }
    if (tipo_servicio !== undefined) {
      updates.push(`tipo_servicio = $${paramIndex++}`);
      values.push(tipo_servicio);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE reparaciones SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, vehiculo_id, cliente_id, descripcion, estado, costo_estimado, costo_final, fecha_ingreso, fecha_salida, tecnico, tipo_servicio, kms`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'reparacion no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reports endpoint: rango de fechas + filtros por técnico, tipo de servicio, placa, marca, modelo y cliente
app.get('/api/reportes', async (req, res) => {
  try {
    const { desde, hasta, tecnico, tipo_servicio, placa, marca, modelo, cliente } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'desde y hasta son requeridos (YYYY-MM-DD)' });
    }
    const params = [desde, hasta];
    let idx = params.length;
    const filters = [];
    if (tecnico) { idx += 1; params.push(tecnico); filters.push(`r.tecnico ILIKE $${idx}`); }
    if (tipo_servicio) { idx += 1; params.push(tipo_servicio); filters.push(`r.tipo_servicio ILIKE $${idx}`); }
    if (placa) { idx += 1; params.push(`%${placa}%`); filters.push(`v.placa ILIKE $${idx}`); }
    if (marca) { idx += 1; params.push(`%${marca}%`); filters.push(`v.marca ILIKE $${idx}`); }
    if (modelo) { idx += 1; params.push(`%${modelo}%`); filters.push(`v.modelo ILIKE $${idx}`); }
    if (cliente) { idx += 1; params.push(`%${cliente}%`); filters.push(`(c.nombre ILIKE $${idx} OR c.cedula ILIKE $${idx})`); }

    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT r.id, r.descripcion, r.estado, r.costo_estimado, r.costo_final, r.fecha_ingreso, r.fecha_salida,
             r.tecnico, r.tipo_servicio, r.kms,
             r.vehiculo_id, v.placa, v.marca, v.modelo,
             r.cliente_id, c.nombre as cliente_nombre, c.cedula as cliente_cedula
      FROM reparaciones r
      JOIN vehiculos v ON v.placa = r.vehiculo_id
      LEFT JOIN clientes c ON c.cedula = r.cliente_id
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

// Imágenes de reparaciones
app.get('/api/reparaciones/:id/imagenes', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      `SELECT id, reparacion_id, nombre_archivo, tipo_mime, tamano_bytes, datos_base64, descripcion, creado_en
       FROM imagenes_reparaciones
       WHERE reparacion_id = $1
       ORDER BY creado_en DESC`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reparaciones/:id/imagenes', async (req, res) => {
  const { id } = req.params;
  const { nombre_archivo, tipo_mime, tamano_bytes, datos_base64, descripcion } = req.body || {};
  
  if (!nombre_archivo || !tipo_mime || !datos_base64) {
    return res.status(400).json({ error: 'nombre_archivo, tipo_mime y datos_base64 son requeridos' });
  }

  // Validar que la reparación existe
  try {
    const { rows: repRows } = await query('SELECT id FROM reparaciones WHERE id = $1', [id]);
    if (!repRows.length) {
      return res.status(404).json({ error: 'reparacion no encontrada' });
    }

    const { rows } = await query(
      `INSERT INTO imagenes_reparaciones (reparacion_id, nombre_archivo, tipo_mime, tamano_bytes, datos_base64, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, reparacion_id, nombre_archivo, tipo_mime, tamano_bytes, datos_base64, descripcion, creado_en`,
      [id, nombre_archivo, tipo_mime, tamano_bytes || 0, datos_base64, descripcion || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/reparaciones/:reparacionId/imagenes/:imagenId', async (req, res) => {
  const { reparacionId, imagenId } = req.params;
  try {
    const { rowCount } = await query(
      'DELETE FROM imagenes_reparaciones WHERE id = $1 AND reparacion_id = $2',
      [imagenId, reparacionId]
    );
    if (!rowCount) return res.status(404).json({ error: 'imagen no encontrada' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
