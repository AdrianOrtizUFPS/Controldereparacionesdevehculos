import React, { useEffect, useState } from 'react';
import { listarVehiculos, crearVehiculo, eliminarVehiculo, actualizarVehiculo } from '@/utils/api';
import type { Vehiculo, Cliente } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { listarClientes } from '@/utils/api';

export function VehiclesPanel() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState<string>('');
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [vin, setVin] = useState('');
  // Búsqueda por cédula
  const [searchCedula, setSearchCedula] = useState<string>('');
  // Edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editClienteId, setEditClienteId] = useState<string>('');
  const [editPlaca, setEditPlaca] = useState('');
  const [editMarca, setEditMarca] = useState('');
  const [editModelo, setEditModelo] = useState('');
  const [editAnio, setEditAnio] = useState('');
  const [editVin, setEditVin] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [vs, cs] = await Promise.all([listarVehiculos(), listarClientes()]);
      setVehiculos(vs);
      setClientes(cs);
    } catch (e: any) {
      setError(e.message || 'Error cargando vehículos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Filtrar vehículos por cédula de búsqueda
  const vehiculosFiltrados = searchCedula.trim()
    ? vehiculos.filter(v => String((v as any).cliente_cc ?? '') === searchCedula.trim())
    : vehiculos;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !placa.trim()) return;
    
    // Verificar si la placa ya existe
    const placaTrimmed = placa.trim().toUpperCase();
    const existente = vehiculos.find(v => v.placa?.toUpperCase() === placaTrimmed);
    if (existente) {
      const cc = (existente as any).cliente_cc ?? '';
      const cliente = clientes.find(c => String((c as any).cedula ?? '') === String(cc));
      const nombreCliente = cliente ? cliente.nombre : 'Cliente desconocido';
      setError(`El vehículo con placa ${placaTrimmed} ya está registrado (${existente.marca || ''} ${existente.modelo || ''} - Cliente: ${nombreCliente})`);
      return;
    }
    
    try {
      // Enviar la cédula directamente como cliente_cc
      const created = await crearVehiculo({
        cliente_cc: clienteId.trim(),
        placa: placaTrimmed,
        marca: marca || undefined,
        modelo: modelo || undefined,
        anio: anio ? Number(anio) : undefined,
        vin: vin || undefined,
      });
      setVehiculos((prev) => [created, ...prev]);
      setClienteId(''); setPlaca(''); setMarca(''); setModelo(''); setAnio(''); setVin('');
      setError(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo crear el vehículo');
    }
  }

  async function onDelete(id: number) {
    try {
      await eliminarVehiculo(id);
      setVehiculos((prev) => prev.filter(v => v.id !== id));
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  }

  async function confirmAndDelete(id: number, placa?: string) {
    const msg = `¿Eliminar vehículo ${placa ? `"${placa}" ` : ''}de forma permanente? Esta acción no se puede deshacer.`;
    if (!window.confirm(msg)) return;
    await onDelete(id);
  }

  function startEdit(v: Vehiculo) {
    setEditingId(v.id);
    // Prefill con la cédula del cliente asignado si se encuentra
    const cid = (v as any).cliente_id ?? (v as any).clienteId ?? null;
    const found = clientes.find(c => c.id === cid);
    setEditClienteId(found ? String((found as any).cedula ?? '') : '');
    setEditPlaca(v.placa || '');
    setEditMarca(v.marca || '');
    setEditModelo(v.modelo || '');
    setEditAnio(v.anio ? String(v.anio) : '');
    setEditVin(v.vin || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditClienteId('');
    setEditPlaca('');
    setEditMarca('');
    setEditModelo('');
    setEditAnio('');
    setEditVin('');
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    try {
      // Resolver cédula editada -> cliente_id
      const cedulaToSend = editClienteId.trim() || null;
      const found = clientes.find(c => String((c as any).cedula ?? '') === cedulaToSend || String(c.id) === cedulaToSend);
      const payload: any = {
        cliente_cc: cedulaToSend,
        placa: editPlaca.trim() || undefined,
        marca: editMarca.trim() || undefined,
        modelo: editModelo.trim() || undefined,
        anio: editAnio ? Number(editAnio) : undefined,
        vin: editVin.trim() || undefined,
      };
      const updated = await actualizarVehiculo(editingId, payload);
      setVehiculos((prev) => prev.map(p => p.placa === editingId ? { ...p, ...updated } : p));
      cancelEdit();
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar el vehículo');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehículos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <Input placeholder="Cédula del cliente" value={clienteId} onChange={e => setClienteId(e.target.value)} />
            {clienteId.trim() && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const f = clientes.find(c => String((c as any).cedula ?? c.id) === clienteId.trim());
                  return f ? `Cliente: ${f.nombre}` : 'Cliente no encontrado';
                })()}
              </div>
            )}
          </div>
          <Input placeholder="Placa" value={placa} onChange={(e) => setPlaca(e.target.value)} />
          <Input placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          <Input placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          <Input placeholder="Año" value={anio} onChange={(e) => setAnio(e.target.value)} />
          <Input placeholder="VIN" value={vin} onChange={(e) => setVin(e.target.value)} />
          <Button type="submit" disabled={!clienteId || !placa.trim()}>Agregar</Button>
        </form>

        {/* Campo de búsqueda por cédula */}
        <div className="mb-4">
          <div className="flex flex-col gap-1">
            <Input 
              placeholder="Buscar vehículos por cédula del cliente" 
              value={searchCedula} 
              onChange={e => setSearchCedula(e.target.value)} 
            />
            {searchCedula.trim() && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const f = clientes.find(c => String((c as any).cedula ?? '') === searchCedula.trim());
                  const count = vehiculosFiltrados.length;
                  const clienteNombre = f ? f.nombre : 'Cliente no encontrado';
                  return count > 0 
                    ? `${clienteNombre} tiene ${count} vehículo${count !== 1 ? 's' : ''} registrado${count !== 1 ? 's' : ''}`
                    : `No se encontraron vehículos para la cédula ${searchCedula}`;
                })()}
              </div>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {vehiculosFiltrados.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {searchCedula.trim() ? 'No se encontraron vehículos para esta cédula' : 'Sin vehículos'}
              </div>
            ) : (
              vehiculosFiltrados.map((v) => (
                <div key={v.id} className="flex items-center justify-between border rounded-md p-2">
                  <div className="flex-1">
                    {editingId === v.id ? (
                      <div className="space-y-2">
                        {(() => {
                          const cid = (v as any).cliente_cc;
                          const f = clientes.find(c => c.cedula === cid);
                          const cedulaActual =
                            String((f as any)?.cedula ?? (v as any)?.cliente_cedula ?? '');
                          const nombreActual =
                            f?.nombre ?? (v as any)?.cliente_nombre ?? '—';
                          return (
                            <>
                              <Input
                                value={editClienteId || cedulaActual}
                                onChange={e => setEditClienteId(e.target.value)}
                                placeholder="Cédula del cliente"
                              />
                              <div className="text-xs text-muted-foreground">
                                {`Cliente: ${nombreActual} · Cédula: ${cedulaActual}`}
                              </div>
                            </>
                          );
                        })()}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <Input value={editPlaca} onChange={(e) => setEditPlaca(e.target.value)} placeholder="Placa" />
                          <Input value={editMarca} onChange={(e) => setEditMarca(e.target.value)} placeholder="Marca" />
                          <Input value={editModelo} onChange={(e) => setEditModelo(e.target.value)} placeholder="Modelo" />
                          <Input value={editAnio} onChange={(e) => setEditAnio(e.target.value)} placeholder="Año" />
                        </div>
                        <Input value={editVin} onChange={(e) => setEditVin(e.target.value)} placeholder="VIN" />
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{v.placa} — {v.marca || '—'} {v.modelo || ''}</div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const cc = (v as any).cliente_cc ?? null;
                            const f = clientes.find(c => String((c as any).cedula ?? '') === String(cc));
                            const ced = cc ?? '—';
                            const nombre = f ? f.nombre : (v as any).cliente_nombre ?? '—';
                            return `Cliente: ${nombre} · Cédula: ${ced} · ${v.anio || '—'} · ${v.vin || '—'}`;
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === v.id ? (
                      <>
                        <Button size="sm" onClick={saveEdit}>Guardar</Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => startEdit(v)}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmAndDelete(v.id, v.placa)}>Eliminar</Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
