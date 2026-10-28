// Cajas (sección 5.8): buscador, filtros, tarjetas en celular, tabla en escritorio y exportar a Excel.
import { marcoHTML, avisoHTML, pintar } from '../marco.js';
import { usuarioActual } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { buscarArea, nombreDe, ultimaModificacion } from '../consultas.js';
import { ESTADOS, estadoHTML } from '../estados.js';
import { TIPOS_EQUIPO } from '../datos/catalogos.js';
import { formatearNumero, limpiarNumero } from '../iso6346.js';
import { escapar, fechaHora, tiempoRelativo, numero } from '../formato.js';
import { crearExcel, descargar } from '../excel.js';
import { estaEnLinea, fechaFichaVista } from '../conexion.js';

const ESTADOS_FICHA = ['en_uso', 'en_transito', 'entregado', 'archivado'];
const ORDEN = { en_transito: 0, en_uso: 1, entregado: 2, archivado: 3 };

// Los filtros se recuerdan mientras la app esté abierta
let filtros = null;

const $ = (selector) => document.querySelector(selector);

function filtrosIniciales(persona) {
  return {
    texto: '',
    estado: '',
    cliente: '',
    // Supervisor y operador empiezan viendo su área; pueden cambiarla
    area: persona.rol === 'admin_org' ? '' : (persona.areaId ?? ''),
    tipo: '',
  };
}

// Texto donde se busca: número, etiqueta, cliente, pedido, factura, productos y ubicación
function textoBuscable(ficha) {
  return [
    ficha.numeroEquipo, formatearNumero(ficha.numeroEquipo), ficha.etiqueta,
    ficha.pedido.cliente, ficha.pedido.numero, ficha.pedido.factura, ficha.ubicacion,
    ...ficha.contenido.map((i) => `${i.nombre} ${i.sku} ${i.lote}`),
  ].join(' ').toLowerCase();
}

function aplicarFiltros(fichas) {
  const busqueda = filtros.texto.trim().toLowerCase();
  const busquedaLimpia = limpiarNumero(busqueda);
  return fichas
    .filter((f) => !busqueda || textoBuscable(f).includes(busqueda)
      || (busquedaLimpia.length >= 3 && limpiarNumero(f.numeroEquipo).includes(busquedaLimpia)))
    .filter((f) => !filtros.estado || f.estado === filtros.estado)
    .filter((f) => !filtros.cliente || f.pedido.cliente === filtros.cliente)
    .filter((f) => !filtros.area || f.areaId === filtros.area)
    .filter((f) => !filtros.tipo || f.tipo === filtros.tipo)
    .sort((a, b) => (ORDEN[a.estado] - ORDEN[b.estado])
      || (new Date(ultimaModificacion(b.id)?.horaTelefono ?? 0) - new Date(ultimaModificacion(a.id)?.horaTelefono ?? 0)));
}

function opciones(lista, elegido, todos) {
  return `<option value="">${todos}</option>${lista.map(([valor, texto]) =>
    `<option value="${escapar(valor)}" ${valor === elegido ? 'selected' : ''}>${escapar(texto)}</option>`).join('')}`;
}

function ultimaHTML(ficha) {
  const ultima = ultimaModificacion(ficha.id);
  return ultima ? `${escapar(nombreDe(ultima.usuarioId))}, ${tiempoRelativo(ultima.horaTelefono)}` : '—';
}

function tarjetaHTML(ficha) {
  const tipo = TIPOS_EQUIPO[ficha.tipo];
  return `
    <a class="tarjeta tarjeta-enlace" href="#/ficha/${ficha.id}">
      <span class="texto-suave"><i data-lucide="${tipo.icono}"></i> ${tipo.texto} · ${escapar(buscarArea(ficha.areaId)?.nombre ?? '')}</span>
      <span class="titulo-tarjeta">${formatearNumero(ficha.numeroEquipo)}</span>
      <span class="fila">${estadoHTML(ficha.estado)}
        <span class="estado estado--gris"><i data-lucide="tag"></i>${ficha.etiqueta ?? 'Sin etiqueta'}</span></span>
      <span>${escapar(ficha.pedido.cliente || 'Sin cliente')}</span>
      <span class="texto-suave"><i data-lucide="map-pin"></i> ${escapar(ficha.ubicacion)}</span>
      <span class="texto-suave">Última modificación: ${ultimaHTML(ficha)}</span>
    </a>`;
}

