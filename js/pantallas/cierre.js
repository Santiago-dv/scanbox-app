// Cierre y reasignación (sección 5.7):
// .../#/cerrar/f01   → cerrar la ficha como Entregado o Archivado
// .../#/liberar/f01  → la etiqueta vuelve a "Sin asignar"
import { marcoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual, puedeCerrar } from '../sesion.js';
import { buscarFicha } from '../consultas.js';
import { cerrarFicha, liberarEtiqueta } from '../acciones.js';
import { pedirCoordenadas } from '../ubicacion.js';
import { formatearNumero } from '../iso6346.js';
import { escapar } from '../formato.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);
const CERRADOS = ['entregado', 'archivado'];

function sinPermiso(persona, ficha, titulo, texto) {
  pintar(marcoHTML(`
    <h1>${titulo}</h1>
    ${avisoHTML('rojo', 'lock', texto)}
    ${ficha ? `<a class="enlace" href="#/ficha/${ficha.id}"><i data-lucide="arrow-left"></i> Volver a la ficha</a>` : ''}
  `, 'cajas', persona));
}

function encabezado(ficha) {
  return `<p class="texto-suave"><a class="enlace" href="#/ficha/${ficha.id}"><i data-lucide="arrow-left"></i> ${formatearNumero(ficha.numeroEquipo)}</a></p>`;
}

export function pantallaCerrar(fichaId) {
  const persona = usuarioActual();
  const ficha = buscarFicha(fichaId);
  if (!puedeCerrar(persona, ficha)) {
    return sinPermiso(persona, ficha, 'Cerrar ficha', 'Solo un supervisor o el administrador puede cerrar fichas, y la empresa debe estar al día con el pago.');
  }
  if (CERRADOS.includes(ficha.estado)) {
    return sinPermiso(persona, ficha, 'Cerrar ficha', 'Esta ficha ya está cerrada.');
  }
  if (ficha.estado === 'en_transito') {
    return sinPermiso(persona, ficha, 'Cerrar ficha', 'El equipo está en tránsito. Registra la llegada al destino antes de cerrar la ficha.');
  }

  let coordenadas = null;
  pedirCoordenadas().then((c) => { coordenadas = c; });

  pintar(marcoHTML(`
    ${encabezado(ficha)}
    <h1>Cerrar ficha</h1>
    <form id="form-cerrar" class="pila" novalidate>
      <label class="opcion">
        <input type="radio" name="estado" value="entregado" ${ficha.trayecto?.estado === 'completado' ? 'checked' : ''}>
        <span><strong>Entregado</strong><span class="texto-suave bloque">Llegó a su destino y se entregó al cliente.</span></span>
      </label>
      <label class="opcion">
        <input type="radio" name="estado" value="archivado">
        <span><strong>Archivado</strong><span class="texto-suave bloque">Se desembaló o ya no se usa.</span></span>
      </label>
      ${avisoHTML('azul', 'info', 'La ficha quedará de solo lectura. El historial completo se conserva y no cambia.')}
      <div id="mensaje" role="alert"></div>
      <div class="pie-paso">
        <a class="btn btn-secundario" href="#/ficha/${ficha.id}">Cancelar</a>
        <button type="submit" class="btn btn-primario"><i data-lucide="circle-check"></i>Cerrar ficha</button>
      </div>
    </form>
  `, 'cajas', persona));

  $('#form-cerrar').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const elegido = document.querySelector('input[name="estado"]:checked')?.value;
    try {
      if (!elegido) throw new Error('Elige si quedó Entregado o Archivado.');
      cerrarFicha(ficha.id, elegido, { coordenadas });
      avisarEnLaSiguientePantalla('Ficha cerrada. Si la etiqueta se va a reutilizar, ya puedes liberarla.');
      ir(`/ficha/${ficha.id}`, { reemplazar: true });
    } catch (e) {
      $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
      lucide.createIcons({ root: $('#mensaje') });
    }
  });
}

export function pantallaLiberar(fichaId) {
  const persona = usuarioActual();
  const ficha = buscarFicha(fichaId);
  if (!puedeCerrar(persona, ficha)) {
    return sinPermiso(persona, ficha, 'Liberar etiqueta', 'Solo un supervisor o el administrador puede liberar etiquetas, y la empresa debe estar al día con el pago.');
  }
  if (!CERRADOS.includes(ficha.estado) || !ficha.etiqueta) {
    return sinPermiso(persona, ficha, 'Liberar etiqueta', 'Primero cierra la ficha. Solo se liberan etiquetas de fichas cerradas.');
  }

  let coordenadas = null;
  pedirCoordenadas().then((c) => { coordenadas = c; });

  pintar(marcoHTML(`
    ${encabezado(ficha)}
    <h1>Liberar etiqueta ${ficha.etiqueta}</h1>
    <ul class="lista-simple">
      <li><i data-lucide="tag"></i> La etiqueta <strong>${ficha.etiqueta}</strong> vuelve a <strong>Sin asignar</strong> y se puede usar en otro equipo.</li>
      <li><i data-lucide="archive"></i> El contenido actual (${ficha.contenido.length} producto${ficha.contenido.length === 1 ? '' : 's'}) pasa a <strong>Cargas previas</strong> de este equipo.</li>
      <li><i data-lucide="lock"></i> El historial no se borra.</li>
    </ul>
    <div id="mensaje" role="alert"></div>
    <div class="pie-paso">
      <a class="btn btn-secundario" href="#/ficha/${ficha.id}">Cancelar</a>
      <button id="btn-liberar" class="btn btn-primario"><i data-lucide="unlink"></i>Liberar etiqueta</button>
    </div>
  `, 'cajas', persona));

  $('#btn-liberar').addEventListener('click', () => {
    try {
      const codigo = ficha.etiqueta;
      liberarEtiqueta(ficha.id, { coordenadas });
      avisarEnLaSiguientePantalla(`La etiqueta ${codigo} quedó libre para reasignar.`);
      ir(`/ficha/${ficha.id}/cargas`, { reemplazar: true });
    } catch (e) {
      $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
      lucide.createIcons({ root: $('#mensaje') });
    }
  });
}
