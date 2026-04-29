/**
 * Script para extraer el ultimo servicio de MongoDB y generar 
 * un HTML de vista previa del PDF empresarial mejorado.
 * 
 * Uso: node generar-preview-pdf.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'doctorpc';

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    const db = client.db(DB_NAME);

    // Obtener el ultimo servicio entregado (con datos mas completos para preview)
    let servicio = await db.collection('servicios')
      .find({ estado: 'Entregado' })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    // Si no hay entregados, tomar el ultimo servicio cualquiera
    if (!servicio.length) {
      servicio = await db.collection('servicios')
        .find({})
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
    }

    if (!servicio.length) {
      console.log('No se encontraron servicios');
      return;
    }

    const s = servicio[0];
    console.log('Servicio encontrado:', s.numero_orden || s.numero_servicio, '- Estado:', s.estado);

    // Obtener cliente
    let cliente = null;
    if (s.cliente_id && ObjectId.isValid(s.cliente_id)) {
      cliente = await db.collection('clientes').findOne({ _id: new ObjectId(s.cliente_id) });
    }

    // Obtener equipo
    let equipo = null;
    if (s.equipo_id && ObjectId.isValid(s.equipo_id)) {
      equipo = await db.collection('equipos').findOne({ _id: new ObjectId(s.equipo_id) });
    }

    // Obtener historial de pagos
    const pagos = await db.collection('historial_pagos')
      .find({ servicio_id: s._id.toString() })
      .sort({ fecha_pago: -1 })
      .toArray();

    // Parsear diagnostico
    let diagnostico = [];
    const rawDiag = s.diagnostico || s.diagnostico_tecnico;
    if (rawDiag) {
      if (Array.isArray(rawDiag)) {
        diagnostico = rawDiag;
      } else if (typeof rawDiag === 'string') {
        try { diagnostico = JSON.parse(rawDiag); } catch (e) { diagnostico = []; }
      }
    }

    // Parsear datos de entrega
    let entrega = null;
    if (s.datos_entrega) {
      if (typeof s.datos_entrega === 'string') {
        try { entrega = JSON.parse(s.datos_entrega); } catch (e) { entrega = null; }
      } else {
        entrega = s.datos_entrega;
      }
    }

    // Parsear fotos de ingreso
    let fotosIngreso = s.fotos || s.fotos_ingreso || [];
    if (typeof fotosIngreso === 'string') {
      try { fotosIngreso = JSON.parse(fotosIngreso); } catch (e) { fotosIngreso = []; }
    }

    // Fotos de entrega
    let fotosEntrega = entrega?.fotos || s.fotos_entrega || [];
    if (typeof fotosEntrega === 'string') {
      try { fotosEntrega = JSON.parse(fotosEntrega); } catch (e) { fotosEntrega = []; }
    }

    // Calculos financieros
    const montoTotal = parseFloat(s.monto || s.costo_total || 0);
    const adelanto = parseFloat(s.adelanto || 0);
    const saldoPendiente = montoTotal - adelanto;
    let costoRepuestos = 0;
    if (Array.isArray(diagnostico) && diagnostico.length > 0) {
      costoRepuestos = diagnostico.reduce((sum, d) => sum + parseFloat(d.costo || 0), 0);
    }

    // Datos consolidados
    const data = {
      servicio: s,
      cliente: cliente || {},
      equipo: equipo || {},
      diagnostico,
      entrega,
      fotosIngreso,
      fotosEntrega,
      pagos,
      montoTotal,
      adelanto,
      saldoPendiente,
      costoRepuestos
    };

    // Log de datos extraidos
    console.log('\n--- DATOS EXTRAIDOS ---');
    console.log('Cliente:', data.cliente.nombre, data.cliente.apellido_paterno || '', data.cliente.apellido_materno || '');
    console.log('DNI:', data.cliente.dni);
    console.log('Equipo:', data.equipo.tipo_equipo, data.equipo.marca, data.equipo.modelo);
    console.log('Diagnostico items:', data.diagnostico.length);
    console.log('Fotos ingreso:', data.fotosIngreso.length);
    console.log('Fotos entrega:', data.fotosEntrega.length);
    console.log('Pagos registrados:', data.pagos.length);
    console.log('Entrega:', data.entrega ? 'Si' : 'No');
    console.log('Monto total:', data.montoTotal);
    console.log('Adelanto:', data.adelanto);

    // Generar HTML
    const html = generarHTML(data);
    const outputPath = 'public/preview-pdf-empresarial.html';
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log('\nHTML generado en:', outputPath);
    console.log('Abre en el navegador: http://localhost:3000/preview-pdf-empresarial.html');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

function val(v) {
  if (!v || String(v).trim() === '' || String(v).trim() === 'N/A' || String(v).trim() === 'undefined') return '--------';
  return String(v).trim();
}

function formatFecha(fecha) {
  if (!fecha) return '--------';
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) { return val(fecha); }
}

function formatFechaHora(fecha) {
  if (!fecha) return '--------';
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' - ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return val(fecha); }
}

function generarHTML(data) {
  const { servicio: s, cliente: c, equipo: e, diagnostico, entrega, fotosIngreso, fotosEntrega, pagos, montoTotal, adelanto, saldoPendiente, costoRepuestos } = data;

  const numeroOrden = val(s.numero_orden || s.numero_servicio);
  const clienteNombre = `${val(c.nombre)} ${val(c.apellido_paterno)} ${val(c.apellido_materno)}`.replace(/--------/g, '').trim() || '--------';
  const costoBase = montoTotal - costoRepuestos - parseFloat(s.costo_adicional || 0);
  const costoAdicional = parseFloat(s.costo_adicional || 0);
  const subtotal = montoTotal / 1.18;
  const igv = montoTotal - subtotal;

  // Timeline
  const timelineItems = [];
  timelineItems.push({ label: 'Ingreso', fecha: s.fecha || s.fecha_creacion, color: '#1565C0', done: true });
  if (s.fecha_diagnostico || diagnostico.length > 0) {
    timelineItems.push({ label: 'Diagnostico', fecha: s.fecha_diagnostico, color: '#FF9800', done: true });
  }
  if (s.fecha_reparacion || s.estado === 'Completado' || s.estado === 'Entregado') {
    timelineItems.push({ label: 'Reparacion', fecha: s.fecha_reparacion || s.fecha_completado, color: '#2196F3', done: true });
  }
  if (entrega || s.estado === 'Entregado') {
    timelineItems.push({ label: 'Entregado', fecha: entrega?.fechaEntrega || s.fecha_entrega, color: '#4CAF50', done: true });
  }
  if (s.estado === 'Cancelado') {
    timelineItems.push({ label: 'Cancelado', fecha: s.fecha_cancelacion, color: '#F44336', done: true });
  }

  // Estado badge color
  const estadoColor = {
    'Pendiente': '#FF9800', 'En diagnostico': '#2196F3', 'Diagnosticado': '#9C27B0',
    'En reparacion': '#03A9F4', 'Completado': '#4CAF50', 'Entregado': '#2E7D32', 'Cancelado': '#F44336'
  }[s.estado] || '#757575';

  // Diagnostico rows
  const diagRows = diagnostico.map((d, i) => `
    <tr style="${i % 2 === 0 ? 'background:#F8F9FA;' : ''}">
      <td style="padding:3px 6px;text-align:center;font-size:8.5px;border-bottom:1px solid #E0E0E0;">${i + 1}</td>
      <td style="padding:3px 6px;font-size:8.5px;border-bottom:1px solid #E0E0E0;">${val(d.descripcion || d.problema)}</td>
      <td style="padding:3px 6px;font-size:8.5px;border-bottom:1px solid #E0E0E0;">${val(d.solucion)}</td>
      <td style="padding:3px 6px;text-align:right;font-size:8.5px;border-bottom:1px solid #E0E0E0;color:#1565C0;font-weight:600;">S/. ${parseFloat(d.costo || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  // Pagos rows
  const pagosRows = pagos.map((p, i) => `
    <tr style="${i % 2 === 0 ? 'background:#F8F9FA;' : ''}">
      <td style="padding:2px 5px;font-size:7.5px;border-bottom:1px solid #E0E0E0;">${formatFecha(p.fecha_pago)}</td>
      <td style="padding:2px 5px;font-size:7.5px;border-bottom:1px solid #E0E0E0;">S/. ${parseFloat(p.monto || p.monto_pagado || 0).toFixed(2)}</td>
      <td style="padding:2px 5px;font-size:7.5px;border-bottom:1px solid #E0E0E0;">${val(p.metodo_pago)}</td>
      <td style="padding:2px 5px;font-size:7.5px;border-bottom:1px solid #E0E0E0;">${val(p.referencia || p.numero_referencia)}</td>
    </tr>
  `).join('');

  // Fotos ingreso
  const fotosIngresoHTML = fotosIngreso.length > 0
    ? fotosIngreso.map((f, i) => {
        const url = typeof f === 'string' ? f : f.url || f.secure_url || '';
        return `
        <div style="flex:1;min-width:160px;max-width:200px;">
          <div style="border:1px solid #E0E0E0;border-radius:6px;overflow:hidden;background:#F5F5F5;">
            <img src="${url}" alt="Foto ingreso ${i + 1}" style="width:100%;height:140px;object-fit:cover;display:block;" onerror="this.src='';this.alt='Imagen no disponible';this.style.height='80px';this.style.display='flex';this.style.alignItems='center';this.style.justifyContent='center';this.style.background='#EEE';this.style.color='#999';this.style.fontSize='11px';" />
            <div style="padding:4px 8px;background:#FFF3E0;text-align:center;font-size:9px;color:#E65100;">Foto ${i + 1} - Ingreso</div>
          </div>
        </div>`;
      }).join('')
    : '<p style="color:#999;font-size:11px;padding:10px;">Sin fotos de ingreso registradas</p>';

  // Fotos entrega
  const fotosEntregaHTML = fotosEntrega.length > 0
    ? fotosEntrega.map((f, i) => {
        const url = typeof f === 'string' ? f : f.url || f.secure_url || '';
        return `
        <div style="flex:1;min-width:160px;max-width:200px;">
          <div style="border:1px solid #E0E0E0;border-radius:6px;overflow:hidden;background:#F5F5F5;">
            <img src="${url}" alt="Foto entrega ${i + 1}" style="width:100%;height:140px;object-fit:cover;display:block;" onerror="this.src='';this.alt='Imagen no disponible';this.style.height='80px';" />
            <div style="padding:4px 8px;background:#E8F5E9;text-align:center;font-size:9px;color:#2E7D32;">Foto ${i + 1} - Entrega</div>
          </div>
        </div>`;
      }).join('')
    : '<p style="color:#999;font-size:11px;padding:10px;">Sin fotos de entrega registradas</p>';

  // Metodo de pago en entrega
  const metodoPagoEntrega = val(entrega?.metodoPago || s.metodo_pago);
  const comprobanteEntrega = val(entrega?.comprobanteEntrega || s.comprobante);
  const garantiaHasta = val(entrega?.garantiaHasta);
  const recomendaciones = val(entrega?.recomendaciones);
  const estadoEquipo = val(entrega?.estadoEquipo);
  const observacionesEntrega = val(entrega?.observacionesEntrega);
  const encargadoEntrega = val(entrega?.encargadoEntrega);
  const fechaEntrega = entrega?.fechaEntrega ? `${entrega.fechaEntrega} ${entrega.horaEntrega || ''}` : val(s.fecha_entrega);

  const fechaEmision = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PDF Empresarial - ${numeroOrden}</title>
<style>
  @page {
    size: A4;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    background: #E0E0E0;
    color: #333;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    background: #FFF;
    margin: 20px auto;
    box-shadow: 0 2px 20px rgba(0,0,0,0.15);
    position: relative;
    overflow: hidden;
  }
  @media print {
    body { background: #FFF; }
    .page { margin: 0; box-shadow: none; }
    .page-break { page-break-before: always; }
    .no-print { display: none !important; }
  }

  /* Header */
  .header {
    background: #1565C0;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 3px solid #0D47A1;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-circle {
    width: 38px; height: 38px; background: rgba(255,255,255,0.15);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
  }
  .logo-inner {
    width: 28px; height: 28px; background: #FFF; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #1565C0;
  }
  .empresa-nombre { font-size: 16px; font-weight: 700; color: #FFF; }
  .empresa-sub { font-size: 7.5px; color: #BBDEFB; margin-top: 1px; }
  .orden-box {
    background: #FFF; border-radius: 5px; padding: 5px 12px; text-align: center;
    min-width: 110px;
  }
  .orden-label { font-size: 7px; color: #1565C0; font-weight: 700; text-transform: uppercase; }
  .orden-numero { font-size: 14px; color: #0D47A1; font-weight: 700; margin-top: 1px; }
  .orden-fecha { font-size: 6.5px; color: #666; margin-top: 1px; }

  /* Barra de estado */
  .status-bar {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 20px; font-size: 9px;
    border-bottom: 1px solid #E0E0E0;
  }
  .status-badge {
    display: inline-block; padding: 2px 8px; border-radius: 8px;
    color: #FFF; font-weight: 600; font-size: 8px;
  }
  .status-info { color: #666; font-size: 8px; }

  /* Contenido */
  .content { padding: 6px 20px 8px; }

  /* Secciones */
  .section-header {
    background: #1565C0; color: #FFF; padding: 3px 10px;
    font-size: 8.5px; font-weight: 700; border-radius: 3px 3px 0 0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .section-header.green { background: #2E7D32; }
  .section-header.orange { background: #E65100; }
  .section-header.purple { background: #7B1FA2; }
  .section-box {
    border: 1px solid #E0E0E0; border-top: none; border-radius: 0 0 3px 3px;
    padding: 5px 8px; background: #FAFAFA; margin-bottom: 6px;
  }

  /* Grid 2 columnas */
  .grid-2 { display: flex; gap: 8px; margin-bottom: 6px; }
  .grid-2 > div { flex: 1; }

  /* Labels y valores */
  .field { margin-bottom: 2px; font-size: 8.5px; line-height: 1.35; }
  .field-label { font-weight: 600; color: #1565C0; display: inline; }
  .field-value { color: #333; display: inline; }

  /* Tabla diagnostico */
  .diag-table { width: 100%; border-collapse: collapse; }
  .diag-table th {
    background: #0D47A1; color: #FFF; padding: 3px 6px;
    font-size: 8px; font-weight: 600; text-align: left;
  }
  .diag-table th:last-child { text-align: right; }

  /* Tabla costos */
  .cost-table { width: 100%; border-collapse: collapse; }
  .cost-table td { padding: 3px 8px; font-size: 8.5px; border-bottom: 1px solid #E0E0E0; }
  .cost-table .total-row td {
    background: #2E7D32; color: #FFF; font-weight: 700; font-size: 10px;
    border-bottom: none; padding: 4px 8px;
  }

  /* Timeline */
  .timeline {
    display: flex; align-items: center; justify-content: center;
    gap: 0; padding: 10px 0; position: relative;
  }
  .timeline-item {
    text-align: center; position: relative; flex: 1;
  }
  .timeline-dot {
    width: 22px; height: 22px; border-radius: 50%; color: #FFF;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700; margin: 0 auto 4px;
  }
  .timeline-label { font-size: 8px; font-weight: 600; }
  .timeline-date { font-size: 7px; color: #999; margin-top: 1px; }
  .timeline-line {
    position: absolute; top: 11px; left: 50%; right: -50%;
    height: 2px; background: #BBDEFB; z-index: 0;
  }
  .timeline-item:last-child .timeline-line { display: none; }

  /* Firmas */
  .firmas { display: flex; justify-content: space-around; margin-top: 8px; padding: 0 30px; }
  .firma-block { text-align: center; }
  .firma-line { border-top: 1px solid #333; width: 140px; margin-bottom: 2px; }
  .firma-label { font-size: 8.5px; font-weight: 600; color: #333; }
  .firma-name { font-size: 7px; color: #999; margin-top: 1px; }

  /* Terminos */
  .terminos {
    background: #F5F5F5; border-top: 1px solid #1565C0;
    padding: 4px 20px; margin-top: 4px;
  }
  .terminos-title { font-size: 7.5px; font-weight: 700; text-align: center; margin-bottom: 2px; }
  .terminos-text { font-size: 6.5px; color: #666; line-height: 1.5; }

  /* Footer */
  .page-footer {
    text-align: center; padding: 3px; font-size: 6.5px; color: #BBB;
    border-top: 1px solid #EEE;
  }

  /* Pagina 2 */
  .mini-header {
    background: #1565C0; padding: 8px 28px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 4px solid #0D47A1;
  }
  .mini-header-title { color: #FFF; font-size: 14px; font-weight: 700; }
  .mini-header-sub { color: #BBDEFB; font-size: 10px; margin-left: 8px; }
  .mini-header-orden { color: #FFF; font-size: 10px; font-weight: 600; }

  .fotos-grid { display: flex; gap: 10px; flex-wrap: wrap; padding: 10px 0; }

  /* Problema box */
  .problema-box {
    background: #FFF8E1; border: 1px solid #FFE082; border-radius: 3px;
    padding: 5px 8px; margin-bottom: 6px;
  }
  .obs-cliente { color: #E65100; font-size: 8px; font-weight: 600; margin-top: 3px; }

  /* Trabajo realizado */
  .trabajo-box {
    background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 3px;
    padding: 5px 8px; margin-bottom: 6px;
  }

  /* Botones no-print */
  .print-controls {
    text-align: center; padding: 20px; background: #263238;
  }
  .print-controls button {
    padding: 10px 24px; font-size: 14px; border: none; border-radius: 6px;
    cursor: pointer; margin: 0 8px; font-weight: 600;
  }
  .btn-print { background: #1565C0; color: #FFF; }
  .btn-print:hover { background: #0D47A1; }

  .pagado-badge {
    background: #4CAF50; color: #FFF; padding: 3px 10px;
    border-radius: 0 0 3px 3px; font-weight: 700; font-size: 9px;
    text-align: center;
  }
  .pendiente-badge {
    background: #E65100; color: #FFF; padding: 3px 10px;
    border-radius: 0 0 3px 3px; font-weight: 700; font-size: 9px;
    text-align: center;
  }
</style>
</head>
<body>

<!-- ============================== -->
<!-- CONTROLES DE IMPRESION         -->
<!-- ============================== -->
<div class="print-controls no-print">
  <button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
</div>

<!-- ============================== -->
<!-- PAGINA 1: REPORTE PRINCIPAL    -->
<!-- ============================== -->
<div class="page">

  <!-- ENCABEZADO -->
  <div class="header">
    <div class="header-left">
      <div class="logo-circle">
        <div class="logo-inner">DC</div>
      </div>
      <div>
        <div class="empresa-nombre">DOCTOR PC</div>
        <div class="empresa-sub">Soluciones Informaticas Profesionales</div>
        <div class="empresa-sub">Tel: 961 509 941 | Email: contacto@doctorpc.pe</div>
        <div class="empresa-sub">Lima - Peru</div>
      </div>
    </div>
    <div class="orden-box">
      <div class="orden-label">Orden de Servicio</div>
      <div class="orden-numero">${numeroOrden}</div>
      <div class="orden-fecha">Emision: ${fechaEmision}</div>
    </div>
  </div>

  <!-- BARRA DE ESTADO -->
  <div class="status-bar">
    <span class="status-badge" style="background:${estadoColor};">${val(s.estado)}</span>
    <span class="status-info">
      Prioridad: <strong>${val(s.prioridad)}</strong>
      &nbsp;|&nbsp; Sucursal: <strong>${val(s.local || s.sucursal)}</strong>
      &nbsp;|&nbsp; Fecha ingreso: <strong>${formatFechaHora(s.fecha || s.fecha_creacion)}</strong>
      ${(entrega || s.estado === 'Entregado') ? `&nbsp;|&nbsp; Fecha de entrega: <strong>${entrega?.fechaEntrega ? entrega.fechaEntrega + (entrega.horaEntrega ? ' ' + entrega.horaEntrega : '') : formatFechaHora(s.fecha_entrega)}</strong>` : ''}
    </span>
  </div>

  <div class="content">

    <!-- DATOS CLIENTE + EQUIPO -->
    <div class="grid-2">
      <div>
        <div class="section-header">DATOS DEL CLIENTE</div>
        <div class="section-box">
          <div class="field"><span class="field-label">Cliente: </span><span class="field-value">${clienteNombre.toUpperCase()}</span></div>
          <div class="field"><span class="field-label">DNI: </span><span class="field-value">${val(c.dni)}</span>
            &nbsp;&nbsp;&nbsp;<span class="field-label">Telefono: </span><span class="field-value">${val(c.telefono)}</span></div>
          <div class="field"><span class="field-label">Email: </span><span class="field-value">${val(c.email)}</span></div>
          <div class="field"><span class="field-label">Direccion: </span><span class="field-value">${val(c.direccion)}</span></div>
        </div>
      </div>
      <div>
        <div class="section-header">EQUIPO RECIBIDO</div>
        <div class="section-box">
          <div class="field"><span class="field-label">Tipo: </span><span class="field-value">${val(e.tipo_equipo)}</span>
            &nbsp;&nbsp;&nbsp;<span class="field-label">Marca: </span><span class="field-value">${val(e.marca)}</span></div>
          <div class="field"><span class="field-label">Modelo: </span><span class="field-value">${val(e.modelo)}</span></div>
          <div class="field"><span class="field-label">N. Serie: </span><span class="field-value">${val(e.numero_serie)}</span></div>
          <div class="field"><span class="field-label">Color: </span><span class="field-value">${val(e.color)}</span>
            &nbsp;&nbsp;&nbsp;<span class="field-label">Accesorios: </span><span class="field-value">${val(e.accesorios)}</span></div>
        </div>
      </div>
    </div>

    <!-- PROBLEMA REPORTADO -->
    <div class="problema-box">
      <div class="field"><span class="field-label">Problema Reportado: </span>
        <span class="field-value">${val(s.problemas_reportados || s.descripcion_problema || s.problemas)}</span>
      </div>
      ${s.observaciones ? `<div class="obs-cliente">Obs. Cliente: "${val(s.observaciones)}"</div>` : ''}
    </div>

    <!-- DIAGNOSTICO TECNICO -->
    ${diagnostico.length > 0 ? `
    <div style="margin-bottom:6px;">
      <div class="section-header">
        DIAGNOSTICO TECNICO
        <span style="font-size:7px;font-weight:400;">Tecnico: ${val(s.tecnico || s.tecnico_diagnosticador || s.tecnico_asignado)}</span>
      </div>
      <table class="diag-table">
        <thead>
          <tr>
            <th style="width:30px;text-align:center;">N.</th>
            <th>PROBLEMA ENCONTRADO</th>
            <th>SOLUCION PROPUESTA</th>
            <th style="width:80px;text-align:right;">COSTO</th>
          </tr>
        </thead>
        <tbody>
          ${diagRows}
        </tbody>
      </table>
    </div>
    ` : `
    <div style="margin-bottom:6px;">
      <div class="section-header">DIAGNOSTICO TECNICO</div>
      <div class="section-box">
        <div class="field" style="color:#999;">Sin diagnostico registrado</div>
      </div>
    </div>
    `}

    <!-- TRABAJO REALIZADO -->
    ${(s.solucion_aplicada || s.trabajo_realizado) ? `
    <div class="trabajo-box">
      <div style="font-size:8.5px;font-weight:700;color:#2E7D32;margin-bottom:2px;">TRABAJO REALIZADO / SOLUCION APLICADA</div>
      <div class="field"><span class="field-value">${val(s.solucion_aplicada || s.trabajo_realizado)}</span></div>
    </div>
    ` : ''}

    <!-- RESUMEN FINANCIERO + DETALLE PAGOS -->
    <div class="grid-2">
      <div>
        <div class="section-header">RESUMEN FINANCIERO</div>
        <table class="cost-table" style="border:1px solid #E0E0E0;">
          <tr style="background:#F8F9FA;"><td>Mano de Obra / Servicio</td><td style="text-align:right;">S/. ${costoBase > 0 ? costoBase.toFixed(2) : montoTotal.toFixed(2)}</td></tr>
          <tr><td>Repuestos</td><td style="text-align:right;">S/. ${costoRepuestos.toFixed(2)}</td></tr>
          <tr style="background:#F8F9FA;"><td>Adicionales</td><td style="text-align:right;">S/. ${costoAdicional.toFixed(2)}</td></tr>
          <tr style="background:#ECEFF1;"><td style="font-weight:600;">Subtotal</td><td style="text-align:right;font-weight:600;">S/. ${subtotal.toFixed(2)}</td></tr>
          <tr><td>I.G.V. (18%)</td><td style="text-align:right;">S/. ${igv.toFixed(2)}</td></tr>
          <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">S/. ${montoTotal.toFixed(2)}</td></tr>
        </table>
      </div>
      <div>
        <div class="section-header">DETALLE DE PAGOS</div>
        <div class="section-box">
          <div class="field"><span class="field-label">Adelanto: </span><span class="field-value">S/. ${adelanto.toFixed(2)}</span></div>
          <div class="field"><span class="field-label">Saldo pendiente: </span><span class="field-value" style="color:${saldoPendiente > 0 ? '#E65100' : '#2E7D32'};font-weight:600;">S/. ${saldoPendiente.toFixed(2)}</span></div>
          ${entrega ? `
          <hr style="border:none;border-top:1px dashed #CCC;margin:3px 0;">
          <div class="field"><span class="field-label">Cobrado en entrega: </span><span class="field-value">S/. ${parseFloat(entrega.montoCobraHoy || 0).toFixed(2)}</span></div>
          <div class="field"><span class="field-label">Metodo de pago: </span><span class="field-value">${metodoPagoEntrega}</span></div>
          <div class="field"><span class="field-label">Comprobante: </span><span class="field-value">${comprobanteEntrega}</span></div>
          ` : ''}
          ${pagos.length > 0 ? `
          <hr style="border:none;border-top:1px dashed #CCC;margin:3px 0;">
          <div style="font-size:7.5px;font-weight:600;color:#1565C0;margin-bottom:2px;">Historial de pagos:</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#E3F2FD;">
              <td style="padding:2px 4px;font-size:7px;font-weight:600;">Fecha</td>
              <td style="padding:2px 4px;font-size:7px;font-weight:600;">Monto</td>
              <td style="padding:2px 4px;font-size:7px;font-weight:600;">Metodo</td>
              <td style="padding:2px 4px;font-size:7px;font-weight:600;">Ref.</td>
            </tr>
            ${pagosRows}
          </table>
          ` : ''}
        </div>
        <div class="${saldoPendiente <= 0 ? 'pagado-badge' : 'pendiente-badge'}">
          ${saldoPendiente <= 0 ? 'PAGADO COMPLETO' : `SALDO PENDIENTE: S/. ${saldoPendiente.toFixed(2)}`}
        </div>
      </div>
    </div>



    <!-- DATOS DE ENTREGA -->
    ${entrega || s.estado === 'Entregado' ? `
    <div class="grid-2">
      <div>
        <div class="section-header green">DATOS DE ENTREGA</div>
        <div class="section-box">
          <div class="field"><span class="field-label">Recibido por: </span><span class="field-value">${val(entrega?.recibido_por || clienteNombre)}</span></div>
          <div class="field"><span class="field-label">Fecha entrega: </span><span class="field-value">${fechaEntrega}</span></div>
          <div class="field"><span class="field-label">Encargado: </span><span class="field-value">${encargadoEntrega}</span></div>
          <div class="field"><span class="field-label">Estado equipo: </span>
            <span style="background:${estadoEquipo === 'Operativo' ? '#4CAF50' : '#FF9800'};color:#FFF;padding:1px 6px;border-radius:6px;font-size:7.5px;font-weight:600;">${estadoEquipo}</span>
          </div>
          ${observacionesEntrega !== '--------' ? `<div class="field"><span class="field-label">Observaciones: </span><span class="field-value">${observacionesEntrega}</span></div>` : ''}
        </div>
      </div>
      <div>
        <div class="section-header green">GARANTIA Y RECOMENDACIONES</div>
        <div class="section-box">
          <div class="field"><span class="field-label">Garantia hasta: </span><span class="field-value" style="color:#E65100;font-weight:600;">${garantiaHasta}</span></div>
          <div class="field" style="margin-top:2px;"><span class="field-label">Recomendaciones: </span></div>
          <div style="font-size:8px;color:#333;padding-left:4px;line-height:1.4;">${recomendaciones}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- CALIFICACION -->
    ${s.calificacion && s.calificacion > 0 ? `
    <div style="background:#FFF8E1;border:1px solid #FFE082;border-radius:4px;padding:6px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:10px;font-weight:600;color:#F57F17;">Calificacion del Servicio:</span>
      <span style="font-size:14px;color:#FFC107;">${'&#9733;'.repeat(s.calificacion)}${'&#9734;'.repeat(5 - s.calificacion)}</span>
      <span style="font-size:9px;color:#333;">${s.calificacion}/5</span>
    </div>
    ` : ''}

    <!-- FIRMAS -->
    <div class="firmas">
      <div class="firma-block">
        <div class="firma-line"></div>
        <div class="firma-label">Firma del Tecnico</div>
        <div class="firma-name">${val(s.tecnico || s.tecnico_asignado)}</div>
      </div>
      <div class="firma-block">
        <div class="firma-line"></div>
        <div class="firma-label">Firma del Cliente</div>
        <div class="firma-name">${clienteNombre}</div>
        <div class="firma-name">DNI: ${val(c.dni)}</div>
      </div>
    </div>

  </div><!-- /content -->

  <!-- TERMINOS -->
  <div class="terminos">
    <div class="terminos-title">TERMINOS Y CONDICIONES</div>
    <div class="terminos-text">
      1. La garantia de 30 dias cubre unicamente defectos en mano de obra. No incluye danos por mal uso, golpes, caidas o liquidos derramados.<br>
      2. Los equipos no recogidos en un plazo maximo de 30 dias calendario despues de la notificacion no seran sujeto de reclamo.<br>
      3. Los repuestos reemplazados originales quedan en propiedad de DOCTOR PC salvo acuerdo previo por escrito.<br>
      4. El cliente acepta haber recibido el equipo en las condiciones descritas en el presente documento al momento de firmar.
    </div>
  </div>

  <div class="page-footer">DOCTOR PC - Documento generado automaticamente | ${numeroOrden} | Pag. 1${(fotosIngreso.length > 0 || fotosEntrega.length > 0) ? '/2' : '/1'}</div>
</div>

<!-- ============================== -->
<!-- PAGINA 2: EVIDENCIA FOTOGRAFICA -->
<!-- ============================== -->
${(fotosIngreso.length > 0 || fotosEntrega.length > 0) ? `
<div class="page page-break">
  <div class="mini-header">
    <div style="display:flex;align-items:center;">
      <span class="mini-header-title">DOCTOR PC</span>
      <span class="mini-header-sub">| Anexo Fotografico</span>
    </div>
    <span class="mini-header-orden">${numeroOrden}</span>
  </div>

  <div class="content">
    <!-- FOTOS INGRESO -->
    <div style="margin-bottom:16px;">
      <div class="section-header orange">EVIDENCIA FOTOGRAFICA - INGRESO DEL EQUIPO (${formatFecha(s.fecha || s.fecha_creacion)})</div>
      <div class="section-box">
        <div class="fotos-grid">${fotosIngresoHTML}</div>
      </div>
    </div>

    <!-- FOTOS ENTREGA -->
    <div style="margin-bottom:16px;">
      <div class="section-header green">EVIDENCIA FOTOGRAFICA - ENTREGA DEL EQUIPO (${formatFecha(entrega?.fechaEntrega || s.fecha_entrega)})</div>
      <div class="section-box">
        <div class="fotos-grid">${fotosEntregaHTML}</div>
      </div>
    </div>

    <div style="background:#F5F5F5;border:1px solid #E0E0E0;border-radius:4px;padding:8px 14px;font-size:8px;color:#999;text-align:center;">
      Las fotografias son evidencia del estado del equipo al momento del ingreso y entrega. Forman parte integral del documento de servicio.
    </div>
  </div>

  <div class="page-footer" style="position:absolute;bottom:0;left:0;right:0;">DOCTOR PC - Documento generado automaticamente | ${numeroOrden} | Pag. 2/2</div>
</div>
` : ''}

</body>
</html>`;
}

main();
