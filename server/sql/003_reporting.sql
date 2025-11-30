-- 003: Campos para reportes (técnico y tipo de servicio)
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS tecnico VARCHAR(150),
  ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(100);
