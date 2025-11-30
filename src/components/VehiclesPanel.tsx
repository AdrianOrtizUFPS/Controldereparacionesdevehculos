import React, { useEffect, useState } from 'react';
import { listarVehiculos, crearVehiculo, eliminarVehiculo } from '@/utils/api';
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !placa.trim()) return;
    try {
      const created = await crearVehiculo({
        cliente_id: Number(clienteId),
        placa: placa.trim(),
        marca: marca || undefined,
        modelo: modelo || undefined,
        anio: anio ? Number(anio) : undefined,
        vin: vin || undefined,
      });
      setVehiculos((prev) => [created, ...prev]);
      setClienteId(''); setPlaca(''); setMarca(''); setModelo(''); setAnio(''); setVin('');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehículos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Placa" value={placa} onChange={(e) => setPlaca(e.target.value)} />
          <Input placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          <Input placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          <Input placeholder="Año" value={anio} onChange={(e) => setAnio(e.target.value)} />
          <Input placeholder="VIN" value={vin} onChange={(e) => setVin(e.target.value)} />
          <Button type="submit" disabled={!clienteId || !placa.trim()}>Agregar</Button>
        </form>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {vehiculos.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin vehículos</div>
            ) : (
              vehiculos.map((v) => (
                <div key={v.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <div className="font-medium">{v.placa} — {v.marca || '—'} {v.modelo || ''}</div>
                    <div className="text-xs text-muted-foreground">Cliente #{v.cliente_id} · {v.anio || '—'} · {v.vin || '—'}</div>
                  </div>
                  <div>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(v.id)}>Eliminar</Button>
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
