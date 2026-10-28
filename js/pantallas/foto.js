// Agregar foto de evidencia: la cámara ya se abrió desde la ficha;
// aquí se ve la foto, se describe (opcional) y se guarda.
import { marcoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual, puedeEditarFicha } from '../sesion.js';
import { buscarFicha } from '../consultas.js';
import { agregarFoto } from '../acciones.js';
import { leerFoto } from '../fotos.js';
import { pedirCoordenadas } from '../ubicacion.js';
import { formatearNumero } from '../iso6346.js';
import { escapar } from '../formato.js';
import { ir } from '../rutas.js';

// Descripciones rápidas: un toque en vez de escribir con guantes
const SUGERENCIAS = ['Carga completa', 'Sello de seguridad', 'Daño', 'Faltante', 'Inspección', 'Documento'];

let pendiente = null;   // { fichaId, imagen } de la foto recién tomada

export function prepararFoto(fichaId, imagen) {
  pendiente = { fichaId, imagen };
}

const $ = (selector) => document.querySelector(selector);

export function pantallaFoto(fichaId) {
  const persona = usuarioActual();
  const ficha = buscarFicha(fichaId);

  if (!puedeEditarFicha(persona, ficha)) {
    return pintar(marcoHTML(`
      <h1>Agregar foto</h1>
      ${avisoHTML('rojo', 'lock', 'Esta ficha no se puede modificar: está cerrada, no es de tu empresa o tu organización está bloqueada.')}
    `, 'cajas', persona));
  }

  const imagen = pendiente?.fichaId === fichaId ? pendiente.imagen : null;
  let coordenadas = null;
  pedirCoordenadas().then((c) => { coordenadas = c; });

  pintar(marcoHTML(`
    <p class="texto-suave"><a class="enlace" href="#/ficha/${ficha.id}/evidencia"><i data-lucide="arrow-left"></i> ${formatearNumero(ficha.numeroEquipo)}</a></p>
    <h1>Agregar foto</h1>
    ${imagen
      ? `<img class="vista-previa" src="${imagen}" alt="Foto tomada">
         <h2 class="titulo-bloque">¿Qué muestra la foto?</h2>
         <div class="fila sugerencias">
           ${SUGERENCIAS.map((s) => `<button type="button" class="chip" data-sugerencia="${s}">${s}</button>`).join('')}
         </div>
         <label class="campo separado">Descripción (opcional)
           <input id="descripcion" maxlength="80" placeholder="Foto de evidencia">
         </label>
         <div id="mensaje" role="alert"></div>
         <div class="pie-paso">
           <a class="btn btn-secundario" href="#/ficha/${ficha.id}/evidencia">Descartar</a>
           <button type="button" id="btn-guardar" class="btn btn-primario"><i data-lucide="save"></i>Guardar foto</button>
         </div>`
      : `<p>Toma la foto con la cámara del celular.</p>
         <label class="btn btn-primario btn-bloque">
           <i data-lucide="camera"></i>Tomar foto
           <input id="entrada-foto" type="file" accept="image/*" capture="environment" hidden>
         </label>`}
  `, 'cajas', persona));

  // Llegó sin foto (por ejemplo, recargó la página): se ofrece tomarla aquí
  $('#entrada-foto')?.addEventListener('change', async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    prepararFoto(fichaId, await leerFoto(archivo));
    pantallaFoto(fichaId);
  });

  document.querySelectorAll('[data-sugerencia]').forEach((chip) => {
    chip.addEventListener('click', () => {
      $('#descripcion').value = chip.dataset.sugerencia;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === chip));
    });
  });

  $('#btn-guardar')?.addEventListener('click', () => {
    try {
      agregarFoto(fichaId, { imagen, descripcion: $('#descripcion').value, coordenadas });
      pendiente = null;
      avisarEnLaSiguientePantalla('Foto agregada a la evidencia.');
      ir(`/ficha/${fichaId}/evidencia`, { reemplazar: true });
    } catch (error) {
      $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(error.message));
      lucide.createIcons({ root: $('#mensaje') });
    }
  });
}
