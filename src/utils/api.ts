export type Cliente = {
  id: number;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
};

export type Vehiculo = {
  id: number;
  cliente_id: number;
  placa: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  vin?: string | null;
};

export type Reparacion = {
  id: number;
  vehiculo_id: number;
  descripcion: string;
  estado: string;
  costo_estimado?: number | null;
  costo_final?: number | null;
  fecha_ingreso: string;
  fecha_salida?: string | null;
  tecnico?: string | null;
  tipo_servicio?: string | null;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'owner';
};

const headers = {
  'Content-Type': 'application/json',
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

// Auth token management
let token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

export function setToken(t: string | null) {
  token = t;
  try {
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  } catch {}
}

function authHeaders() {
  const h: Record<string, string> = { ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }>{
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ email, password })
  });
  const data = await handle<any>(res);
  setToken(data.token);
  return data;
}

export async function me(): Promise<User>{
  const res = await fetch('/auth/me', { headers: authHeaders() });
  return handle(res);
}

export function logout() { setToken(null); }

export async function health(): Promise<{ status: string; db: boolean }>{
  const res = await fetch('/health');
  return handle(res);
}

export async function listarClientes(): Promise<Cliente[]>{
  const res = await fetch('/api/clientes', { headers: authHeaders() });
  return handle(res);
}

export async function crearCliente(input: { nombre: string; telefono?: string; email?: string }): Promise<Cliente>{
  const res = await fetch('/api/clientes', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function actualizarCliente(id: string | number, input: Partial<{ cedula: string; nombre: string; telefono: string; email: string; direccion: string }>): Promise<Cliente>{
  const res = await fetch(`/api/clientes/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function eliminarCliente(id: number): Promise<void>{
  const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const data = await res.json(); message = (data as any)?.error || message; } catch {}
    throw new Error(message);
  }
}

// Vehiculos
export async function listarVehiculos(): Promise<Vehiculo[]>{
  const res = await fetch('/api/vehiculos', { headers: authHeaders() });
  return handle(res);
}

export async function crearVehiculo(input: { cliente_id: number; placa: string; marca?: string; modelo?: string; anio?: number; vin?: string; }): Promise<Vehiculo>{
  const res = await fetch('/api/vehiculos', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(input)
  });
  return handle(res);
}

export async function actualizarVehiculo(id: number, input: Partial<{ cliente_id: number; placa: string; marca: string; modelo: string; anio: number; vin: string; }>): Promise<Vehiculo>{
  const res = await fetch(`/api/vehiculos/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(input)
  });
  return handle(res);
}

export async function eliminarVehiculo(id: number): Promise<void>{
  const res = await fetch(`/api/vehiculos/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const data = await res.json(); message = (data as any)?.error || message; } catch {}
    throw new Error(message);
  }
}

// Reparaciones
export async function listarReparaciones(): Promise<Reparacion[]>{
  const res = await fetch('/api/reparaciones', { headers: authHeaders() });
  return handle(res);
}

export async function crearReparacion(input: { vehiculo_id: string; cliente_id?: string; descripcion: string; estado?: string; costo_estimado?: number; costo_final?: number; fecha_ingreso?: string; fecha_salida?: string; tecnico?: string; tipo_servicio?: string; kms?: string | number; }): Promise<Reparacion>{
  const res = await fetch('/api/reparaciones', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(input)
  });
  return handle(res);
}

export async function actualizarReparacion(id: number, input: Partial<{ vehiculo_id: number; descripcion: string; estado: string; costo_estimado: number; costo_final: number; fecha_ingreso: string; fecha_salida: string; }>): Promise<Reparacion>{
  const res = await fetch(`/api/reparaciones/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(input)
  });
  return handle(res);
}

export async function eliminarReparacion(id: number): Promise<void>{
  const res = await fetch(`/api/reparaciones/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const data = await res.json(); message = (data as any)?.error || message; } catch {}
    throw new Error(message);
  }
}

// Reportes
export type ReporteItem = Reparacion & {
  placa?: string;
  marca?: string | null;
  modelo?: string | null;
};

export type ReporteRespuesta = {
  items: ReporteItem[];
  total_reparaciones: number;
  total_ingresos: number;
};

export async function obtenerReportes(params: { desde: string; hasta: string; tecnico?: string; tipo_servicio?: string; placa?: string; marca?: string; modelo?: string; cliente?: string; }): Promise<ReporteRespuesta> {
  const q = new URLSearchParams();
  q.set('desde', params.desde);
  q.set('hasta', params.hasta);
  if (params.tecnico) q.set('tecnico', params.tecnico);
  if (params.tipo_servicio) q.set('tipo_servicio', params.tipo_servicio);
  if (params.placa) q.set('placa', params.placa);
  if (params.marca) q.set('marca', params.marca);
  if (params.modelo) q.set('modelo', params.modelo);
  if (params.cliente) q.set('cliente', params.cliente);
  const res = await fetch(`/api/reportes?${q.toString()}`, { headers: authHeaders() });
  return handle(res);
}

// Imágenes de reparaciones
export type ImagenReparacion = {
  id: number;
  reparacion_id: number;
  nombre_archivo: string;
  tipo_mime: string;
  tamano_bytes: number;
  datos_base64: string;
  descripcion?: string | null;
  creado_en: string;
};

export async function listarImagenesReparacion(reparacionId: number): Promise<ImagenReparacion[]> {
  const res = await fetch(`/api/reparaciones/${reparacionId}/imagenes`, { headers: authHeaders() });
  return handle(res);
}

export async function subirImagenReparacion(reparacionId: number, input: { nombre_archivo: string; tipo_mime: string; tamano_bytes: number; datos_base64: string; descripcion?: string; }): Promise<ImagenReparacion> {
  const res = await fetch(`/api/reparaciones/${reparacionId}/imagenes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input)
  });
  return handle(res);
}

export async function eliminarImagenReparacion(reparacionId: number, imagenId: number): Promise<void> {
  const res = await fetch(`/api/reparaciones/${reparacionId}/imagenes/${imagenId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const data = await res.json(); message = (data as any)?.error || message; } catch {}
    throw new Error(message);
  }
}
