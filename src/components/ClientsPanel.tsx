import React, { useEffect, useState } from 'react';
import { listarClientes, crearCliente, eliminarCliente, Cliente } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function ClientsPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

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
    try {
      const created = await crearCliente({ nombre: nombre.trim(), telefono: telefono || undefined, email: email || undefined });
      setClientes((prev) => [created, ...prev]);
      setNombre('');
      setTelefono('');
      setEmail('');
    } catch (e: any) {
      setError(e.message || 'No se pudo crear');
    }
  }

  async function onDelete(id: number) {
    try {
      await eliminarCliente(id);
      setClientes((prev) => prev.filter(c => c.id !== id));
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={!nombre.trim()}>Agregar</Button>
        </form>

        {error && (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {clientes.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin clientes</div>
            ) : (
              clientes.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <div className="font-medium">{c.nombre}</div>
                    <div className="text-xs text-muted-foreground">{c.telefono || '—'} · {c.email || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botón eliminar */}
                    <Button variant="destructive" size="sm" onClick={() => onDelete(c.id)}>Eliminar</Button>
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
