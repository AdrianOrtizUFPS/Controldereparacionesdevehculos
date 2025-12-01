import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { obtenerReportes, ReporteItem } from '@/utils/api';

import ExcelJS from 'exceljs';
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
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cliente, setCliente] = useState('');

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
      const res = await obtenerReportes({ 
        desde, 
        hasta, 
        tecnico: tecnico || undefined, 
        tipo_servicio: tipoServicio || undefined,
        placa: placa || undefined,
        marca: marca || undefined,
        modelo: modelo || undefined,
        cliente: cliente || undefined
      });
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

  async function exportExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Cargar y agregar la imagen del logo
    try {
      const response = await fetch('/src/utils/22.2 test.png');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      const imageId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });

      // Agregar imagen en la esquina superior derecha
      worksheet.addImage(imageId, {
        tl: { col: 11, row: 0 },
        ext: { width: 200, height: 60 },
      });
    } catch (e) {
      console.error('Error cargando imagen:', e);
    }

    // Título en la primera fila
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Reporte de Reparaciones e Ingresos Taller Casautos Cero';
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Fila vacía
    worksheet.addRow([]);

    // Encabezados
    const headerRow = worksheet.addRow([
      'F. Ingreso', 'F. Salida', 'Placa', 'Marca', 'Modelo', 'Cliente', 'Cédula',
      'Técnico', 'Tipo Servicio', 'Descripción', 'Estado', 'C. Estimado', 'C. Final'
    ]);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Datos
    items.forEach(i => {
      worksheet.addRow([
        i.fecha_ingreso,
        (i as any).fecha_salida || '',
        (i as any).placa,
        (i as any).marca,
        (i as any).modelo,
        (i as any).cliente_nombre || '',
        (i as any).cliente_cedula || '',
        i.tecnico || '',
        i.tipo_servicio || '',
        i.descripcion,
        i.estado,
        i.costo_estimado ?? '',
        i.costo_final ?? '',
      ]);
    });

    // Fila de totales
    const totalRow = worksheet.addRow([
      '', '', '', '', '', '', '', '', '', 'TOTAL INGRESOS:', '', '',
      `$${totalIngresos.toLocaleString('es-CO')}`
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCDCDC' }
    };

    // Ancho de columnas
    worksheet.columns = [
      { width: 12 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 },
      { width: 20 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 30 },
      { width: 12 }, { width: 12 }, { width: 12 }
    ];

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blobFile = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blobFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${desde}_a_${hasta}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Agregar título
    doc.text('Reporte de Reparaciones e Ingresos Taller Casautos Cero', 14, 12);
    
    // Agregar imagen al lado derecho del título
    const image = new Image();
    image.src = 'src\\utils\\22.2 test.png';
    doc.addImage(image, 'PNG', 240, 5, 50, 15);
    
    const rows = items.map(i => [
      i.fecha_ingreso,
      (i as any).fecha_salida || '',
      (i as any).placa,
      (i as any).marca,
      (i as any).modelo,
      (i as any).cliente_nombre || '',
      i.tecnico || '',
      i.tipo_servicio || '',
      i.descripcion,
      i.estado,
      i.costo_estimado ?? '',
      i.costo_final ?? '',
    ]);
    
    autoTable(doc, {
      head: [[
        'F. Ingreso', 'F. Salida', 'Placa', 'Marca', 'Modelo', 'Cliente', 'Técnico', 'Tipo Servicio',
        'Descripción', 'Estado', 'C. Estimado', 'C. Final',
      ]],
      body: rows,
      foot: [[
        '', '', '', '', '', '', '', '', '', 'TOTAL INGRESOS:', '', 
        `$${totalIngresos.toLocaleString('es-CO')}`
      ]],
      styles: { fontSize: 7 },
      headStyles: { fillColor: [33, 150, 243] },
      footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
      startY: 22,
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
            <div>
              <Label>Placa</Label>
              <Input value={placa} onChange={e => setPlaca(e.target.value)} placeholder="Buscar por placa" />
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={marca} onChange={e => setMarca(e.target.value)} placeholder="Buscar por marca" />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Buscar por modelo" />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre o cédula" />
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
          </div>
          <div className="mt-3">
            <Button onClick={load} disabled={loading} className="w-full md:w-auto">{loading ? 'Cargando…' : 'Aplicar Filtros'}</Button>
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
                  <TableHead>F. Ingreso</TableHead>
                  <TableHead>F. Salida</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tipo Servicio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>C. Estimado</TableHead>
                  <TableHead>C. Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{new Date(i.fecha_ingreso).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>{(i as any).fecha_salida ? new Date((i as any).fecha_salida).toLocaleDateString('es-ES') : '-'}</TableCell>
                    <TableCell>{(i as any).placa}</TableCell>
                    <TableCell>{(i as any).marca}</TableCell>
                    <TableCell>{(i as any).modelo}</TableCell>
                    <TableCell>{(i as any).cliente_nombre || '-'}</TableCell>
                    <TableCell>{i.tecnico || '-'}</TableCell>
                    <TableCell>{i.tipo_servicio || '-'}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={i.descripcion}>{i.descripcion}</TableCell>
                    <TableCell>{i.estado}</TableCell>
                    <TableCell>{i.costo_estimado ? `$${Number(i.costo_estimado).toLocaleString('es-CO')}` : '-'}</TableCell>
                    <TableCell>{i.costo_final ? `$${Number(i.costo_final).toLocaleString('es-CO')}` : '-'}</TableCell>
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
