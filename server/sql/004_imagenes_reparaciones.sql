-- Tabla para almacenar imágenes de reparaciones
CREATE TABLE IF NOT EXISTS imagenes_reparaciones (
  id SERIAL PRIMARY KEY,
  reparacion_id INTEGER NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  datos_base64 TEXT NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas rápidas por reparación
CREATE INDEX IF NOT EXISTS idx_imagenes_reparacion ON imagenes_reparaciones(reparacion_id);
