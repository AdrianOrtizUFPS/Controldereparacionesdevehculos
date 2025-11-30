-- Crear base de datos (opcional si ya existe)
-- CREATE DATABASE crv;

-- Esquema inicial para Control de Reparaciones de Vehículos
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(200),
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  placa VARCHAR(20) NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  anio INTEGER,
  vin VARCHAR(50),
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (placa)
);

CREATE TABLE IF NOT EXISTS reparaciones (
  id SERIAL PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- pendiente | en_progreso | completada | cancelada
  costo_estimado NUMERIC(12,2),
  costo_final NUMERIC(12,2),
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida DATE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_vehiculo ON reparaciones(vehiculo_id);
