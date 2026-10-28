// Guarda los datos de ScanBox en el navegador (localStorage).
// Hace las veces de la base de datos mientras no tengamos servidor.
import { crearDatosDemo } from './datos/demo.js';

const CLAVE = 'scanbox-datos';
const VERSION = 1;   // súbela cuando cambie la forma de los datos de demo

let datos = null;

function leerGuardado() {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const guardado = JSON.parse(texto);
    // Si los datos son de una versión vieja, se ignoran y se crean de nuevo
    return guardado.version === VERSION ? guardado.datos : null;
  } catch {
    return null;   // navegador sin almacenamiento o datos dañados
  }
}

// Devuelve true si se guardó. Puede fallar si el celular se queda sin espacio (por las fotos).
export function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, datos }));
    return true;
  } catch (error) {
    console.warn('No se pudieron guardar los datos en el navegador', error);
    return false;
  }
}

// Agrega lo que necesitan las partes nuevas de la app sin borrar los datos que ya existen
function completarEstructura(d) {
  d.eventos ??= [];                                   // movimientos de cuenta (panel de ScanBox)
  d.configuracion.invitaciones ??= ['CARIBE-2026'];   // códigos para registrar empresas nuevas
  return d;
}

// La primera vez crea los datos de demostración; después usa los guardados
export function obtenerDatos() {
  if (!datos) {
    datos = completarEstructura(leerGuardado() ?? crearDatosDemo());
    guardar();
  }
  return datos;
}

// Herramienta de demostración: vuelve todo al estado inicial
export function reiniciarDemo() {
  datos = completarEstructura(crearDatosDemo());
  guardar();
  return datos;
}
