export interface Owner {
  id: string;
  cedula: string; // Número de cédula
  name: string;
  phone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  plate: string; // Patente/Placa
  brand: string;
  model: string;
  year: number;
  bin?: string; // VIN/BIN
  color?: string;
  ownerId: string; // Referencia al propietario
}

export interface Supply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost?: number;
}

export interface Evidence {
  id: string;
  type: 'image' | 'document';
  url: string;
  description: string;
  uploadedAt: Date;
}

export interface Repair {
  id: string;
  vehicle: Vehicle;
  entryDate: Date;
  exitDate?: Date;
  problem: string;
  solution?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  supplies: Supply[];
  evidences: Evidence[];
  technician: string;
  cost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}