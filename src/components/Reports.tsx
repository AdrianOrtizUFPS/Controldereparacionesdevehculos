import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { obtenerReportes, ReporteItem } from '@/utils/api';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Reports() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const firstStr = firstDay.toISOString().slice(0, 10);

  const [desde, setDesde] = useState(firstStr);
  const [hasta, setHasta] = useState(todayStr);
  const [tecnico, setTecnico] = useState('');
  const [tipoServicio, setTipoServicio] = useState('');

  const [items, setItems] = useState<ReporteItem[]>([]);
  const [totalReparaciones, setTotalReparaciones] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tecnicos = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.tecnico) set.add(i.tecnico); });
    return Array.from(set);
  }, [items]);

  const tipos = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.tipo_servicio) set.add(i.tipo_servicio); });
    return Array.from(set);
  }, [items]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await obtenerReportes({ desde, hasta, tecnico: tecnico || undefined, tipo_servicio: tipoServicio || undefined });
      setItems(res.items as any);
      setTotalReparaciones(res.total_reparaciones);
      setTotalIngresos(res.total_ingresos);
    } catch (e: any) {
      setError(e?.message || 'Error cargando reportes');
      setItems([]);
      setTotalReparaciones(0);
      setTotalIngresos(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportExcel() {
    const data = items.map(i => ({
      Fecha: i.fecha_ingreso,
      Placa: (i as any).placa,
      Marca: (i as any).marca,
      Modelo: (i as any).modelo,
      Tecnico: i.tecnico || '',
      TipoServicio: i.tipo_servicio || '',
      Descripcion: i.descripcion,
      Estado: i.estado,
      CostoEstimado: i.costo_estimado ?? '',
      CostoFinal: i.costo_final ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_${desde}_a_${hasta}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const rows = items.map(i => [
      i.fecha_ingreso,
      (i as any).placa,
      (i as any).marca,
      (i as any).modelo,
      i.tecnico || '',
      i.tipo_servicio || '',
      i.descripcion,
      i.estado,
      i.costo_estimado ?? '',
      i.costo_final ?? '',
    ]);
    autoTable(doc, {
      head: [[
        'Fecha', 'Placa', 'Marca', 'Modelo', 'Técnico', 'Tipo Servicio',
        'Descripción', 'Estado', 'Costo Estimado', 'Costo Final',
      ]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] },
      startY: 10,
    });
    if (!items.length) {
      // Añadir una nota cuando no hay filas
      doc.text('No hay datos para el rango/criterios seleccionados', 14, 8);
    }
    doc.save(`reporte_${desde}_a_${hasta}.pdf`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reportes de Reparaciones e Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
            <div>
              <Label>Técnico</Label>
              <Input list="tecnicos" value={tecnico} onChange={e => setTecnico(e.target.value)} placeholder="Todos" />
              <datalist id="tecnicos">
                {tecnicos.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <Label>Tipo de Servicio</Label>
              <Input list="tipos" value={tipoServicio} onChange={e => setTipoServicio(e.target.value)} placeholder="Todos" />
              <datalist id="tipos">
                {tipos.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="flex gap-2">
              <Button onClick={load} disabled={loading} className="w-full">{loading ? 'Cargando…' : 'Aplicar'}</Button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

          <div className="mt-4 flex items-center gap-4">
            <div>Total reparaciones: <strong>{totalReparaciones}</strong></div>
            <div>Total ingresos: <strong>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(totalIngresos)}</strong></div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={exportExcel}>Exportar Excel</Button>
              <Button variant="outline" onClick={exportPDF}>Exportar PDF</Button>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tipo Servicio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Costo Estimado</TableHead>
                  <TableHead>Costo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.fecha_ingreso}</TableCell>
                    <TableCell>{(i as any).placa}</TableCell>
                    <TableCell>{(i as any).marca}</TableCell>
                    <TableCell>{(i as any).modelo}</TableCell>
                    <TableCell>{i.tecnico || ''}</TableCell>
                    <TableCell>{i.tipo_servicio || ''}</TableCell>
                    <TableCell className="max-w-[400px] truncate" title={i.descripcion}>{i.descripcion}</TableCell>
                    <TableCell>{i.estado}</TableCell>
                    <TableCell>{i.costo_estimado ?? ''}</TableCell>
                    <TableCell>{i.costo_final ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
