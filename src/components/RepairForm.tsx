import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, X, Upload, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Repair, Vehicle, Supply, Evidence, Owner } from '../types/repair';
import { addRepair, addOwner, getOwnerByPlate } from '../utils/storage';
import { toast } from 'sonner@2.0.3';

interface RepairFormProps {
  onSuccess?: () => void;
}

export function RepairForm({ onSuccess }: RepairFormProps) {
  const [owner, setOwner] = useState<Partial<Owner>>({
    cedula: '',
    name: '',
    phone: '',
    address: ''
  });

  const [vehicle, setVehicle] = useState<Partial<Vehicle>>({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    bin: '',
    color: ''
  });

  const [repairData, setRepairData] = useState({
    problem: '',
    technician: '',
    notes: ''
  });

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [newSupply, setNewSupply] = useState({ name: '', quantity: 1, unit: '', cost: 0 });
  const [existingOwner, setExistingOwner] = useState<boolean>(false);
  const [plateSearched, setPlateSearched] = useState<boolean>(false);

  // Función para buscar propietario existente por patente
  const searchOwnerByPlate = async (plate: string) => {
    if (!plate || plate.length < 3) {
      setExistingOwner(false);
      setPlateSearched(false);
      return;
    }

    const result = getOwnerByPlate(plate);
    setPlateSearched(true);
    
    if (result) {
      // Auto-completar datos del propietario y vehículo existente
      setOwner(result.owner);
      setVehicle({
        plate: result.vehicle.plate,
        brand: result.vehicle.brand,
        model: result.vehicle.model,
        year: result.vehicle.year,
        bin: result.vehicle.bin,
        color: result.vehicle.color
      });
      setExistingOwner(true);
      toast.success('Datos del propietario y vehículo cargados automáticamente');
    } else {
      // Limpiar datos si no se encuentra el propietario
      setOwner({
        cedula: '',
        name: '',
        phone: '',
        address: ''
      });
      setVehicle({
        ...vehicle,
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        bin: '',
        color: ''
      });
      setExistingOwner(false);
    }
  };

  // Efecto para buscar propietario cuando cambia la patente
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (vehicle.plate) {
        searchOwnerByPlate(vehicle.plate);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [vehicle.plate]);

  const addSupply = () => {
    if (!newSupply.name || !newSupply.unit) return;
    
    const supply: Supply = {
      id: Date.now().toString(),
      name: newSupply.name,
      quantity: newSupply.quantity,
      unit: newSupply.unit,
      cost: newSupply.cost || 0
    };
    
    setSupplies([...supplies, supply]);
    setNewSupply({ name: '', quantity: 1, unit: '', cost: 0 });
  };

  const removeSupply = (id: string) => {
    setSupplies(supplies.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicle.plate || !vehicle.brand || !repairData.problem || !repairData.technician ||
        !owner.cedula || !owner.name || !owner.phone || !owner.address) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    // Crear o usar propietario existente
    let ownerId = '';
    
    if (!existingOwner) {
      // Crear nuevo propietario
      const newOwner: Owner = {
        id: Date.now().toString(),
        cedula: owner.cedula!,
        name: owner.name!,
        phone: owner.phone!,
        address: owner.address!,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      addOwner(newOwner);
      ownerId = newOwner.id;
    } else {
      ownerId = (owner as Owner).id;
    }

    const repair: Repair = {
      id: Date.now().toString(),
      vehicle: {
        id: Date.now().toString(),
        plate: vehicle.plate!,
        brand: vehicle.brand!,
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        bin: vehicle.bin,
        color: vehicle.color,
        ownerId: ownerId
      },
      entryDate: new Date(),
      problem: repairData.problem,
      status: 'in-progress',
      supplies,
      evidences: [],
      technician: repairData.technician,
      notes: repairData.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    addRepair(repair);
    toast.success('Reparación registrada exitosamente');
    
    // Reset form
    setOwner({ cedula: '', name: '', phone: '', address: '' });
    setVehicle({ plate: '', brand: '', model: '', year: new Date().getFullYear(), bin: '', color: '' });
    setRepairData({ problem: '', technician: '', notes: '' });
    setSupplies([]);
    setExistingOwner(false);
    setPlateSearched(false);
    
    onSuccess?.();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Registrar Nueva Reparación</CardTitle>
        <CardDescription>
          Complete los datos del vehículo, propietario y la reparación a realizar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Vehículo */}
          <div>
            <h3 className="mb-4">Datos del Vehículo</h3>
            
            {/* Alert para mostrar estado de búsqueda */}
            {plateSearched && (
              <Alert className="mb-4">
                {existingOwner ? (
                  <>
                    <CheckCircle className="size-4" />
                    <AlertDescription>
                      Vehículo encontrado en el sistema. Los datos del propietario se han cargado automáticamente.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                      Vehículo nuevo en el taller. Por favor complete todos los datos del propietario.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="plate">Patente/Placa *</Label>
                <Input
                  id="plate"
                  value={vehicle.plate}
                  onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-123"
                  required
                />
              </div>
              <div>
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={vehicle.brand}
                  onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
                  placeholder="Toyota, Ford, etc."
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                  placeholder="Corolla, Focus, etc."
                />
              </div>
              <div>
                <Label htmlFor="year">Año</Label>
                <Input
                  id="year"
                  type="number"
                  value={vehicle.year}
                  onChange={(e) => setVehicle({ ...vehicle, year: parseInt(e.target.value) })}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <Label htmlFor="bin">VIN/BIN</Label>
                <Input
                  id="bin"
                  value={vehicle.bin}
                  onChange={(e) => setVehicle({ ...vehicle, bin: e.target.value.toUpperCase() })}
                  placeholder="Número de identificación"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={vehicle.color}
                  onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                  placeholder="Blanco, Negro, etc."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Datos del Propietario */}
          <div>
            <h3 className="mb-4 flex items-center gap-2">
              <User className="size-5" />
              Datos del Propietario
              {existingOwner && <Badge variant="secondary">Existente</Badge>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cedula">Número de Cédula *</Label>
                <Input
                  id="cedula"
                  value={owner.cedula}
                  onChange={(e) => setOwner({ ...owner, cedula: e.target.value })}
                  placeholder="12345678901"
                  required
                  disabled={existingOwner}
                />
              </div>
              <div>
                <Label htmlFor="ownerName">Nombre Completo *</Label>
                <Input
                  id="ownerName"
                  value={owner.name}
                  onChange={(e) => setOwner({ ...owner, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                  disabled={existingOwner}
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={owner.phone}
                  onChange={(e) => setOwner({ ...owner, phone: e.target.value })}
                  placeholder="+593 99 123 4567"
                  required
                  disabled={existingOwner}
                />
              </div>
              <div>
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={owner.address}
                  onChange={(e) => setOwner({ ...owner, address: e.target.value })}
                  placeholder="Av. Principal 123, Ciudad"
                  required
                  disabled={existingOwner}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Datos de la Reparación */}
          <div>
            <h3 className="mb-4">Datos de la Reparación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="problem">Descripción del Problema *</Label>
                <Textarea
                  id="problem"
                  value={repairData.problem}
                  onChange={(e) => setRepairData({ ...repairData, problem: e.target.value })}
                  placeholder="Describa detalladamente el problema reportado..."
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="technician">Técnico Responsable *</Label>
                <Input
                  id="technician"
                  value={repairData.technician}
                  onChange={(e) => setRepairData({ ...repairData, technician: e.target.value })}
                  placeholder="Nombre del técnico"
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={repairData.notes}
                  onChange={(e) => setRepairData({ ...repairData, notes: e.target.value })}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Insumos */}
          <div>
            <h3 className="mb-4">Insumos Utilizados</h3>
            
            {/* Agregar nuevo insumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
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
                placeholder="Unidad (ej: litros, piezas)"
                value={newSupply.unit}
                onChange={(e) => setNewSupply({ ...newSupply, unit: e.target.value })}
              />
              <Button type="button" onClick={addSupply} className="w-full">
                <Plus className="size-4 mr-2" />
                Agregar
              </Button>
            </div>

            {/* Lista de insumos */}
            {supplies.length > 0 && (
              <div className="space-y-2">
                {supplies.map((supply) => (
                  <div key={supply.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {supply.quantity} {supply.unit}
                      </Badge>
                      <span>{supply.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSupply(supply.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit">
              Registrar Reparación
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}