function tablaHTML(fichas) {
  return `
    <table class="tabla">
      <thead><tr>
        <th>Número de equipo</th><th>Tipo</th><th>Estado</th><th>Etiqueta</th>
        <th>Cliente</th><th>Área</th><th>Ubicación</th><th>Última modificación</th>
      </tr></thead>
      <tbody>${fichas.map((f) => `
        <tr>
          <td><a class="enlace" href="#/ficha/${f.id}">${formatearNumero(f.numeroEquipo)}</a></td>
          <td>${TIPOS_EQUIPO[f.tipo].texto}</td>
          <td>${estadoHTML(f.estado)}</td>
          <td>${f.etiqueta ?? '—'}</td>
          <td>${escapar(f.pedido.cliente || '—')}</td>
          <td>${escapar(buscarArea(f.areaId)?.nombre ?? '—')}</td>
          <td>${escapar(f.ubicacion)}</td>
          <td>${ultimaHTML(f)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function exportar(fichas) {
  const filas = [[
    'Número de equipo', 'Tipo', 'Estado', 'Etiqueta', 'Área', 'Ubicación', 'Cliente', 'Pedido',
    'Factura', 'Dirección de entrega', 'Productos', 'Unidades', 'Última modificación', 'Modificado por',
  ]];
  fichas.forEach((f) => {
    const ultima = ultimaModificacion(f.id);
    filas.push([
      formatearNumero(f.numeroEquipo), TIPOS_EQUIPO[f.tipo].texto, ESTADOS[f.estado].texto, f.etiqueta ?? '',
      buscarArea(f.areaId)?.nombre ?? '', f.ubicacion, f.pedido.cliente, f.pedido.numero, f.pedido.factura,
      f.pedido.direccion,
      f.contenido.map((i) => `${i.nombre} (${numero(i.cantidad)})`).join('; '),
      f.contenido.reduce((total, i) => total + i.cantidad, 0),
      ultima ? fechaHora(ultima.horaTelefono) : '', ultima ? nombreDe(ultima.usuarioId) : '',
    ]);
  });
  const hoy = new Date().toLocaleDateString('sv-SE');   // AAAA-MM-DD
  descargar(crearExcel(filas, 'Cajas'), `scanbox-cajas-${hoy}.xlsx`);
}

export function pantallaCajas() {
  const persona = usuarioActual();
  filtros ??= filtrosIniciales(persona);
  const datos = obtenerDatos();
  const enLinea = estaEnLinea();

  // Sin conexión solo se ven las fichas abiertas antes con señal
  const todas = datos.fichas.filter((f) => f.orgId === persona.orgId);
  const disponibles = enLinea ? todas : todas.filter((f) => fechaFichaVista(f.id));

  const clientes = [...new Set(todas.map((f) => f.pedido.cliente).filter(Boolean))].sort()
    .map((c) => [c, c]);
  const areas = datos.areas.filter((a) => a.orgId === persona.orgId).map((a) => [a.id, a.nombre]);

  pintar(marcoHTML(`
    <h1>Cajas</h1>
    ${enLinea ? '' : avisoHTML('ambar', 'cloud-off', 'Sin conexión: solo ves las cajas que abriste antes en este celular. Los datos pueden estar desactualizados.')}
    <label class="campo campo-busqueda">
      <span class="sr-only">Buscar</span>
      <input id="busqueda" type="search" value="${escapar(filtros.texto)}"
             placeholder="Buscar número, etiqueta, cliente, producto…" autocomplete="off">
    </label>
    <details class="filtros" ${filtros.estado || filtros.cliente || filtros.tipo ? 'open' : ''}>
      <summary class="resumen-desplegable"><i data-lucide="sliders-horizontal"></i> Filtros</summary>
      <div class="rejilla-filtros">
        <label class="campo">Estado<select data-filtro="estado">${opciones(ESTADOS_FICHA.map((e) => [e, ESTADOS[e].texto]), filtros.estado, 'Todos')}</select></label>
        <label class="campo">Cliente<select data-filtro="cliente">${opciones(clientes, filtros.cliente, 'Todos')}</select></label>
        <label class="campo">Área<select data-filtro="area">${opciones(areas, filtros.area, 'Todas')}</select></label>
        <label class="campo">Tipo<select data-filtro="tipo">${opciones(Object.entries(TIPOS_EQUIPO).map(([id, t]) => [id, t.texto]), filtros.tipo, 'Todos')}</select></label>
      </div>
    </details>
    <div class="fila-resultados">
      <p id="cuenta" class="texto-suave" role="status"></p>
      <button id="btn-exportar" class="btn btn-secundario"><i data-lucide="file-spreadsheet"></i>Exportar a Excel</button>
    </div>
    <div id="resultados"></div>
  `, 'cajas', persona));

  let visibles = [];
  const dibujarResultados = () => {
    visibles = aplicarFiltros(disponibles);
    $('#cuenta').textContent = visibles.length === 1 ? '1 caja' : `${visibles.length} cajas`;
    $('#btn-exportar').disabled = !visibles.length;
    $('#resultados').innerHTML = visibles.length
      ? `<div class="vista-tarjetas pila">${visibles.map(tarjetaHTML).join('')}</div>
         <div class="vista-tabla">${tablaHTML(visibles)}</div>`
      : `<div class="vacio">
           <i data-lucide="package-search"></i>
           <p>No hay cajas que coincidan con la búsqueda.</p>
           <button id="btn-limpiar" class="btn btn-secundario">Limpiar búsqueda y filtros</button>
         </div>`;
    lucide.createIcons({ root: $('#resultados') });
    $('#btn-limpiar')?.addEventListener('click', () => {
      filtros = { texto: '', estado: '', cliente: '', area: '', tipo: '' };
      pantallaCajas();
    });
  };
  dibujarResultados();

  $('#busqueda').addEventListener('input', (evento) => {
    filtros.texto = evento.target.value;
    dibujarResultados();
  });
  document.querySelectorAll('[data-filtro]').forEach((selector) => {
    selector.addEventListener('change', () => {
      filtros[selector.dataset.filtro] = selector.value;
      dibujarResultados();
    });
  });
  $('#btn-exportar').addEventListener('click', () => exportar(visibles));
}
