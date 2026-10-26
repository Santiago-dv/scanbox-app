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

export function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, datos }));
  } catch (error) {
    console.warn('No se pudieron guardar los datos en el navegador', error);
  }
}

// La primera vez crea los datos de demostración; después usa los guardados
export function obtenerDatos() {
  if (!datos) {
    datos = leerGuardado() ?? crearDatosDemo();
    guardar();
  }
  return datos;
}

// Herramienta de demostración: vuelve todo al estado inicial
export function reiniciarDemo() {
  datos = crearDatosDemo();
  guardar();
  return datos;
}