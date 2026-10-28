// Panel del administrador de ScanBox (sección 5.13), pensado para escritorio.
// .../#/admin               → cartera de clientes con filtros por estado de pago
// .../#/admin/cliente/ID    → detalle del cliente, pagos y acciones
// .../#/lotes               → lotes de etiquetas;  .../#/lotes/nuevo → generar lote
// .../#/lotes/L-2026-001    → vista previa y PDF para producción
// .../#/configuracion       → prórroga, mora y cobro de la etiqueta física
import { marcoHTML, avisoHTML, pintar, tomarAvisoPendiente, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { cambiarEstadoPago, generarLote, guardarConfiguracion } from '../acciones.js';
import { estadoHTML } from '../estados.js';
import { VARIANTES, COBRO_ETIQUETA } from '../datos/catalogos.js';
import { escapar, fechaHora, tiempoRelativo, numero } from '../formato.js';
import { nombreDe } from '../consultas.js';
import { DocumentoPDF } from '../pdf.js';
import { descargar } from '../excel.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);
let filtroPago = '';

function avisoPendienteHTML() {
  const texto = tomarAvisoPendiente();
  return texto ? avisoHTML('verde', 'circle-check', escapar(texto)) : '';
}

function errorEn(selector, e) {
  $(selector).innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
  lucide.createIcons({ root: $(selector) });
}

// Enlace que lleva cada QR: .../scanbox-app/c/AB12CD
export function enlaceDeEtiqueta(codigo) {
  return new URL(`c/${codigo}`, new URL('.', location.href)).href;
}

// ---------- Cartera de clientes ----------

export function pantallaAdmin() {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  const filas = datos.organizaciones
    .filter((o) => !filtroPago || o.estadoPago === filtroPago)
    .map((o) => ({
      o,
      usuarios: datos.usuarios.filter((u) => u.orgId === o.id && u.activo).length,
      etiquetas: datos.etiquetas.filter((e) => e.orgId === o.id).length,
      plan: datos.planes.find((p) => p.id === o.plan)?.nombre ?? '—',
    }));
  const contar = (estado) => datos.organizaciones.filter((o) => o.estadoPago === estado).length;
  const chip = (valor, texto) => `
    <button class="chip" data-filtro="${valor}" aria-pressed="${filtroPago === valor}">${texto}</button>`;

  pintar(marcoHTML(`
    ${avisoPendienteHTML()}
    <h1>Cartera de clientes</h1>
    <p class="texto-suave">${datos.organizaciones.length} organizaciones · modo supervisión: ScanBox ve cuentas y pagos, no el contenido de las cajas.</p>
    <div class="fila sugerencias">
      ${chip('', `Todos (${datos.organizaciones.length})`)}
      ${chip('al_dia', `Al día (${contar('al_dia')})`)}
      ${chip('prorroga', `En prórroga (${contar('prorroga')})`)}
      ${chip('bloqueado', `Bloqueados (${contar('bloqueado')})`)}
    </div>

    <div class="vista-tarjetas pila separado">${filas.map(({ o, usuarios, etiquetas, plan }) => `
      <a class="tarjeta tarjeta-enlace" href="#/admin/cliente/${o.id}">
        <span class="titulo-tarjeta">${escapar(o.nombre)}</span>
        <span class="texto-suave">${escapar(o.tipo)} · ${escapar(o.ciudad)} · plan ${plan.toLowerCase()}</span>
        ${estadoHTML(o.estadoPago)}
        <span class="texto-suave">Próximo pago: ${fechaHora(o.proximoPago)} · ${usuarios} usuarios · ${etiquetas} etiquetas</span>
      </a>`).join('') || '<p class="texto-suave">No hay clientes con ese estado.</p>'}
    </div>
    <div class="vista-tabla separado">
      <table class="tabla">
        <thead><tr><th>Cliente</th><th>Plan</th><th>Estado de pago</th><th>Próximo pago</th><th>Usuarios</th><th>Etiquetas</th></tr></thead>
        <tbody>${filas.map(({ o, usuarios, etiquetas, plan }) => `
          <tr>
            <td><a class="enlace" href="#/admin/cliente/${o.id}">${escapar(o.nombre)}</a><span class="texto-suave bloque">${escapar(o.tipo)} · ${escapar(o.ciudad)}</span></td>
            <td>${plan}</td>
            <td>${estadoHTML(o.estadoPago)}${o.recargoMora ? '<span class="texto-suave bloque">Con recargo por mora</span>' : ''}</td>
            <td>${fechaHora(o.proximoPago)}<span class="texto-suave bloque">${tiempoRelativo(o.proximoPago)}</span></td>
            <td>${usuarios}</td>
            <td>${etiquetas}</td>
          </tr>`).join('') || '<tr><td colspan="6">No hay clientes con ese estado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `, 'admin', persona));

  document.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
    filtroPago = b.dataset.filtro;
    pantallaAdmin();
  }));
}

