import { Repair, Owner } from '../types/repair';

const STORAGE_KEY = 'vehicle-repairs';
const OWNERS_STORAGE_KEY = 'vehicle-owners';

export const getRepairs = (): Repair[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const repairs = JSON.parse(stored);
    return repairs.map((repair: any) => ({
      ...repair,
      entryDate: new Date(repair.entryDate),
      exitDate: repair.exitDate ? new Date(repair.exitDate) : undefined,
      createdAt: new Date(repair.createdAt),
      updatedAt: new Date(repair.updatedAt),
      evidences: repair.evidences.map((evidence: any) => ({
        ...evidence,
        uploadedAt: new Date(evidence.uploadedAt)
      }))
    }));
  } catch {
    return [];
  }
};

export const saveRepairs = (repairs: Repair[]): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repairs));
};

export const addRepair = (repair: Repair): void => {
  const repairs = getRepairs();
  repairs.push(repair);
  saveRepairs(repairs);
};

export const updateRepair = (updatedRepair: Repair): void => {
  const repairs = getRepairs();
  const index = repairs.findIndex(r => r.id === updatedRepair.id);
  if (index !== -1) {
    repairs[index] = updatedRepair;
    saveRepairs(repairs);
  }
};

export const deleteRepair = (repairId: string): void => {
  const repairs = getRepairs();
  const filtered = repairs.filter(r => r.id !== repairId);
  saveRepairs(filtered);
};

export const searchRepairs = (query: string): Repair[] => {
  const repairs = getRepairs();
  const lowercaseQuery = query.toLowerCase();
  
  return repairs.filter(repair => 
    repair.vehicle.plate.toLowerCase().includes(lowercaseQuery) ||
    repair.vehicle.bin?.toLowerCase().includes(lowercaseQuery) ||
    repair.vehicle.brand.toLowerCase().includes(lowercaseQuery) ||
    repair.vehicle.model.toLowerCase().includes(lowercaseQuery)
  );
};

export const getOwners = (): Owner[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(OWNERS_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const owners = JSON.parse(stored);
    return owners.map((owner: any) => ({
      ...owner,
      createdAt: new Date(owner.createdAt),
      updatedAt: new Date(owner.updatedAt),
    }));
  } catch {
    return [];
  }
};

export const saveOwners = (owners: Owner[]): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(owners));
};

export const addOwner = (owner: Owner): void => {
  const owners = getOwners();
  owners.push(owner);
  saveOwners(owners);
};

export const updateOwner = (updatedOwner: Owner): void => {
  const owners = getOwners();
  const index = owners.findIndex(o => o.id === updatedOwner.id);
  if (index !== -1) {
    owners[index] = updatedOwner;
    saveOwners(owners);
  }
};

export const deleteOwner = (ownerId: string): void => {
  const owners = getOwners();
  const filtered = owners.filter(o => o.id !== ownerId);
  saveOwners(filtered);
};

export const searchOwners = (query: string): Owner[] => {
  const owners = getOwners();
  const lowercaseQuery = query.toLowerCase();
  
  return owners.filter(owner => 
    owner.name.toLowerCase().includes(lowercaseQuery) ||
    owner.cedula.toLowerCase().includes(lowercaseQuery) ||
    owner.phone.toLowerCase().includes(lowercaseQuery)
  );
};

// Función para buscar propietario por patente de vehículo
export const getOwnerByPlate = (plate: string): { owner: Owner; vehicle: { plate: string; brand: string; model: string; year: number; bin?: string; color?: string } } | null => {
  const repairs = getRepairs();
  const owners = getOwners();
  
  // Buscar en reparaciones la patente
  const repair = repairs.find(r => r.vehicle.plate.toLowerCase() === plate.toLowerCase());
  if (!repair) return null;
  
  // Buscar el propietario
  const owner = owners.find(o => o.id === repair.vehicle.ownerId);
  if (!owner) return null;
  
  return {
    owner,
    vehicle: {
      plate: repair.vehicle.plate,
      brand: repair.vehicle.brand,
      model: repair.vehicle.model,
      year: repair.vehicle.year,
      bin: repair.vehicle.bin,
      color: repair.vehicle.color
    }
  };
};