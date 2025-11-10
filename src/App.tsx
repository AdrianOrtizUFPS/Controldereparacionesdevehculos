import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Wrench, Plus, History, Search, Car } from 'lucide-react';
import { RepairForm } from './components/RepairForm';
import { RepairHistory } from './components/RepairHistory';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState('history');

  const handleRepairSuccess = () => {
    // Switch to history tab after successful registration
    setActiveTab('history');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Wrench className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sistema de Control de Reparaciones</h1>
              <p className="text-muted-foreground">
                Gestión integral de reparaciones de vehículos
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="size-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="new-repair" className="flex items-center gap-2">
              <Plus className="size-4" />
              Nueva Reparación
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview - Only shown on history tab */}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Funcionalidades Principales
                  </CardTitle>
                  <Car className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Registro de reparaciones
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Historial completo
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Búsqueda por patente/BIN
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Control de insumos
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Anexo de evidencias
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Acceso Rápido
                  </CardTitle>
                  <Plus className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setActiveTab('new-repair')}
                    className="w-full"
                  >
                    <Plus className="size-4 mr-2" />
                    Registrar Nueva Reparación
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Información
                  </CardTitle>
                  <Search className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Busque reparaciones por patente, marca, modelo o número VIN/BIN.
                    Todos los datos se guardan localmente en su navegador.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab Contents */}
          <TabsContent value="history" className="space-y-6">
            <RepairHistory />
          </TabsContent>

          <TabsContent value="new-repair" className="space-y-6">
            <RepairForm onSuccess={handleRepairSuccess} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}