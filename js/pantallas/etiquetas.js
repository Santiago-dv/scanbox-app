// Etiquetas (sección 5.10): inventario, desactivar, transferir ficha e historial de cada etiqueta.
// .../#/etiquetas         → inventario de la empresa
// .../#/etiquetas/KM47TR  → detalle de una etiqueta
import { marcoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla, tomarAvisoPendiente } from '../marco.js';
import { usuarioActual, esAdminEmpresa, puedeEditar } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { buscarFicha, nombreDe } from '../consultas.js';
import { desactivarEtiqueta, transferirFicha } from '../acciones.js';
import { ESTADOS, estadoHTML } from '../estados.js';
import { VARIANTES, MOTIVOS_DESACTIVACION } from '../datos/catalogos.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, fechaHora } from '../formato.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);
let filtroEstado = '';

function sinPermiso(persona) {
  pintar(marcoHTML(`
    <h1>Etiquetas</h1>
    ${avisoHTML('rojo', 'lock', 'Solo el administrador de la empresa puede ver el inventario de etiquetas.')}
  `, 'mas', persona));
}

export function pantallaEtiquetas() {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona)) return sinPermiso(persona);

  const pendiente = tomarAvisoPendiente();
  const etiquetas = obtenerDatos().etiquetas.filter((e) => e.orgId === persona.orgId);
  const contar = (estado) => etiquetas.filter((e) => e.estado === estado).length;

  pintar(marcoHTML(`
    ${pendiente ? avisoHTML('verde', 'circle-check', escapar(pendiente)) : ''}
    <h1>Etiquetas</h1>
    <div class="metricas metricas--3">
      ${['sin_asignar', 'asignada', 'desactivada'].map((estado) => `
        <button class="tarjeta metrica boton-metrica ${filtroEstado === estado ? 'activa' : ''}" data-estado="${estado}">
          <span class="circulo circulo--${ESTADOS[estado].color}"><i data-lucide="${ESTADOS[estado].icono}"></i></span>
          <span class="numero-grande">${contar(estado)}</span>
          <span class="texto-suave">${ESTADOS[estado].texto}</span>
        </button>`).join('')}
    </div>
    <p class="texto-suave separado">${filtroEstado ? `Mostrando: ${ESTADOS[filtroEstado].texto}. <button class="enlace boton-texto" data-estado="">Ver todas</button>` : `${etiquetas.length} etiquetas en total. Toca un estado para filtrar.`}</p>
    <ul class="lista-simple lista-etiquetas">
      ${etiquetas.filter((e) => !filtroEstado || e.estado === filtroEstado).map((e) => {
        const ficha = e.fichaId ? buscarFicha(e.fichaId) : null;
        return `
          <li><a class="fila-enlace" href="#/etiquetas/${e.codigo}">
            <span><strong class="codigo">${e.codigo}</strong>
              <span class="texto-suave bloque">${VARIANTES[e.variante].texto} · lote ${e.lote}${ficha ? ` · ${formatearNumero(ficha.numeroEquipo)}` : ''}</span></span>
            ${estadoHTML(e.estado)}
          </a></li>`;
      }).join('')}
    </ul>
  `, 'mas', persona));

  document.querySelectorAll('[data-estado]').forEach((boton) => boton.addEventListener('click', () => {
    filtroEstado = boton.dataset.estado === filtroEstado ? '' : boton.dataset.estado;
    pantallaEtiquetas();
  }));
}

