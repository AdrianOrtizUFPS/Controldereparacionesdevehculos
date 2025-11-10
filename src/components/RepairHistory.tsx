import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Search, Eye, Calendar, User, Wrench, UserCheck } from 'lucide-react';
import { Repair, Owner } from '../types/repair';
import { getRepairs, searchRepairs, getOwners } from '../utils/storage';
import { RepairDetails } from './RepairDetails';

export function RepairHistory() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRepairs, setFilteredRepairs] = useState<Repair[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);

  useEffect(() => {
    loadRepairs();
    loadOwners();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      // Buscar en reparaciones y también en datos de propietarios
      const repairResults = searchRepairs(searchQuery);
      const ownerResults = owners.filter(owner => 
        owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.cedula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.phone.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Agregar reparaciones de propietarios encontrados
      const ownerRepairs = repairs.filter(repair => 
        ownerResults.some(owner => owner.id === repair.vehicle.ownerId)
      );
      
      // Combinar resultados y eliminar duplicados
      const allResults = [...repairResults, ...ownerRepairs];
      const uniqueResults = allResults.filter((repair, index, self) => 
        index === self.findIndex(r => r.id === repair.id)
      );
      
      setFilteredRepairs(uniqueResults);
    } else {
      setFilteredRepairs(repairs);
    }
  }, [searchQuery, repairs, owners]);

  const loadRepairs = () => {
    const allRepairs = getRepairs();
    setRepairs(allRepairs);
    setFilteredRepairs(allRepairs);
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRepair(repair)}
                            >
                              <Eye className="size-4 mr-2" />
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Detalles de Reparación - {repair.vehicle.plate}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedRepair && (
                              <RepairDetails 
                                repair={selectedRepair} 
                                onUpdate={loadRepairs}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
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
    </div>
  );
}