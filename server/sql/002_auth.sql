-- Tabla de usuarios y roles
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','owner')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice por email (ya es UNIQUE, esto es solo explícito)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
