// Pantalla "Más": datos de la sesión y cerrar sesión.
// En otras etapas aquí aparecen usuarios, etiquetas, invitados y suscripción.
import { marcoHTML, pintar } from '../marco.js';
import { usuarioActual, cerrarSesion, rutaDeInicio } from '../sesion.js';
import { obtenerDatos, reiniciarDemo } from '../almacen.js';
import { ROLES } from '../datos/catalogos.js';
import { escapar } from '../formato.js';
import { ir } from '../rutas.js';

export function pantallaMas() {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  const organizacion = datos.organizaciones.find((o) => o.id === persona.orgId);
  const area = datos.areas.find((a) => a.id === persona.areaId);
  const detalle = [ROLES[persona.rol], organizacion?.nombre, area?.nombre]
    .filter(Boolean)
    .join(' · ');

  pintar(marcoHTML(`
    <h1>Más</h1>
    <div class="tarjeta">
      <p class="texto-suave">Sesión iniciada como</p>
      <p class="titulo-tarjeta">${escapar(persona.nombre)}</p>
      <p>${escapar(detalle)}</p>
    </div>

    <div class="pila separado">
      <button id="btn-salir" class="btn btn-secundario btn-bloque">
        <i data-lucide="log-out"></i>Cerrar sesión
      </button>
      <button id="btn-reiniciar" class="btn btn-secundario btn-bloque">
        <i data-lucide="rotate-ccw"></i>Reiniciar demostración
      </button>
    </div>
    <p class="texto-suave texto-centro">"Reiniciar demostración" es solo para presentar la demo.</p>
  `, 'mas', persona));

  document.querySelector('#btn-salir').addEventListener('click', () => {
    cerrarSesion();
    ir('/entrar', { reemplazar: true });
  });

  document.querySelector('#btn-reiniciar').addEventListener('click', () => {
    reiniciarDemo();
    ir(rutaDeInicio(), { reemplazar: true });
  });
}