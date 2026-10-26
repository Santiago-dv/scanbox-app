import { ESTADOS, estadoHTML } from './estados.js';
import { marcoHTML } from './marco.js';
import { vigilarConexion } from './conexion.js';
import { obtenerDatos, reiniciarDemo } from './almacen.js';

const app = document.querySelector('#app');
const datos = obtenerDatos();

const activas = datos.fichas.filter(
  (f) => f.estado === 'en_uso' || f.estado === 'en_transito'
).length;

// Muestrario temporal para ver el sistema de diseño.
// En la etapa 3 lo reemplazamos por las pantallas reales.
const muestrario = `
  <h1>Muestrario</h1>
  <p class="texto-suave">Sistema de diseño de ScanBox</p>

  <h2>Botones</h2>
  <div class="pila">
    <button class="btn btn-primario btn-bloque">
      <i data-lucide="scan-line"></i>Escanear
    </button>
    <button class="btn btn-acento btn-bloque">
      <i data-lucide="tag"></i>Asignar etiqueta
    </button>
    <button class="btn btn-secundario btn-bloque">
      <i data-lucide="truck"></i>Iniciar trayecto
    </button>
    <button class="btn btn-peligro btn-bloque">
      <i data-lucide="ban"></i>Desactivar etiqueta
    </button>
    <button class="btn btn-bloque" disabled>
      <i data-lucide="lock"></i>Editar contenido
    </button>
  </div>

  <h2>Estados</h2>
  <div class="fila">
    ${Object.keys(ESTADOS).map(estadoHTML).join('')}
  </div>

  <h2>Tarjeta</h2>
  <div class="tarjeta">
    <p class="texto-suave">Cajas activas</p>
    <p class="numero-grande">${activas}</p>
  </div>

  <h2>Datos de demostración</h2>
  <div class="tarjeta pila">
    <p>
      ${datos.organizaciones.length} organizaciones ·
      ${datos.fichas.length} fichas ·
      ${datos.etiquetas.length} etiquetas ·
      ${datos.auditoria.length} registros de historial
    </p>
    <button id="btn-reiniciar" class="btn btn-secundario btn-bloque">
      <i data-lucide="rotate-ccw"></i>Reiniciar demostración
    </button>
  </div>
`;

app.innerHTML = marcoHTML(muestrario, 'inicio');

// Convierte cada <i data-lucide="..."> en su ícono
lucide.createIcons();

vigilarConexion();

document.querySelector('#btn-reiniciar').addEventListener('click', () => {
  reiniciarDemo();
  location.reload();   // vuelve a dibujar todo con los datos nuevos
});