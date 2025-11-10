import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Car, 
  Calendar, 
  User, 
  Package, 
  FileImage, 
  Edit, 
  Save, 
  X,
  Plus,
  Trash2,
  Clock,
  UserCheck
} from 'lucide-react';
import { Repair, Supply, Evidence, Owner } from '../types/repair';
import { updateRepair, getOwners } from '../utils/storage';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface RepairDetailsProps {
  repair: Repair;
  onUpdate?: () => void;
}

export function RepairDetails({ repair, onUpdate }: RepairDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRepair, setEditedRepair] = useState<Repair>(repair);
  const [newSupply, setNewSupply] = useState({ name: '', quantity: 1, unit: '', cost: 0 });
  const [newEvidence, setNewEvidence] = useState({ url: '', description: '' });
  const [owner, setOwner] = useState<Owner | null>(null);

  // Cargar datos del propietario
  useEffect(() => {
    const owners = getOwners();
    const vehicleOwner = owners.find(o => o.id === repair.vehicle.ownerId);
    setOwner(vehicleOwner || null);
  }, [repair.vehicle.ownerId]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  const handleSave = () => {
    const updated = {
      ...editedRepair,
      updatedAt: new Date()
    };
    
    updateRepair(updated);
    setIsEditing(false);
    toast.success('Reparación actualizada exitosamente');
    onUpdate?.();
  };

  const addSupply = () => {
    if (!newSupply.name || !newSupply.unit) return;
    
    const supply: Supply = {
      id: Date.now().toString(),
      name: newSupply.name,
      quantity: newSupply.quantity,
      unit: newSupply.unit,
      cost: newSupply.cost || 0
    };
    
    setEditedRepair({
      ...editedRepair,
      supplies: [...editedRepair.supplies, supply]
    });
    setNewSupply({ name: '', quantity: 1, unit: '', cost: 0 });
  };

  const removeSupply = (id: string) => {
    setEditedRepair({
      ...editedRepair,
      supplies: editedRepair.supplies.filter(s => s.id !== id)
    });
  };

  const addEvidence = () => {
    if (!newEvidence.url) return;
    
    const evidence: Evidence = {
      id: Date.now().toString(),
      type: 'image',
      url: newEvidence.url,
      description: newEvidence.description,
      uploadedAt: new Date()
    };
    
    setEditedRepair({
      ...editedRepair,
      evidences: [...editedRepair.evidences, evidence]
    });
    setNewEvidence({ url: '', description: '' });
  };

  const removeEvidence = (id: string) => {
    setEditedRepair({
      ...editedRepair,
      evidences: editedRepair.evidences.filter(e => e.id !== id)
    });
  };

  const currentRepair = isEditing ? editedRepair : repair;

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Reparación #{repair.id}</h2>
          <p className="text-muted-foreground">
            Creado el {formatDate(repair.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} size="sm">
                <Save className="size-4 mr-2" />
                Guardar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setEditedRepair(repair);
                }} 
                size="sm"
              >
                <X className="size-4 mr-2" />
                Cancelar
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit className="size-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Información del Propietario */}
      {owner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5" />
              Información del Propietario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Nombre</Label>
                <p>{owner.name}</p>
              </div>
              <div>
                <Label>Cédula</Label>
                <p className="font-mono">{owner.cedula}</p>
              </div>
              <div>
                <Label>Teléfono</Label>
                <p>{owner.phone}</p>
              </div>
              <div>
                <Label>Dirección</Label>
                <p>{owner.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del Vehículo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="size-5" />
            Información del Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Patente/Placa</Label>
              <p className="font-mono text-lg">{currentRepair.vehicle.plate}</p>
            </div>
            <div>
              <Label>Marca y Modelo</Label>
              <p>{currentRepair.vehicle.brand} {currentRepair.vehicle.model}</p>
            </div>
            <div>
              <Label>Año</Label>
              <p>{currentRepair.vehicle.year}</p>
            </div>
            {currentRepair.vehicle.bin && (
              <div>
                <Label>VIN/BIN</Label>
                <p className="font-mono">{currentRepair.vehicle.bin}</p>
              </div>
            )}
            {currentRepair.vehicle.color && (
              <div>
                <Label>Color</Label>
                <p>{currentRepair.vehicle.color}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estado y Fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Estado y Fechas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Estado</Label>
              {isEditing ? (
                <Select 
                  value={editedRepair.status} 
                  onValueChange={(value) => setEditedRepair({
                    ...editedRepair, 
                    status: value as Repair['status']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-progress">En Proceso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  {getStatusBadge(currentRepair.status)}
                </div>
              )}
            </div>
            <div>
              <Label>Fecha de Ingreso</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="size-4 text-muted-foreground" />
                <span>{formatDate(currentRepair.entryDate)}</span>
              </div>
            </div>
            <div>
              <Label>Fecha de Salida</Label>
              {isEditing ? (
                <Input
                  type="datetime-local"
                  value={editedRepair.exitDate ? 
                    editedRepair.exitDate.toISOString().slice(0, 16) : ''
                  }
                  onChange={(e) => setEditedRepair({
                    ...editedRepair,
                    exitDate: e.target.value ? new Date(e.target.value) : undefined
                  })}
                />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span>
                    {currentRepair.exitDate ? 
                      formatDate(currentRepair.exitDate) : 
                      'En proceso'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Descripción del Problema y Solución */}
      <Card>
        <CardHeader>
          <CardTitle>Descripción del Problema y Solución</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Problema Reportado</Label>
            {isEditing ? (
              <Textarea
                value={editedRepair.problem}
                onChange={(e) => setEditedRepair({
                  ...editedRepair,
                  problem: e.target.value
                })}
                rows={3}
              />
            ) : (
              <p className="mt-1 p-3 bg-muted rounded-lg">{currentRepair.problem}</p>
            )}
          </div>
          <div>
            <Label>Solución Aplicada</Label>
            {isEditing ? (
              <Textarea
                value={editedRepair.solution || ''}
                onChange={(e) => setEditedRepair({
                  ...editedRepair,
                  solution: e.target.value
                })}
                placeholder="Describa la solución aplicada..."
                rows={3}
              />
            ) : (
              <p className="mt-1 p-3 bg-muted rounded-lg">
                {currentRepair.solution || 'No se ha registrado solución aún'}
              </p>
            )}
          </div>
          <div>
            <Label>Técnico Responsable</Label>
            <div className="flex items-center gap-2 mt-1">
              <User className="size-4 text-muted-foreground" />
              <span>{currentRepair.technician}</span>
            </div>
          </div>
          {currentRepair.notes && (
            <div>
              <Label>Notas Adicionales</Label>
              {isEditing ? (
                <Textarea
                  value={editedRepair.notes || ''}
                  onChange={(e) => setEditedRepair({
                    ...editedRepair,
                    notes: e.target.value
                  })}
                  rows={2}
                />
              ) : (
                <p className="mt-1 p-3 bg-muted rounded-lg">{currentRepair.notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insumos Utilizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Insumos Utilizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 p-4 bg-muted rounded-lg">
              <Input
                placeholder="Nombre del insumo"
                value={newSupply.name}
                onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Cantidad"
                min="1"
                value={newSupply.quantity}
                onChange={(e) => setNewSupply({ ...newSupply, quantity: parseInt(e.target.value) || 1 })}
              />
              <Input
                placeholder="Unidad"
                value={newSupply.unit}
                onChange={(e) => setNewSupply({ ...newSupply, unit: e.target.value })}
              />
              <Button onClick={addSupply} size="sm">
                <Plus className="size-4 mr-2" />
                Agregar
              </Button>
            </div>
          )}
          
          {currentRepair.supplies.length === 0 ? (
            <p className="text-muted-foreground">No se han registrado insumos</p>
          ) : (
            <div className="space-y-2">
              {currentRepair.supplies.map((supply) => (
                <div key={supply.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {supply.quantity} {supply.unit}
                    </Badge>
                    <span>{supply.name}</span>
                    {supply.cost && supply.cost > 0 && (
                      <span className="text-sm text-muted-foreground">
                        (${supply.cost.toFixed(2)})
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSupply(supply.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="size-5" />
            Evidencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 p-4 bg-muted rounded-lg">
              <Input
                placeholder="URL de la imagen"
                value={newEvidence.url}
                onChange={(e) => setNewEvidence({ ...newEvidence, url: e.target.value })}
              />
              <Input
                placeholder="Descripción"
                value={newEvidence.description}
                onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
              />
              <Button onClick={addEvidence} size="sm">
                <Plus className="size-4 mr-2" />
                Agregar
              </Button>
            </div>
          )}
          
          {currentRepair.evidences.length === 0 ? (
            <p className="text-muted-foreground">No se han agregado evidencias</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentRepair.evidences.map((evidence) => (
                <div key={evidence.id} className="relative">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={evidence.url}
                      alt={evidence.description}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm">{evidence.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(evidence.uploadedAt)}
                    </p>
                  </div>
                  {isEditing && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeEvidence(evidence.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}