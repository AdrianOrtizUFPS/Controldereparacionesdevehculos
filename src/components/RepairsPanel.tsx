import React, { useEffect, useState } from 'react';
import { listarReparaciones, crearReparacion, eliminarReparacion, listarVehiculos } from '@/utils/api';
import type { Reparacion, Vehiculo } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function RepairsPanel() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehiculoId, setVehiculoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState('pendiente');
  const [costoEstimado, setCostoEstimado] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rs, vs] = await Promise.all([listarReparaciones(), listarVehiculos()]);
      setReparaciones(rs);
      setVehiculos(vs);
    } catch (e: any) {
      setError(e.message || 'Error cargando reparaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!vehiculoId || !descripcion.trim()) return;
    try {
      const created = await crearReparacion({
        vehiculo_id: Number(vehiculoId),
        descripcion: descripcion.trim(),
        estado,
        costo_estimado: costoEstimado ? Number(costoEstimado) : undefined,
      });
      setReparaciones((prev) => [created, ...prev]);
      setVehiculoId(''); setDescripcion(''); setEstado('pendiente'); setCostoEstimado('');
    } catch (e: any) {
      setError(e.message || 'No se pudo crear la reparación');
    }
  }

  async function onDelete(id: number) {
    try {
      await eliminarReparacion(id);
      setReparaciones((prev) => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reparaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <Select value={vehiculoId} onValueChange={setVehiculoId}>
            <SelectTrigger>
              <SelectValue placeholder="Vehículo" />
            </SelectTrigger>
            <SelectContent>
              {vehiculos.map(v => (
                <SelectItem key={v.id} value={String(v.id)}>{v.placa} · {v.marca || ''} {v.modelo || ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">pendiente</SelectItem>
              <SelectItem value="en_progreso">en_progreso</SelectItem>
              <SelectItem value="completada">completada</SelectItem>
              <SelectItem value="cancelada">cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Costo estimado" value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} />
          <Button type="submit" disabled={!vehiculoId || !descripcion.trim()}>Agregar</Button>
        </form>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {reparaciones.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin reparaciones</div>
            ) : (
              reparaciones.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <div className="font-medium">{r.descripcion}</div>
                    <div className="text-xs text-muted-foreground">Veh #{r.vehiculo_id} · {r.estado} · Ingreso {r.fecha_ingreso}</div>
                  </div>
                  <div>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(r.id)}>Eliminar</Button>
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
