// Pantallas provisionales: muestran que la navegación y los permisos funcionan.
// Cada una se reemplaza por la pantalla real en la etapa indicada.
import { marcoHTML, avisoHTML, pintar } from '../marco.js';
import { usuarioActual } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { estadoHTML } from '../estados.js';
import { TIPOS_EQUIPO } from '../datos/catalogos.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, fechaHora, tiempoRelativo } from '../formato.js';

function enConstruccion(etapa) {
  return avisoHTML('azul', 'hammer', `Esta pantalla se construye en la etapa ${etapa}.`);
}

function volverAFicha(fichaId) {
  return fichaId
    ? `<p><a class="enlace" href="#/ficha/${escapar(fichaId)}"><i data-lucide="arrow-left"></i> Volver a la ficha</a></p>`
    : '';
}

// Fabrica una pantalla provisional. Si recibe el id de una ficha, ofrece volver a ella.
function provisional(seccion, titulo, etapa) {
  return (fichaId) => pintar(marcoHTML(`
    <h1>${titulo}</h1>
    ${enConstruccion(etapa)}
    ${volverAFicha(fichaId)}
  `, seccion, usuarioActual()));
}

export const pantallaCajas = provisional('cajas', 'Cajas', 10);
export const pantallaAdmin = provisional('admin', 'Panel de ScanBox', 13);
export const pantallaTrayecto = provisional('cajas', 'Trayecto', 9);
export const pantallaEditar = provisional('cajas', 'Editar contenido', 8);
export const pantallaFoto = provisional('cajas', 'Agregar foto', 8);

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
