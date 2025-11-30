import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Search, Eye, Calendar, User, Wrench, UserCheck } from 'lucide-react';
import { Repair, Owner } from '../types/repair';
import { getOwners } from '../utils/storage';
import { listarReparaciones, Reparacion as ApiReparacion } from '@/utils/api';
import { RepairDetails } from './RepairDetails';

export function RepairHistory() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRepairs, setFilteredRepairs] = useState<Repair[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadRepairs();
    loadOwners();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      // Filtrar reparaciones actuales (estado en memoria)
      const repairResults = repairs.filter(r =>
        r.vehicle.plate.toLowerCase().includes(q) ||
        r.vehicle.brand.toLowerCase().includes(q) ||
        r.vehicle.model.toLowerCase().includes(q) ||
        r.problem.toLowerCase().includes(q)
      );

      // Coincidencias por propietario guardado localmente (si existiera ownerId)
      const ownerResults = owners.filter(owner => 
        owner.name.toLowerCase().includes(q) ||
        owner.cedula.toLowerCase().includes(q) ||
        owner.phone.toLowerCase().includes(q)
      );
      const ownerRepairs = repairs.filter(repair => 
        ownerResults.some(owner => owner.id === repair.vehicle.ownerId)
      );

      const allResults = [...repairResults, ...ownerRepairs];
      const uniqueResults = allResults.filter((repair, index, self) => 
        index === self.findIndex(r => r.id === repair.id)
      );
      setFilteredRepairs(uniqueResults);
    } else {
      setFilteredRepairs(repairs);
    }
  }, [searchQuery, repairs, owners]);

  const loadRepairs = async () => {
    try {
      const apiRows: ApiReparacion[] = await listarReparaciones();
      const mapped: Repair[] = apiRows.map((r) => ({
        id: String(r.id),
        vehicle: {
          id: String(r.vehiculo_id),
          plate: (r as any).placa,
          brand: (r as any).marca || '',
          model: (r as any).modelo || '',
          year: (r as any).anio || new Date().getFullYear(),
          bin: (r as any).vin || undefined,
          color: undefined,
          ownerId: '',
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
        technician: (r as any).tecnico || '',
        cost: r.costo_final ?? r.costo_estimado ?? undefined,
        notes: '',
        createdAt: new Date(r.fecha_ingreso),
        updatedAt: new Date(r.fecha_ingreso),
      }));
      setRepairs(mapped);
      setFilteredRepairs(mapped);
    } catch (e: any) {
      console.error('Error cargando reparaciones desde API:', e?.message || e);
      // Si falla, deja las listas vacías (o podríamos hacer fallback a localStorage si se desea)
      setRepairs([]);
      setFilteredRepairs([]);
    }
  };

  const loadOwners = () => {
    const allOwners = getOwners();
    setOwners(allOwners);
  };

  const getOwnerByRepair = (repair: Repair): Owner | null => {
    return owners.find(owner => owner.id === repair.vehicle.ownerId) || null;
  };

  const getStatusBadge = (status: Repair['status']) => {
    switch (status) {
      case 'in-progress':
        return <Badge variant="secondary">En Proceso</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
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
                  <p className="text-2xl">{owners.length}</p>
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
                onUpdate={() => { loadRepairs(); }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
