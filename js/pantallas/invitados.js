// Invitados (sección 5.9): cuentas temporales de solo lectura con fecha de vencimiento.
// .../#/invitados        → activos, vencidos y revocados
// .../#/invitados/nuevo  → crear cuenta de invitado
import { marcoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla, tomarAvisoPendiente } from '../marco.js';
import { usuarioActual, puedeGestionarInvitados } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { fichasDelAmbito, nombreDe } from '../consultas.js';
import { crearInvitado, revocarInvitado } from '../acciones.js';
import { TIPOS_INVITADO, TIPOS_EQUIPO } from '../datos/catalogos.js';
import { estadoHTML } from '../estados.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, fechaHora, tiempoRelativo } from '../formato.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);

function sinPermiso(persona) {
  pintar(marcoHTML(`
    <h1>Invitados</h1>
    ${avisoHTML('rojo', 'lock', 'Solo un supervisor o el administrador puede gestionar invitados, y la empresa debe estar al día con el pago.')}
  `, 'mas', persona));
}

function estadoInvitado(invitado) {
  if (invitado.revocado) return '<span class="estado estado--rojo"><i data-lucide="ban"></i>Revocado</span>';
  if (new Date(invitado.vence) <= new Date()) return '<span class="estado estado--gris"><i data-lucide="clock"></i>Vencido</span>';
  const horas = (new Date(invitado.vence) - Date.now()) / 3600000;
  return horas < 24
    ? '<span class="estado estado--ambar"><i data-lucide="clock"></i>Vence pronto</span>'
    : '<span class="estado estado--verde"><i data-lucide="circle-check"></i>Activo</span>';
}

function invitadoHTML(invitado, activo) {
  const fichas = obtenerDatos().fichas.filter((f) => invitado.fichas.includes(f.id));
  return `
    <li class="tarjeta">
      <div class="fila-edicion-titulo">
        <span>
          <strong>${escapar(invitado.nombre)}</strong>
          <span class="texto-suave bloque">${escapar(invitado.tipo)}</span>
        </span>
        ${estadoInvitado(invitado)}
      </div>
      <p class="texto-suave correo">${escapar(invitado.correo)}</p>
      <p class="texto-suave">${activo ? 'Vence' : 'Venció'} ${tiempoRelativo(invitado.vence)} (${fechaHora(invitado.vence)}) · creado por ${escapar(nombreDe(invitado.creadoPor))}</p>
      <p>Fichas: ${fichas.map((f) => `<a class="enlace" href="#/ficha/${f.id}">${formatearNumero(f.numeroEquipo)}</a>`).join(', ')}</p>
      ${activo ? `<button class="btn btn-peligro btn-bloque" data-revocar="${invitado.id}"><i data-lucide="user-x"></i>Revocar acceso</button>` : ''}
    </li>`;
}

export function pantallaInvitados() {
  const persona = usuarioActual();
  if (!puedeGestionarInvitados(persona)) return sinPermiso(persona);

  const pendiente = tomarAvisoPendiente();
  const invitados = obtenerDatos().invitados.filter((i) => i.orgId === persona.orgId);
  const vigente = (i) => !i.revocado && new Date(i.vence) > new Date();
  const activos = invitados.filter(vigente).sort((a, b) => new Date(a.vence) - new Date(b.vence));
  const otros = invitados.filter((i) => !vigente(i));

  pintar(marcoHTML(`
    ${pendiente ? avisoHTML('verde', 'circle-check', pendiente) : ''}
    <h1>Invitados</h1>
    <p class="texto-suave">Conductores, receptores e inspectores que solo pueden ver las fichas que les compartas, hasta la fecha que elijas.</p>
    <a class="btn btn-primario btn-bloque" href="#/invitados/nuevo"><i data-lucide="user-plus"></i>Crear cuenta de invitado</a>
    <h2>Activos (${activos.length})</h2>
    ${activos.length ? `<ul class="lista-tarjetas">${activos.map((i) => invitadoHTML(i, true)).join('')}</ul>`
      : '<p class="texto-suave">No hay invitados activos.</p>'}
    <details class="separado">
      <summary class="resumen-desplegable">Vencidos o revocados (${otros.length})</summary>
      <ul class="lista-tarjetas">${otros.map((i) => invitadoHTML(i, false)).join('')}</ul>
    </details>
    <div id="mensaje" role="alert"></div>
  `, 'mas', persona));

  document.querySelectorAll('[data-revocar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      try {
        revocarInvitado(boton.dataset.revocar);
        avisarEnLaSiguientePantalla('Acceso revocado. El invitado ya no puede entrar.');
        pantallaInvitados();
      } catch (e) {
        $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
      }
    });
  });
}

