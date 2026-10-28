// Pantallas provisionales: muestran que la navegación y los permisos funcionan.
// Cada una se reemplaza por la pantalla real en la etapa indicada.
import { marcoHTML, avisoHTML, pintar } from '../marco.js';
import { usuarioActual, puedeVerFicha } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { estadoHTML } from '../estados.js';
import { TIPOS_EQUIPO } from '../datos/catalogos.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, fechaHora, tiempoRelativo } from '../formato.js';

function enConstruccion(etapa) {
  return avisoHTML('azul', 'hammer', `Esta pantalla se construye en la etapa ${etapa}.`);
}

function provisional(seccion, titulo, etapa) {
  return () => pintar(marcoHTML(`
    <h1>${titulo}</h1>
    ${enConstruccion(etapa)}
  `, seccion, usuarioActual()));
}

export const pantallaEscanear = provisional('escanear', 'Escanear', 6);
export const pantallaCajas = provisional('cajas', 'Cajas', 10);
export const pantallaAdmin = provisional('admin', 'Panel de ScanBox', 13);

export const pantallaTrayecto = provisional('inicio', 'Iniciar trayecto', 9);

// El código es opcional: desde Inicio se llega sin código
export function pantallaAsignar(codigo) {
  const titulo = codigo ? `Asignar etiqueta ${escapar(codigo.toUpperCase())}` : 'Asignar etiqueta';
  pintar(marcoHTML(`
    <h1>${titulo}</h1>
    ${enConstruccion(7)}
  `, 'escanear', usuarioActual()));
}

function tarjetaFichaHTML(ficha) {
  return `
    <a class="tarjeta tarjeta-enlace" href="#/ficha/${ficha.id}">
      <span class="texto-suave">${TIPOS_EQUIPO[ficha.tipo].texto}</span>
      <span class="titulo-tarjeta">${formatearNumero(ficha.numeroEquipo)}</span>
      ${estadoHTML(ficha.estado)}
    </a>`;
}

export function pantallaInvitado() {
  const persona = usuarioActual();
  const fichas = obtenerDatos().fichas.filter((f) => persona.fichas.includes(f.id));
  pintar(marcoHTML(`
    <h1>Mis fichas</h1>
    ${avisoHTML('azul', 'eye',
      `Acceso de solo lectura. Vence ${tiempoRelativo(persona.vence)} (${fechaHora(persona.vence)}).`)}
    <div class="pila separado">${fichas.map(tarjetaFichaHTML).join('')}</div>
  `, 'invitado', persona));
}

export function pantallaFicha(id) {
  const persona = usuarioActual();
  const ficha = obtenerDatos().fichas.find((f) => f.id === id);
  const seccion = persona.rol === 'invitado' ? 'invitado' : 'cajas';

  if (!puedeVerFicha(persona, ficha)) {
    return pintar(marcoHTML(`
      <h1>Ficha no disponible</h1>
      ${avisoHTML('rojo', 'lock', 'No tienes acceso a esta ficha.')}
    `, seccion, persona));
  }

  pintar(marcoHTML(`
    ${persona.rol === 'invitado' ? avisoHTML('azul', 'eye', 'Acceso de solo lectura') : ''}
    <p class="texto-suave">${TIPOS_EQUIPO[ficha.tipo].texto}</p>
    <h1>${formatearNumero(ficha.numeroEquipo)}</h1>
    <p>${estadoHTML(ficha.estado)}</p>
    <p>Etiqueta <strong>${ficha.etiqueta ?? '—'}</strong> · ${escapar(ficha.ubicacion)}</p>
    ${enConstruccion(5)}
  `, seccion, persona));
}