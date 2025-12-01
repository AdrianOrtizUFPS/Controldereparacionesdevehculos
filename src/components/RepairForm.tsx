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
import { toast } from 'sonner@2.0.3';
import { listarClientes, crearCliente, listarVehiculos, crearVehiculo, crearReparacion } from '@/utils/api';

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
    kms: ''
  });

  const [repairData, setRepairData] = useState({
    problem: '',
    technician: '',
    estimatedCost: 0
  });

  const [costs, setCosts] = useState<Array<{ id: string; description: string; amount: number }>>([]);
  const [newCost, setNewCost] = useState({ description: '', amount: 0 });
  const [existingOwner, setExistingOwner] = useState<boolean>(false);
  const [plateSearched, setPlateSearched] = useState<boolean>(false);

  // Función para buscar propietario existente por patente
  const searchOwnerByPlate = async (plate: string) => {
    if (!plate || plate.length < 3) {
      setExistingOwner(false);
      setPlateSearched(false);
      return;
    }

    try {
      const vehiculos = await listarVehiculos();
      const vehiculoEncontrado = vehiculos.find(v => v.placa.toUpperCase() === plate.toUpperCase());
      
      setPlateSearched(true);
      
      if (vehiculoEncontrado) {
        // Buscar el cliente asociado
        const clientes = await listarClientes();
        const clienteEncontrado = clientes.find(c => c.id === (vehiculoEncontrado as any).cliente_id);
        
        if (clienteEncontrado) {
          // Auto-completar datos del propietario y vehículo existente
          setOwner({
            cedula: (clienteEncontrado as any).cedula || '',
            name: clienteEncontrado.nombre || '',
            phone: clienteEncontrado.telefono || '',
            address: (clienteEncontrado as any).direccion || ''
          });
          setVehicle({
            plate: vehiculoEncontrado.placa,
            brand: vehiculoEncontrado.marca || '',
            model: vehiculoEncontrado.modelo || '',
            year: vehiculoEncontrado.anio || new Date().getFullYear(),
            bin: vehiculoEncontrado.vin || '',
            kms: (vehiculoEncontrado as any).kms || ''
          });
          setExistingOwner(true);
          toast.success('Datos del propietario y vehículo cargados automáticamente');
          return;
        }
      }
      
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
        kms: ''
      });
      setExistingOwner(false);
    } catch (error: any) {
      console.error('Error buscando vehículo:', error);
      setPlateSearched(true);
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

  const addCost = () => {
    if (!newCost.description || !newCost.amount) return;
    
    const cost = {
      id: Date.now().toString(),
      description: newCost.description,
      amount: newCost.amount
    };
    
    setCosts([...costs, cost]);
    setNewCost({ description: '', amount: 0 });
  };

  const removeCost = (id: string) => {
    setCosts(costs.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicle.plate || !vehicle.brand || !repairData.problem || !repairData.technician ||
        !owner.cedula || !owner.name || !owner.phone) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      // 1) Buscar o crear cliente por cédula
      const clientes = await listarClientes();
      let cliente = clientes.find(c => (c as any).cedula === owner.cedula);
      
      if (!cliente) {
        // Crear nuevo cliente
        cliente = await crearCliente({ 
          cedula: owner.cedula!,
          nombre: owner.name!, 
          telefono: owner.phone!, 
          email: undefined,
          direccion: owner.address || undefined
        });
        toast.success('Cliente registrado en el sistema');
      }

      // 2) Buscar o crear vehículo por placa
      let vehiculos = await listarVehiculos();
      let vehiculoRow = vehiculos.find(v => v.placa.toUpperCase() === vehicle.plate!.toUpperCase());
      
      if (!vehiculoRow) {
        // Crear nuevo vehículo asociado al cliente (usar cédula como cliente_cc)
        await crearVehiculo({
          cliente_cc: owner.cedula!,
          placa: vehicle.plate!,
          marca: vehicle.brand || undefined,
          modelo: vehicle.model || undefined,
          anio: vehicle.year || undefined,
          vin: vehicle.bin || undefined,
        });
        toast.success('Vehículo registrado en el sistema');
        
        // Recargar lista para obtener el vehículo recién creado
        vehiculos = await listarVehiculos();
        vehiculoRow = vehiculos.find(v => v.placa.toUpperCase() === vehicle.plate!.toUpperCase());
        
        if (!vehiculoRow) {
          throw new Error('No se pudo obtener el vehículo recién creado');
        }
      }

      // 3) Calcular costo estimado total de los gastos
      const totalEstimatedCost = costs.reduce((sum, cost) => sum + cost.amount, 0);

      // 4) Crear reparación en estado en_progreso (usar placa como vehiculo_id)
      await crearReparacion({
        vehiculo_id: vehiculoRow.placa,  // La FK apunta a vehiculos.placa
        cliente_id: owner.cedula!,  // La FK apunta a clientes.cedula
        descripcion: repairData.problem,
        estado: 'en_progreso',
        costo_estimado: totalEstimatedCost > 0 ? totalEstimatedCost : undefined,
        costo_final: undefined,
        fecha_salida: undefined,
        tecnico: repairData.technician,
        tipo_servicio: 'general',
        kms: vehicle.kms || undefined,
      });

      toast.success('Reparación registrada exitosamente en la base de datos');
      
      // Reset form
      setOwner({ cedula: '', name: '', phone: '', address: '' });
      setVehicle({ plate: '', brand: '', model: '', year: new Date().getFullYear(), bin: '', kms: '' });
      setRepairData({ problem: '', technician: '', estimatedCost: 0 });
      setCosts([]);
      setExistingOwner(false);
      setPlateSearched(false);
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Error guardando reparación:', err);
      toast.error(`Error al guardar: ${err?.message || 'Error desconocido'}`);
    }
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
                <Label htmlFor="kms">Kilómetros</Label>
                <Input
                  id="kms"
                  type="number"
                  value={vehicle.kms}
                  onChange={(e) => setVehicle({ ...vehicle, kms: e.target.value })}
                  placeholder="Ej: 50000"
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
            </div>
          </div>

          <Separator />

          {/* Gastos Estimados */}
          <div>
            <h3 className="mb-4">Gastos Estimados</h3>
            
            {/* Agregar nuevo gasto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input
                placeholder="Descripción del gasto"
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                className="md:col-span-1"
              />
              <Input
                type="number"
                placeholder="Valor en COP"
                min="0"
                value={newCost.amount || ''}
                onChange={(e) => setNewCost({ ...newCost, amount: parseInt(e.target.value) || 0 })}
              />
              <Button type="button" onClick={addCost} className="w-full">
                <Plus className="size-4 mr-2" />
                Agregar Gasto
              </Button>
            </div>

            {/* Lista de gastos */}
            {costs.length > 0 && (
              <div className="space-y-2">
                {costs.map((cost) => (
                  <div key={cost.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>{cost.description}</span>
                      <Badge variant="outline">
                        ${cost.amount.toLocaleString('es-CO')} COP
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCost(cost.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end p-3 bg-primary/10 rounded-lg font-semibold">
                  <span>Total Estimado: ${costs.reduce((sum, c) => sum + c.amount, 0).toLocaleString('es-CO')} COP</span>
                </div>
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