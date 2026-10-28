// Navegación entre pantallas con el "#" de la dirección:
// .../scanbox-app/#/inicio, .../#/ficha/f01, .../#/c/KM47TR
import { usuarioActual, recordarDestino, rutaDeInicio } from './sesion.js';

const rutas = [];

// publica: se ve sin sesión. roles: solo esos roles pueden entrar.
export function agregarRuta(patron, pantalla, { publica = false, roles = null } = {}) {
  rutas.push({ patron, pantalla, publica, roles });
}

export function ir(ruta, { reemplazar = false } = {}) {
  const hash = `#${ruta}`;
  if (location.hash === hash) return mostrarRutaActual();   // misma ruta: solo se vuelve a dibujar
  if (reemplazar) location.replace(hash);   // no deja la ruta anterior en el botón "atrás"
  else location.hash = hash;
}

function rutaActual() {
  return location.hash.slice(1) || '/';
}

function buscarRuta(ruta) {
  for (const r of rutas) {
    const coincidencia = ruta.match(r.patron);
    if (coincidencia) return { r, parametros: coincidencia.slice(1) };
  }
  return null;
}

export function mostrarRutaActual() {
  const ruta = rutaActual();
  const encontrada = buscarRuta(ruta);

  if (!encontrada) return ir(rutaDeInicio(), { reemplazar: true });

  const { r, parametros } = encontrada;
  if (!r.publica) {
    const persona = usuarioActual();
    if (!persona) {
      recordarDestino(ruta);
      return ir('/entrar', { reemplazar: true });
    }
    if (r.roles && !r.roles.includes(persona.rol)) {
      return ir(rutaDeInicio(persona), { reemplazar: true });
    }
  }
  r.pantalla(...parametros);
}

export function iniciarRutas() {
  window.addEventListener('hashchange', mostrarRutaActual);
  mostrarRutaActual();

  // Cada 30 segundos revisa si la sesión sigue vigente (por ejemplo, un invitado que venció)
  setInterval(() => {
    const encontrada = buscarRuta(rutaActual());
    if (encontrada && !encontrada.r.publica && !usuarioActual()) mostrarRutaActual();
  }, 30000);
}