// Fecha para <input type="datetime-local">: "2026-10-28T18:00" en hora local
function fechaLocal(fecha) {
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha - desfase).toISOString().slice(0, 16);
}

export function pantallaNuevoInvitado() {
  const persona = usuarioActual();
  if (!puedeGestionarInvitados(persona)) return sinPermiso(persona);

  const fichas = fichasDelAmbito(persona).filter((f) => !['entregado', 'archivado'].includes(f.estado));
  const manana = new Date(Date.now() + 24 * 3600000);

  pintar(marcoHTML(`
    <p class="texto-suave"><a class="enlace" href="#/invitados"><i data-lucide="arrow-left"></i> Invitados</a></p>
    <h1>Crear cuenta de invitado</h1>
    <form id="form-invitado" class="pila" novalidate>
      <label class="campo">Nombre <input name="nombre" autocomplete="off"></label>
      <label class="campo">Correo <input name="correo" type="email" inputmode="email" autocomplete="off"></label>
      <label class="campo">Rol
        <select name="tipo">${TIPOS_INVITADO.map((t) => `<option>${t}</option>`).join('')}</select>
      </label>
      <label class="campo">Acceso hasta
        <input name="vence" type="datetime-local" value="${fechaLocal(manana)}" min="${fechaLocal(new Date())}">
      </label>
      <fieldset class="tarjeta">
        <legend class="titulo-bloque">Fichas que podrá ver</legend>
        ${fichas.length ? fichas.map((f) => `
          <label class="opcion">
            <input type="checkbox" name="fichas" value="${f.id}">
            <span><strong>${formatearNumero(f.numeroEquipo)}</strong>
              <span class="texto-suave bloque">${TIPOS_EQUIPO[f.tipo].texto} · ${escapar(f.pedido.cliente || 'Sin cliente')}</span>
              ${estadoHTML(f.estado)}</span>
          </label>`).join('') : '<p class="texto-suave">No hay fichas abiertas en tu área.</p>'}
      </fieldset>
      <div id="mensaje" role="alert"></div>
      <div class="pie-paso">
        <a class="btn btn-secundario" href="#/invitados">Cancelar</a>
        <button type="submit" class="btn btn-primario"><i data-lucide="user-plus"></i>Crear cuenta</button>
      </div>
    </form>
  `, 'mas', persona));

  $('#form-invitado').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    try {
      const { invitado, clave } = crearInvitado({
        nombre: f.nombre.value, correo: f.correo.value, tipo: f.tipo.value,
        fichas: [...f.querySelectorAll('input[name="fichas"]:checked')].map((c) => c.value),
        vence: f.vence.value,
      });
      // La clave temporal se muestra una sola vez para compartirla
      pintar(marcoHTML(`
        <h1>Cuenta creada</h1>
        ${avisoHTML('verde', 'circle-check', `${escapar(invitado.nombre)} ya puede entrar a ScanBox con estos datos. Su acceso vence el ${fechaHora(invitado.vence)}`)}
        <section class="tarjeta">
          <dl class="datos">
            <div class="dato"><dt>Correo</dt><dd>${escapar(invitado.correo)}</dd></div>
            <div class="dato"><dt>Clave temporal</dt><dd class="clave">${clave}</dd></div>
          </dl>
        </section>
        <p class="texto-suave">Compártelos por un canal seguro. Por seguridad, la clave no se vuelve a mostrar.</p>
        <a class="btn btn-primario btn-bloque" href="#/invitados">Listo</a>
      `, 'mas', persona));
    } catch (e) {
      $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
      lucide.createIcons({ root: $('#mensaje') });
    }
  });
}

// "Mis fichas" del invitado: solo lectura, con su fecha de vencimiento
export function pantallaMisFichas() {
  const persona = usuarioActual();
  const fichas = obtenerDatos().fichas.filter((f) => persona.fichas.includes(f.id));
  pintar(marcoHTML(`
    <h1>Mis fichas</h1>
    ${avisoHTML('azul', 'eye',
      `Acceso de solo lectura. Vence ${tiempoRelativo(persona.vence)} (${fechaHora(persona.vence)}).`)}
    <div class="pila separado">${fichas.map((f) => `
      <a class="tarjeta tarjeta-enlace" href="#/ficha/${f.id}">
        <span class="texto-suave">${TIPOS_EQUIPO[f.tipo].texto}</span>
        <span class="titulo-tarjeta">${formatearNumero(f.numeroEquipo)}</span>
        ${estadoHTML(f.estado)}
      </a>`).join('')}</div>
  `, 'invitado', persona));
}
