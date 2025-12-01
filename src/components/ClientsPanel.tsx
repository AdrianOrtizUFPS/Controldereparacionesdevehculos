import React, { useEffect, useState } from 'react';
import { listarClientes, crearCliente, eliminarCliente, actualizarCliente, Cliente } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function ClientsPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  // Edición inline
  const [editingCedula, setEditingCedula] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editCedula, setEditCedula] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listarClientes();
      setClientes(data);
    } catch (e: any) {
      setError(e.message || 'Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    
    // Verificar si el cliente ya existe por cédula
    const cedulaTrimmed = cedula.trim();
    if (cedulaTrimmed) {
      const existente = clientes.find(c => String(c.cedula ?? c.id) === cedulaTrimmed);
      if (existente) {
        setError(`El cliente con cédula ${cedulaTrimmed} ya está registrado (${existente.nombre})`);
        return;
      }
    }
    
    try {
      const created = await crearCliente({ cedula: cedulaTrimmed, nombre: nombre.trim(), telefono: telefono || undefined, email: email || undefined, direccion: direccion.trim() || undefined });
      setClientes((prev) => [created, ...prev]);
      setCedula('');
      setNombre('');
      setTelefono('');
      setEmail('');
      setDireccion('');
      setError(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo crear');
    }
  }

  async function onDelete(cedula: number) {
    try {
      await eliminarCliente(cedula);
      setClientes((prev) => prev.filter(c => c.cedula !== cedula));
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  }

async function confirmAndDeleteClient(cedula: number, nombre?: string) {
  const confirmMsg = `¿Eliminar cliente "${nombre ?? cedula}"? Esta acción no se puede deshacer.`;
  if (!window.confirm(confirmMsg)) return;
  await onDelete(cedula);
}

function startEdit(c: any) {
  const id = (c.cedula ?? c.id) as number;
  setEditingCedula(id);
  setEditCedula(String(c.cedula ?? c.id ?? ''));
  setEditNombre(c.nombre || '');
  setEditTelefono(c.telefono || '');
  setEditEmail(c.email || '');
  setEditDireccion((c.direccion as string) || '');
}

function cancelEdit() {
  setEditingCedula(null);
  setEditNombre('');
  setEditTelefono('');
  setEditEmail('');
  setEditDireccion('');
}

async function saveEdit() {
  if (!editingCedula) return;
  setError(null);
  try {
    const payload: any = {
      nombre: editNombre.trim(),
      telefono: editTelefono.trim() || undefined,
      email: editEmail.trim() || undefined,
      direccion: editDireccion.trim() || undefined,
    };
    // include cedula if changed
    if (editCedula.trim() && editCedula.trim() !== String(editingCedula)) payload.cedula = editCedula.trim();

    const updated = await actualizarCliente(editingCedula, payload);
    // actualizar en la lista local
    setClientes((prev) => prev.map((p: any) => ((p.cedula ?? p.id) === editingCedula ? { ...p, ...updated } : p)));
    cancelEdit();
  } catch (e: any) {
    setError(e.message || 'No se pudo actualizar');
  }
}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Input placeholder="Cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} />
          <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <Button type="submit" disabled={!nombre.trim()}>Agregar</Button>
        </form>

        {error && (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        )}

        <div className="mb-3">
          <Input placeholder="Buscar por cédula, nombre, teléfono, email o dirección" value={search} onChange={(e) => setSearch(e.target.value)} />
          <br></br> 
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {clientes.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin clientes</div>
            ) : (
              (() => {
                const q = search.trim().toLowerCase();
                const filtered = q
                  ? clientes.filter((c) => {
                      const ced = String(c.cedula ?? c.id ?? '').toLowerCase();
                      const nom = (c.nombre || '').toLowerCase();
                      const tel = (c.telefono || '').toLowerCase();
                      const mail = (c.email || '').toLowerCase();
                      const dir = (c.direccion || '').toLowerCase();
                      return ced.includes(q) || nom.includes(q) || tel.includes(q) || mail.includes(q) || dir.includes(q);
                    })
                  : clientes;

                if (filtered.length === 0) {
                  return <div className="text-sm text-muted-foreground">No se encontraron clientes</div>;
                }

                return filtered.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-md p-2">
                  <div className="flex-1">
                    {editingCedula === (c.cedula ?? c.id) ? (
                      <div className="space-y-2">
                        <Input value={editCedula} onChange={(e) => setEditCedula(e.target.value)} placeholder="Cedula" />
                        <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} placeholder="Nombre" />
                        <div className="flex gap-2">
                          <Input value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} placeholder="Teléfono" />
                          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
                        </div>
                        <Input value={editDireccion} onChange={(e) => setEditDireccion(e.target.value)} placeholder="Dirección" />
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{c.nombre}</div>
                        <div className="text-xs text-muted-foreground">{c.telefono || '—'} · {c.email || '—'}</div>
                      </>
                    )}
                  </div>
                   <div className="flex items-center gap-2">
                    {editingCedula === (c.cedula ?? c.id) ? (
                      <>
                        <Button size="sm" onClick={saveEdit}>Guardar</Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => startEdit(c)}>Editar</Button>
                        {/* Botón eliminar con confirmación */}
                        <Button variant="destructive" size="sm" onClick={() => confirmAndDeleteClient(c.cedula, c.nombre)}>Eliminar</Button>
                      </>
                    )}
                  </div>
                </div>
                ));
              })()
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