// ---------- Detalle de un cliente ----------

export function pantallaAdminCliente(orgId) {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  const o = datos.organizaciones.find((org) => org.id === orgId);
  if (!o) return pintar(marcoHTML('<h1>Cliente no encontrado</h1>', 'admin', persona));

  const plan = datos.planes.find((p) => p.id === o.plan);
  const pagos = datos.pagos.filter((p) => p.orgId === o.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const eventos = datos.eventos.filter((ev) => ev.orgId === o.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const { prorrogaDias, moraPorcentaje } = datos.configuracion;

  const accion = (id, icono, texto, detalle, habilitada, estilo = 'btn-secundario') => `
    <button class="btn ${estilo} btn-bloque btn-izquierda" data-accion="${id}" ${habilitada ? '' : 'disabled'}>
      <i data-lucide="${icono}"></i><span>${texto}<span class="texto-suave bloque">${detalle}</span></span>
    </button>`;

  pintar(marcoHTML(`
    ${avisoPendienteHTML()}
    <p class="texto-suave"><a class="enlace" href="#/admin"><i data-lucide="arrow-left"></i> Cartera de clientes</a></p>
    <h1>${escapar(o.nombre)}</h1>
    <div class="fila">${estadoHTML(o.estadoPago)}${o.recargoMora ? `<span class="estado estado--ambar"><i data-lucide="percent"></i>Recargo por mora</span>` : ''}</div>

    <div class="columnas separado">
      <section>
        <section class="tarjeta">
          <dl class="datos">
            <div class="dato"><dt>Tipo</dt><dd>${escapar(o.tipo)} · ${escapar(o.ciudad)}</dd></div>
            <div class="dato"><dt>Plan</dt><dd>${plan.nombre} · ${plan.precio ?? 'Por definir'}</dd></div>
            <div class="dato"><dt>Próximo pago</dt><dd>${fechaHora(o.proximoPago)} (${tiempoRelativo(o.proximoPago)})</dd></div>
            ${o.prorrogaHasta ? `<div class="dato"><dt>Prórroga hasta</dt><dd>${fechaHora(o.prorrogaHasta)}</dd></div>` : ''}
            <div class="dato"><dt>Usuarios activos</dt><dd>${datos.usuarios.filter((u) => u.orgId === o.id && u.activo).length}</dd></div>
            <div class="dato"><dt>Etiquetas</dt><dd>${datos.etiquetas.filter((e) => e.orgId === o.id).length}</dd></div>
          </dl>
        </section>
        <h2>Acciones</h2>
        <div class="pila">
          ${accion('prorroga', 'calendar-clock', 'Activar prórroga', `${prorrogaDias} días para pagar la cuota más la mora`, o.estadoPago !== 'prorroga')}
          ${accion('recargo', 'percent', 'Aplicar recargo por mora', `${moraPorcentaje} % sobre la cuota`, !o.recargoMora)}
          ${accion('bloquear', 'lock', 'Bloquear ediciones', 'Solo podrán consultar; el historial no se borra', o.estadoPago !== 'bloqueado', 'btn-peligro')}
          ${accion('reactivar', 'circle-play', 'Reactivar', 'Queda al día y sin recargo', o.estadoPago !== 'al_dia' || o.recargoMora)}
        </div>
        <div id="mensaje" role="alert"></div>
      </section>
      <section>
        <h2>Historial de pagos</h2>
        ${pagos.length ? `<ul class="lista-simple">${pagos.map((p) => `
          <li class="fila-pago">
            <span><strong>${escapar(p.concepto)}</strong><span class="texto-suave bloque">${fechaHora(p.fecha)} · ${p.metodo} · ${p.monto ?? 'Por definir'}</span></span>
            ${p.estado === 'aprobado' ? '<span class="estado estado--verde"><i data-lucide="circle-check"></i>Aprobado</span>'
              : '<span class="estado estado--rojo"><i data-lucide="circle-x"></i>Rechazado</span>'}
          </li>`).join('')}</ul>` : '<p class="texto-suave">Sin pagos registrados.</p>'}
        <h2>Movimientos de la cuenta</h2>
        ${eventos.length ? `<ul class="lista-simple">${eventos.slice(0, 15).map((ev) => `
          <li>${escapar(ev.texto)}<span class="texto-suave bloque">${fechaHora(ev.fecha)}${ev.usuarioId ? ` · ${escapar(nombreDe(ev.usuarioId))}` : ''}</span></li>`).join('')}</ul>`
          : '<p class="texto-suave">Sin movimientos.</p>'}
      </section>
    </div>
  `, 'admin', persona));

  const textos = {
    prorroga: 'Prórroga activada.', recargo: 'Recargo por mora aplicado.',
    bloquear: 'Ediciones bloqueadas: el cliente solo puede consultar.', reactivar: 'Cuenta reactivada.',
  };
  document.querySelectorAll('[data-accion]').forEach((b) => b.addEventListener('click', () => {
    try {
      cambiarEstadoPago(o.id, b.dataset.accion);
      avisarEnLaSiguientePantalla(textos[b.dataset.accion]);
      pantallaAdminCliente(o.id);
    } catch (e) { errorEn('#mensaje', e); }
  }));
}

// ---------- Lotes de etiquetas ----------

export function pantallaLotes() {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  const lotes = [...datos.lotes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  pintar(marcoHTML(`
    ${avisoPendienteHTML()}
    <h1>Lotes de etiquetas</h1>
    <a class="btn btn-primario btn-bloque boton-ancho" href="#/lotes/nuevo"><i data-lucide="plus"></i>Generar lote</a>
    <ul class="lista-simple separado">${lotes.map((l) => {
      const org = datos.organizaciones.find((o) => o.id === l.orgId);
      const total = datos.etiquetas.filter((e) => e.lote === l.id).length;
      return `
        <li><a class="fila-enlace" href="#/lotes/${l.id}">
          <span class="circulo circulo--azul"><i data-lucide="qr-code"></i></span>
          <span class="fila-enlace-texto"><strong>${l.id} · ${total} etiquetas</strong>
            <span class="texto-suave bloque">${escapar(org?.nombre ?? '—')} · ${VARIANTES[l.variante].texto} · ${fechaHora(l.fecha)}</span></span>
          <i data-lucide="chevron-right"></i>
        </a></li>`;
    }).join('')}</ul>
  `, 'lotes', persona));
}

export function pantallaNuevoLote() {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  pintar(marcoHTML(`
    <p class="texto-suave"><a class="enlace" href="#/lotes"><i data-lucide="arrow-left"></i> Lotes</a></p>
    <h1>Generar lote</h1>
    <form id="form-lote" class="pila contenido-angosto" novalidate>
      <label class="campo">Cliente
        <select name="org">${datos.organizaciones.map((o) => `<option value="${o.id}">${escapar(o.nombre)}</option>`).join('')}</select>
      </label>
      <label class="campo">Variante
        <select name="variante">${Object.entries(VARIANTES).map(([id, v]) => `<option value="${id}">${v.texto} · ${v.detalle}</option>`).join('')}</select>
      </label>
      <label class="campo">Cantidad (1 a 500)
        <input name="cantidad" type="number" inputmode="numeric" min="1" max="500" value="12">
      </label>
      <p class="texto-suave">Cada código es único: 2 letras, 2 números y 2 letras, sin I ni O para no confundirlas con 1 y 0.</p>
      <div id="mensaje" role="alert"></div>
      <button type="submit" class="btn btn-primario btn-bloque"><i data-lucide="qr-code"></i>Generar códigos</button>
    </form>
  `, 'lotes', persona));

  $('#form-lote').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    try {
      const { lote, codigos } = generarLote(f.org.value, f.variante.value, f.cantidad.value);
      avisarEnLaSiguientePantalla(`Lote ${lote.id} generado con ${codigos.length} códigos únicos.`);
      ir(`/lotes/${lote.id}`, { reemplazar: true });
    } catch (e) { errorEn('#mensaje', e); }
  });
}

async function cargarQR() {
  const { default: qrcode } = await import('../vendor/qrcode.min.mjs');
  return (texto) => {
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    return qr;
  };
}

// PDF para producción: 12 etiquetas por hoja A4 (3 × 4), con QR vectorial y código
async function descargarPDF(lote, etiquetas, organizacion) {
  const crearQR = await cargarQR();
  const pdf = new DocumentoPDF();
  const porHoja = 12;
  const hojas = Math.ceil(etiquetas.length / porHoja);
  const ancho = 62;
  const alto = 64;
  const margenX = (210 - ancho * 3) / 2;
  const margenY = 24;

  etiquetas.forEach((etiqueta, i) => {
    const posicion = i % porHoja;
    if (posicion === 0) {
      if (i) pdf.nuevaPagina();
      const hoja = Math.floor(i / porHoja) + 1;
      pdf.texto(margenX, 14, `ScanBox · Lote ${lote.id} · ${organizacion.nombre}`, { tamano: 11, negrita: true });
      pdf.texto(margenX, 19, `${VARIANTES[lote.variante].texto} · ${etiquetas.length} etiquetas · hoja ${hoja} de ${hojas}`, { tamano: 8, color: '#4A5868' });
    }
    const x = margenX + (posicion % 3) * ancho;
    const y = margenY + Math.floor(posicion / 3) * alto;
    pdf.rectangulo(x + 1, y + 1, ancho - 2, alto - 2, { borde: '#C8D0D8', grosor: 0.2 });   // guía de corte
    pdf.qr(crearQR(enlaceDeEtiqueta(etiqueta.codigo)), x + (ancho - 42) / 2, y + 4, 42);
    pdf.texto(x, y + 54, etiqueta.codigo, { tamano: 18, negrita: true, centrado: true, anchoCaja: ancho });
    pdf.texto(x, y + 59.5, `ScanBox · ${VARIANTES[lote.variante].texto}`, { tamano: 7, color: '#4A5868', centrado: true, anchoCaja: ancho });
  });

  descargar(pdf.generar(), `scanbox-lote-${lote.id}.pdf`);
}

export async function pantallaLote(loteId) {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  const lote = datos.lotes.find((l) => l.id === loteId);
  if (!lote) return pintar(marcoHTML('<h1>Lote no encontrado</h1>', 'lotes', persona));
  const organizacion = datos.organizaciones.find((o) => o.id === lote.orgId);
  const etiquetas = datos.etiquetas.filter((e) => e.lote === lote.id);
  const contar = (estado) => etiquetas.filter((e) => e.estado === estado).length;
  const MUESTRA = 12;

  pintar(marcoHTML(`
    ${avisoPendienteHTML()}
    <p class="texto-suave"><a class="enlace" href="#/lotes"><i data-lucide="arrow-left"></i> Lotes</a></p>
    <h1>Lote ${lote.id}</h1>
    <p>${escapar(organizacion.nombre)} · ${VARIANTES[lote.variante].texto} · ${numero(etiquetas.length)} etiquetas · ${fechaHora(lote.fecha)}</p>
    <p class="texto-suave">${contar('sin_asignar')} sin asignar · ${contar('asignada')} asignadas · ${contar('desactivada')} desactivadas</p>
    <button id="btn-pdf" class="btn btn-primario btn-bloque boton-ancho"><i data-lucide="download"></i>Descargar PDF para producción</button>
    <div id="mensaje" role="alert"></div>
    <h2>Vista previa</h2>
    <div id="vista-previa" class="rejilla-qr"><p class="texto-suave">Generando vista previa…</p></div>
    ${etiquetas.length > MUESTRA ? `<p class="texto-suave">Y ${etiquetas.length - MUESTRA} más en el PDF.</p>` : ''}
  `, 'lotes', persona));

  $('#btn-pdf').addEventListener('click', async () => {
    try { await descargarPDF(lote, etiquetas, organizacion); } catch (e) { errorEn('#mensaje', e); }
  });

  try {
    const crearQR = await cargarQR();
    $('#vista-previa').innerHTML = etiquetas.slice(0, MUESTRA).map((e) => `
      <figure class="etiqueta-muestra">
        ${crearQR(enlaceDeEtiqueta(e.codigo)).createSvgTag({ cellSize: 3, margin: 2, scalable: true })}
        <figcaption><strong class="codigo">${e.codigo}</strong>${estadoHTML(e.estado)}</figcaption>
      </figure>`).join('');
    lucide.createIcons({ root: $('#vista-previa') });
  } catch (e) {
    errorEn('#vista-previa', e);
  }
}

// ---------- Configuración ----------

export function pantallaConfiguracion() {
  const persona = usuarioActual();
  const { configuracion, planes } = obtenerDatos();

  pintar(marcoHTML(`
    ${avisoPendienteHTML()}
    <h1>Configuración</h1>
    <form id="form-config" class="pila contenido-angosto" novalidate>
      <section class="tarjeta pila">
        <h2 class="titulo-bloque">Falta de pago</h2>
        <label class="campo">Duración de la prórroga (días)
          <input name="prorroga" type="number" inputmode="numeric" min="1" max="60" value="${configuracion.prorrogaDias}">
        </label>
        <label class="campo">Porcentaje de mora (%)
          <input name="mora" type="number" inputmode="decimal" min="0" max="50" step="0.5" value="${configuracion.moraPorcentaje}">
        </label>
        <p class="texto-suave">Valores de ejemplo (7 días y 5 %): ajústalos cuando se definan las condiciones comerciales.</p>
      </section>
      <section class="tarjeta pila">
        <h2 class="titulo-bloque">Cobro de la etiqueta física</h2>
        <label class="campo">Modalidad
          <select name="cobro">
            <option value="">Sin definir</option>
            ${Object.entries(COBRO_ETIQUETA).map(([id, texto]) => `<option value="${id}" ${configuracion.cobroEtiqueta === id ? 'selected' : ''}>${texto}</option>`).join('')}
          </select>
        </label>
        <p class="texto-suave">No hay precios definidos: todos se muestran como "Por definir".</p>
      </section>
      <section class="tarjeta">
        <h2 class="titulo-bloque">Planes</h2>
        <dl class="datos">${planes.map((p) => `<div class="dato"><dt>${p.nombre}</dt><dd>${p.precio ?? 'Por definir'}</dd></div>`).join('')}</dl>
      </section>
      <div id="mensaje" role="alert"></div>
      <button type="submit" class="btn btn-primario btn-bloque"><i data-lucide="save"></i>Guardar configuración</button>
    </form>
  `, 'configuracion', persona));

  $('#form-config').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    try {
      guardarConfiguracion({ prorrogaDias: f.prorroga.value, moraPorcentaje: f.mora.value, cobroEtiqueta: f.cobro.value });
      avisarEnLaSiguientePantalla('Configuración guardada.');
      pantallaConfiguracion();
    } catch (e) { errorEn('#mensaje', e); }
  });
}
