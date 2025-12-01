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
import { toast } from 'sonner';
import { actualizarReparacion, listarClientes, Cliente, listarImagenesReparacion, subirImagenReparacion, eliminarImagenReparacion, ImagenReparacion } from '@/utils/api';
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
  const [imagenes, setImagenes] = useState<ImagenReparacion[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [exitDate, setExitDate] = useState<string>('');
  const [exitTime, setExitTime] = useState<string>('');

  // Sincronizar editedRepair cuando cambia repair
  useEffect(() => {
    console.log('🔄 useEffect sync - repair.exitDate:', repair.exitDate);
    setEditedRepair(repair);
    
    // Inicializar inputs de fecha y hora por separado
    if (repair.exitDate) {
      if (typeof repair.exitDate === 'string') {
        const [datePart, timePart] = repair.exitDate.split(' ');
        setExitDate(datePart || '');
        setExitTime(timePart ? timePart.slice(0, 5) : '');
      } else if (repair.exitDate instanceof Date && !isNaN(repair.exitDate.getTime())) {
        const d = repair.exitDate;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setExitDate(`${year}-${month}-${day}`);
        setExitTime(`${hours}:${minutes}`);
      }
    } else {
      setExitDate('');
      setExitTime('');
    }
  }, [repair]);

  // Cargar datos del propietario y las imágenes desde la base de datos
  useEffect(() => {
    const loadOwner = async () => {
      try {
        const clients = await listarClientes();
        const client = clients.find(c => (c as any).cedula === repair.vehicle.ownerId);
        if (client) {
          setOwner({
            id: (client as any).cedula || '',
            cedula: (client as any).cedula || '',
            name: client.nombre || '',
            phone: client.telefono || '',
            address: (client as any).direccion || ''
          });
        }
      } catch (e) {
        console.error('Error cargando propietario:', e);
      }
    };
    const loadImagenes = async () => {
      try {
        const imgs = await listarImagenesReparacion(Number(repair.id));
        setImagenes(imgs);
      } catch (e) {
        console.error('Error cargando imágenes:', e);
      }
    };
    loadOwner();
    loadImagenes();
  }, [repair.vehicle.ownerId, repair.id]);

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
        return (
          <span 
            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium border"
            style={{ backgroundColor: '#e5e7eb', color: '#111827', borderColor: '#d1d5db' }}
          >
            En Proceso
          </span>
        );
      case 'completed':
        return (
          <span 
            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
          >
            Completado
          </span>
        );
      case 'cancelled':
        return (
          <span 
            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
          >
            Cancelado
          </span>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const handleSave = async () => {
    try {
      console.log('💾 handleSave - exitDate:', exitDate, 'exitTime:', exitTime);
      
      const estadoApi = editedRepair.status === 'completed' 
        ? 'completada'
        : editedRepair.status === 'cancelled'
          ? 'cancelada'
          : 'en_progreso';

      // Combinar fecha y hora si ambas están presentes
      let exitDateToUse = null;
      if (exitDate && exitTime) {
        exitDateToUse = `${exitDate}T${exitTime}`;
        console.log('🔍 DEBUG FECHA - combinada:', exitDateToUse);
      } else if (exitDate) {
        exitDateToUse = `${exitDate}T00:00`;
        console.log('🔍 DEBUG FECHA - solo fecha (00:00):', exitDateToUse);
      } else {
        exitDateToUse = editedRepair.exitDate;
        console.log('🔍 DEBUG FECHA - usando existente:', exitDateToUse);
      }
      
      // Formatear fecha_salida: mantener hora local sin conversión UTC
      let fechaSalida = null;
      if (exitDateToUse) {
        if (typeof exitDateToUse === 'string') {
          // Validar que no sea cadena vacía
          const trimmed = exitDateToUse.trim();
          if (trimmed) {
            // Del input datetime-local: "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:ss"
            fechaSalida = trimmed.replace('T', ' ') + ':00';
            console.log('✅ Fecha desde STRING:', fechaSalida);
          }
        } else if (exitDateToUse instanceof Date && !isNaN(exitDateToUse.getTime())) {
          // De Date object válido: extraer componentes locales
          const year = exitDateToUse.getFullYear();
          const month = String(exitDateToUse.getMonth() + 1).padStart(2, '0');
          const day = String(exitDateToUse.getDate()).padStart(2, '0');
          const hours = String(exitDateToUse.getHours()).padStart(2, '0');
          const minutes = String(exitDateToUse.getMinutes()).padStart(2, '0');
          fechaSalida = `${year}-${month}-${day} ${hours}:${minutes}:00`;
          console.log('✅ Fecha desde DATE:', fechaSalida);
        }
      }
      
      console.log('📤 Fecha final a enviar:', fechaSalida);

      const updateData: any = {
        descripcion: editedRepair.problem,
        estado: estadoApi,
        costo_final: editedRepair.cost || 0
      };

      // Solo incluir fecha_salida si hay un valor válido
      if (fechaSalida) {
        updateData.fecha_salida = fechaSalida;
      }

      await actualizarReparacion(Number(editedRepair.id), updateData);
      
      setIsEditing(false);
      toast.success('Reparación actualizada exitosamente');
      onUpdate?.();
    } catch (e: any) {
      console.error('Error actualizando reparación:', e);
      toast.error(`Error al actualizar: ${e?.message || 'Error desconocido'}`);
    }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Convertir imagen a base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const base64Data = base64.split(',')[1]; // Remover el prefijo "data:image/...;base64,"

          const nuevaImagen = await subirImagenReparacion(Number(repair.id), {
            nombre_archivo: file.name,
            tipo_mime: file.type,
            tamano_bytes: file.size,
            datos_base64: base64Data,
            descripcion: ''
          });

          setImagenes(prev => [nuevaImagen, ...prev]);
          toast.success('Imagen subida exitosamente');
          
          // Resetear input
          e.target.value = '';
        } catch (error: any) {
          console.error('Error subiendo imagen:', error);
          toast.error(`Error al subir imagen: ${error?.message || 'Error desconocido'}`);
        } finally {
          setUploadingImage(false);
        }
      };
      reader.onerror = () => {
        toast.error('Error al leer el archivo');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error procesando imagen:', error);
      toast.error(`Error: ${error?.message || 'Error desconocido'}`);
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imagenId: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta imagen? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await eliminarImagenReparacion(Number(repair.id), imagenId);
      setImagenes(prev => prev.filter(img => img.id !== imagenId));
      toast.success('Imagen eliminada');
    } catch (error: any) {
      console.error('Error eliminando imagen:', error);
      toast.error(`Error al eliminar: ${error?.message || 'Error desconocido'}`);
    }
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
            <Button onClick={() => {
              console.log('✏️ Editar clicked - repair.exitDate:', repair.exitDate, 'editedRepair.exitDate:', editedRepair.exitDate);
              setIsEditing(true);
            }} variant="outline" size="sm">
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
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <div>
              <Label>Fecha de Salida</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="date"
                        value={exitDate}
                        onChange={(e) => {
                          console.log('📅 Fecha onChange:', e.target.value);
                          setExitDate(e.target.value);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="time"
                        value={exitTime}
                        onChange={(e) => {
                          console.log('⏰ Hora onChange:', e.target.value);
                          setExitTime(e.target.value);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deja vacío para mantener sin fecha de salida
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span>
                    {currentRepair.exitDate ? formatDate(currentRepair.exitDate) : 'Sin fecha de salida'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Descripción del Problema y Costos */}
      <Card>
        <CardHeader>
          <CardTitle>Descripción del Problema y Costos</CardTitle>
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
            <Label>Técnico Responsable</Label>
            <div className="flex items-center gap-2 mt-1">
              <User className="size-4 text-muted-foreground" />
              <span>{currentRepair.technician}</span>
            </div>
          </div>
          <div>
            <Label>Costo Final (COP)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={editedRepair.cost || ''}
                onChange={(e) => setEditedRepair({
                  ...editedRepair,
                  cost: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="Ingrese el costo final"
              />
            ) : (
              <p className="mt-1 p-3 bg-muted rounded-lg">
                {currentRepair.cost ? `$${currentRepair.cost.toLocaleString('es-CO')} COP` : 'No especificado'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Imágenes de la Base de Datos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="size-5" />
            Imágenes de la Reparación
          </CardTitle>
          <CardDescription>
            Imágenes almacenadas en la base de datos (máximo 5MB por imagen)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="image-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-muted transition-colors">
                <Plus className="size-5" />
                <span>{uploadingImage ? 'Subiendo imagen...' : 'Seleccionar imagen para subir'}</span>
              </div>
            </Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
          </div>

          {imagenes.length === 0 ? (
            <p className="text-muted-foreground">No hay imágenes almacenadas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imagenes.map((imagen) => (
                <div key={imagen.id} className="relative group">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                    <img
                      src={`data:${imagen.tipo_mime};base64,${imagen.datos_base64}`}
                      alt={imagen.nombre_archivo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium truncate">{imagen.nombre_archivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(imagen.creado_en))} · {(imagen.tamano_bytes / 1024).toFixed(1)} KB
                    </p>
                    {imagen.descripcion && (
                      <p className="text-xs mt-1">{imagen.descripcion}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteImage(imagen.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}