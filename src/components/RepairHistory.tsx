import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Search, Eye, Calendar, User, Wrench, UserCheck } from 'lucide-react';
import { Repair, Owner } from '../types/repair';
import { listarReparaciones, listarClientes, Reparacion as ApiReparacion, Cliente } from '@/utils/api';
import { RepairDetails } from './RepairDetails';

export function RepairHistory() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRepairs, setFilteredRepairs] = useState<Repair[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const filtered = repairs.filter(r => {
        // Buscar en datos del vehículo
        const vehicleMatch = 
          r.vehicle.plate.toLowerCase().includes(q) ||
          r.vehicle.brand.toLowerCase().includes(q) ||
          r.vehicle.model.toLowerCase().includes(q) ||
          (r.vehicle.bin && r.vehicle.bin.toLowerCase().includes(q));
        
        // Buscar en datos del propietario
        const owner = getOwnerByRepair(r);
        const ownerMatch = owner && (
          owner.name.toLowerCase().includes(q) ||
          owner.cedula.toLowerCase().includes(q) ||
          owner.phone.toLowerCase().includes(q)
        );
        
        return vehicleMatch || ownerMatch;
      });
      setFilteredRepairs(filtered);
    } else {
      setFilteredRepairs(repairs);
    }
  }, [searchQuery, repairs, clients]);

  const loadData = async () => {
    try {
      const [apiRows, clientsList] = await Promise.all([
        listarReparaciones(),
        listarClientes()
      ]);
      
      setClients(clientsList);
      
      const mapped: Repair[] = apiRows.map((r: any) => ({
        id: String(r.id),
        vehicle: {
          id: String(r.vehiculo_id),
          plate: r.placa || r.vehiculo_id,
          brand: r.marca || '',
          model: r.modelo || '',
          year: r.anio || new Date().getFullYear(),
          bin: r.vin || undefined,
          color: undefined,
          ownerId: r.cliente_id || '',
        },
        entryDate: new Date(r.fecha_ingreso),
        exitDate: r.fecha_salida ? new Date(r.fecha_salida) : undefined,
        problem: r.descripcion,
        solution: undefined,
        status: r.estado === 'completada'
          ? 'completed'
          : r.estado === 'cancelada'
            ? 'cancelled'
            : 'in-progress',
        supplies: [],
        evidences: [],
        technician: r.tecnico || '',
        cost: r.costo_final ?? r.costo_estimado ?? undefined,
        notes: '',
        createdAt: new Date(r.fecha_ingreso),
        updatedAt: new Date(r.fecha_ingreso),
      }));
      setRepairs(mapped);
      setFilteredRepairs(mapped);
    } catch (e: any) {
      console.error('Error cargando datos desde API:', e?.message || e);
      setRepairs([]);
      setFilteredRepairs([]);
    }
  };

  const getOwnerByRepair = (repair: Repair): Owner | null => {
    const client = clients.find(c => (c as any).cedula === repair.vehicle.ownerId);
    if (!client) return null;
    
    return {
      id: (client as any).cedula || '',
      cedula: (client as any).cedula || '',
      name: client.nombre || '',
      phone: client.telefono || '',
      address: (client as any).direccion || ''
    };
  };

  

  const getStatusBadge = (status: Repair['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 inset-ring inset-ring-green-500/20">Completado</Badge>;
      case 'cancelled':
        return <Badge className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 inset-ring inset-ring-red-400/20">Cancelado</Badge>
      case 'in-progress':
        return <Badge className="inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 inset-ring inset-ring-gray-400/20">En Proceso</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header con búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-5" />
            Historial de Reparaciones
          </CardTitle>
          <CardDescription>
            Consulte todas las reparaciones registradas. Busque por patente, marca, modelo, VIN/BIN, nombre del propietario, cédula o teléfono.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por patente, marca, modelo, VIN/BIN, nombre, cédula o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de reparaciones */}
      <Card>
        <CardContent className="p-0">
          {filteredRepairs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 
                'No se encontraron reparaciones que coincidan con la búsqueda.' :
                'No hay reparaciones registradas aún.'
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Patente</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Fecha Salida</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepairs.map((repair) => {
                  const owner = getOwnerByRepair(repair);
                  return (
                    <TableRow key={repair.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {repair.vehicle.brand} {repair.vehicle.model}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {repair.vehicle.year}
                            {repair.vehicle.color && ` • ${repair.vehicle.color}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {repair.vehicle.plate}
                      </TableCell>
                      <TableCell>
                        {owner ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="size-4 text-muted-foreground" />
                              <span className="font-medium">{owner.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {owner.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No disponible</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(repair.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-muted-foreground" />
                          {repair.technician}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(repair.entryDate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {repair.exitDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(repair.exitDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">En proceso</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => { setSelectedRepair(repair); setDetailsOpen(true); }}
                        >
                          <Eye className="size-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      {repairs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reparaciones</p>
                  <p className="text-2xl">{repairs.length}</p>
                </div>
                <Wrench className="size-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Proceso</p>
                  <p className="text-2xl">
                    {repairs.filter(r => r.status === 'in-progress').length}
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg p-2">⏳</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl">
                    {repairs.filter(r => r.status === 'completed').length}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 text-lg p-2">✓</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Propietarios</p>
                  <p className="text-2xl">{clients.length}</p>
                </div>
                <UserCheck className="size-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Dialog controlado para ver detalles */}
      {detailsOpen && (
        <Dialog
          open={detailsOpen}
          onOpenChange={(o) => { setDetailsOpen(o); if (!o) setSelectedRepair(null); }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" key={selectedRepair ? String(selectedRepair.id) : 'no-repair'}>
            <DialogHeader>
              <DialogTitle>
                {selectedRepair ? `Detalles de Reparación - ${selectedRepair.vehicle.plate}` : 'Detalles de Reparación'}
              </DialogTitle>
            </DialogHeader>
            {selectedRepair && (
              <RepairDetails 
                repair={selectedRepair} 
                onUpdate={() => { loadData(); }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