// Historial de la etiqueta: movimientos de las fichas donde aparece y eventos de la cuenta
function historialEtiqueta(codigo, orgId) {
  const datos = obtenerDatos();
  const deFichas = datos.auditoria
    .filter((r) => r.detalle.includes(codigo) || r.antes === codigo || r.despues === codigo)
    .filter((r) => datos.fichas.find((f) => f.id === r.fichaId)?.orgId === orgId)
    .map((r) => ({ fecha: r.horaTelefono, texto: r.detalle, usuarioId: r.usuarioId, fichaId: r.fichaId }));
  const deEventos = datos.eventos
    .filter((ev) => ev.orgId === orgId && ev.etiqueta === codigo && !deFichas.some((f) => f.texto === ev.texto))
    .map((ev) => ({ fecha: ev.fecha, texto: ev.texto, usuarioId: ev.usuarioId }));
  const escaneos = datos.alertas
    .filter((a) => a.orgId === orgId && a.etiqueta === codigo)
    .map((a) => ({ fecha: a.fecha, texto: a.texto, usuarioId: a.usuarioId, alerta: true }));
  return [...deFichas, ...deEventos, ...escaneos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function pantallaEtiqueta(codigoEnDireccion) {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona)) return sinPermiso(persona);
  const codigo = codigoEnDireccion.toUpperCase();
  const datos = obtenerDatos();
  const etiqueta = datos.etiquetas.find((e) => e.codigo === codigo && e.orgId === persona.orgId);
  if (!etiqueta) {
    return pintar(marcoHTML(`<h1>Etiqueta ${escapar(codigo)}</h1>${avisoHTML('rojo', 'lock', 'Esta etiqueta no pertenece a tu organización.')}`, 'mas', persona));
  }

  const pendiente = tomarAvisoPendiente();
  const ficha = etiqueta.fichaId ? buscarFicha(etiqueta.fichaId) : null;
  const libres = datos.etiquetas.filter((e) => e.orgId === persona.orgId && e.estado === 'sin_asignar');
  const editable = puedeEditar(persona);
  const historial = historialEtiqueta(codigo, persona.orgId);

  let acciones = '';
  if (!editable) {
    acciones = avisoHTML('rojo', 'lock', 'Tu organización está bloqueada por falta de pago: no se pueden desactivar ni transferir etiquetas.');
  } else if (etiqueta.estado !== 'desactivada') {
    acciones = `
      <form id="form-desactivar" class="tarjeta pila" novalidate>
        <h2 class="titulo-bloque">Marcar como desactivada</h2>
        <p class="texto-suave">Úsalo si la etiqueta se perdió o se dañó. ${ficha ? 'Después podrás transferir su ficha a una etiqueta nueva sin perder el historial.' : ''}</p>
        <label class="campo">Motivo
          <select name="motivo">${MOTIVOS_DESACTIVACION.map((m) => `<option>${m}</option>`).join('')}</select>
        </label>
        <button type="submit" class="btn btn-peligro btn-bloque"><i data-lucide="ban"></i>Desactivar etiqueta</button>
      </form>`;
  }
  if (editable && etiqueta.estado === 'desactivada' && ficha) {
    acciones = `
      <form id="form-transferir" class="tarjeta pila" novalidate>
        <h2 class="titulo-bloque">Transferir ficha a una etiqueta nueva</h2>
        <p class="texto-suave">La ficha ${formatearNumero(ficha.numeroEquipo)} conserva todo su historial; solo cambia la etiqueta.</p>
        ${libres.length ? `
          <label class="campo">Etiqueta nueva
            <select name="nueva">${libres.map((e) => `<option value="${e.codigo}">${e.codigo} · ${VARIANTES[e.variante].texto}</option>`).join('')}</select>
          </label>
          <button type="submit" class="btn btn-primario btn-bloque"><i data-lucide="arrow-right-left"></i>Transferir ficha</button>`
          : avisoHTML('ambar', 'tag', 'No hay etiquetas libres. Pide un lote nuevo a ScanBox.')}
      </form>`;
  }

  pintar(marcoHTML(`
    ${pendiente ? avisoHTML('verde', 'circle-check', escapar(pendiente)) : ''}
    <p class="texto-suave"><a class="enlace" href="#/etiquetas"><i data-lucide="arrow-left"></i> Etiquetas</a></p>
    <h1 class="codigo">${codigo}</h1>
    <div class="fila">${estadoHTML(etiqueta.estado)}<span class="estado estado--gris">${VARIANTES[etiqueta.variante].texto}</span></div>
    <section class="tarjeta separado">
      <dl class="datos">
        <div class="dato"><dt>Lote</dt><dd>${etiqueta.lote}</dd></div>
        <div class="dato"><dt>Ficha</dt><dd>${ficha ? `<a class="enlace" href="#/ficha/${ficha.id}">${formatearNumero(ficha.numeroEquipo)}</a>` : '—'}</dd></div>
        ${etiqueta.motivo ? `<div class="dato"><dt>Motivo de desactivación</dt><dd>${escapar(etiqueta.motivo)}</dd></div>` : ''}
      </dl>
    </section>
    ${acciones}
    <div id="mensaje" role="alert"></div>
    <h2>Historial de la etiqueta</h2>
    ${historial.length ? `<ul class="lista-registros">${historial.map((h) => `
      <li class="registro">
        <span class="circulo circulo--${h.alerta ? 'rojo' : 'gris'}"><i data-lucide="${h.alerta ? 'triangle-alert' : 'tag'}"></i></span>
        <span><strong>${escapar(h.texto)}</strong>
          <span class="texto-suave bloque">${escapar(nombreDe(h.usuarioId))} · ${fechaHora(h.fecha)}</span>
          ${h.fichaId ? `<a class="enlace" href="#/ficha/${h.fichaId}/historial">Ver ficha</a>` : ''}</span>
      </li>`).join('')}</ul>` : '<p class="texto-suave">Esta etiqueta todavía no tiene movimientos.</p>'}
  `, 'mas', persona));

  const error = (e) => {
    $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
    lucide.createIcons({ root: $('#mensaje') });
  };
  $('#form-desactivar')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    try {
      desactivarEtiqueta(codigo, evento.target.motivo.value);
      avisarEnLaSiguientePantalla(ficha ? 'Etiqueta desactivada. Ahora transfiere la ficha a una etiqueta nueva.' : 'Etiqueta desactivada.');
      pantallaEtiqueta(codigo);
    } catch (e) { error(e); }
  });
  $('#form-transferir')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    try {
      const nueva = evento.target.nueva.value;
      const transferida = transferirFicha(codigo, nueva);
      avisarEnLaSiguientePantalla(`Ficha transferida a la etiqueta ${nueva}. El historial se conservó.`);
      ir(`/ficha/${transferida.id}`);
    } catch (e) { error(e); }
  });
}
