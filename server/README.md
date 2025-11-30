# Backend - Control de Reparaciones de Vehículos (Node/Express + PostgreSQL)

## Requisitos
- Node.js 18+
- PostgreSQL 13+

## Instalación
1. Copia `.env.example` a `.env` y ajusta tus credenciales de PostgreSQL.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Crea la base de datos `crv` (si no existe) y aplica el esquema:
   ```bash
   psql -U postgres -h localhost -d crv -f sql/001_init.sql
   ```

## Autenticación y Roles (admin, owner)
1. Configura `JWT_SECRET` en `server/.env`.
2. Crea la tabla de usuarios:
   ```bash
   psql -U postgres -h localhost -d crv -f server/sql/002_auth.sql
   ```
3. Crea un usuario administrador (opcional con variables en `.env`):
   ```bash
   npm run seed:admin
   ```
4. Inicia el servidor y realiza login en `POST /auth/login` para obtener el token JWT.
5. Todas las rutas bajo `/api/*` requieren encabezado `Authorization: Bearer <token>`.

## Ejecución
- Desarrollo con recarga:
  ```bash
  npm run dev
  ```
- Producción:
  ```bash
  npm start
  ```

El API quedará en `http://localhost:4000` (configurable con `PORT`).

## Endpoints
- `GET /health` — healthcheck y verificación básica de BD.
- `POST /auth/login` — devuelve `{ token, user }`.
- `GET /auth/me` — retorna usuario autenticado.
- `GET /api/clientes` — lista clientes.
- `POST /api/clientes` — crea cliente `{ nombre, telefono?, email? }`.
- `PUT /api/clientes/:id` — actualiza parcial.
- `DELETE /api/clientes/:id` — elimina cliente.
- `GET/POST/PUT/DELETE /api/vehiculos`
- `GET/POST/PUT/DELETE /api/reparaciones`

## CORS
Por defecto habilitado para facilitar el consumo desde el frontend Vite (`http://localhost:5173`).

## Notas
- Puedes usar `DATABASE_URL` o variables separadas (`PGHOST`, `PGUSER`, etc.).
- SQL inicial en `server/sql/001_init.sql` incluye tablas `clientes`, `vehiculos`, `reparaciones`.
- Autenticación JWT y roles (`admin`, `owner`) con tabla `users` en `server/sql/002_auth.sql`.
