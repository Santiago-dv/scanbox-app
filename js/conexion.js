// Conexión: indicador permanente "En línea" / "Sin conexión · N cambios pendientes",
// sincronización al volver la señal y fichas disponibles sin conexión.
import { obtenerDatos, guardar } from './almacen.js';

const CLAVE_SIMULACION = 'scanbox-simular-sin-conexion';
const CLAVE_VISTAS = 'scanbox-fichas-vistas';

// ---------- ¿Hay conexión? ----------

// Herramienta de demostración: simular que no hay señal sin poner el celular en modo avión
function simulando() {
  try { return sessionStorage.getItem(CLAVE_SIMULACION) === '1'; } catch { return false; }
}

export function simulandoSinConexion() {
  return simulando();
}

export function estaEnLinea() {
  return navigator.onLine && !simulando();
}

export function simularSinConexion(activar) {
  try {
    if (activar) sessionStorage.setItem(CLAVE_SIMULACION, '1');
    else sessionStorage.removeItem(CLAVE_SIMULACION);
  } catch { /* sin almacenamiento: no se puede simular */ }
  revisarConexion();
}

// ---------- Cambios pendientes y sincronización ----------

// Un cambio hecho sin conexión tiene hora del teléfono pero todavía no hora del servidor
export function contarCambiosPendientes() {
  return obtenerDatos().auditoria.filter((registro) => !registro.horaServidor).length;
}

// Al volver la señal, cada cambio pendiente recibe la hora del servidor
export function sincronizar() {
  const pendientes = obtenerDatos().auditoria.filter((registro) => !registro.horaServidor);
  if (!pendientes.length) return 0;
  const ahora = new Date().toISOString();
  pendientes.forEach((registro) => { registro.horaServidor = ahora; });
  guardar();
  return pendientes.length;
}

// ---------- Fichas disponibles sin conexión ----------
// Sin conexión solo se consultan las fichas que se abrieron antes con señal.

function leerVistas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_VISTAS)) ?? {}; } catch { return {}; }
}

export function marcarFichaVista(fichaId) {
  if (!estaEnLinea()) return;
  const vistas = leerVistas();
  vistas[fichaId] = new Date().toISOString();
  try { localStorage.setItem(CLAVE_VISTAS, JSON.stringify(vistas)); } catch { /* sin espacio */ }
}

// Fecha en que se abrió con señal por última vez (o null si nunca)
export function fechaFichaVista(fichaId) {
  return leerVistas()[fichaId] ?? null;
}

// ---------- Indicador ----------

function conexionHTML() {
  const cambiosPendientes = contarCambiosPendientes();
  if (estaEnLinea()) {
    return `
      <span class="conexion conexion--en-linea">
        <i data-lucide="cloud"></i>En línea
      </span>`;
  }

  const texto = cambiosPendientes === 1
    ? '1 cambio pendiente'
    : `${cambiosPendientes} cambios pendientes`;

  return `
    <span class="conexion conexion--sin-conexion">
      <i data-lucide="cloud-off"></i>Sin conexión · ${texto}
    </span>`;
}

// Dibuja el indicador dentro de #conexion (se llama cada vez que cambia la pantalla)
export function pintarConexion() {
  const lugar = document.querySelector('#conexion');
  if (!lugar) return;
  lugar.innerHTML = conexionHTML();
  lucide.createIcons({ root: lugar });
}

let avisarSincronizacion = null;
export function alSincronizar(funcion) {
  avisarSincronizacion = funcion;
}

function revisarConexion() {
  if (estaEnLinea()) {
    const sincronizados = sincronizar();
    if (sincronizados) avisarSincronizacion?.(sincronizados);
  }
  pintarConexion();
}

// Se llama una sola vez al arrancar la app
export function vigilarConexion() {
  window.addEventListener('online', revisarConexion);
  window.addEventListener('offline', revisarConexion);
  revisarConexion();   // si se abrió la app con señal, sube lo que quedó pendiente
}
