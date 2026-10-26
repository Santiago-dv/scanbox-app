import { ESTADOS, estadoHTML } from './estados.js';

const app = document.querySelector('#app');

// Muestrario temporal para ver el sistema de diseño.
// En la etapa 3 lo reemplazamos por las pantallas reales.
app.innerHTML = `
  <main class="pagina">
    <h1>ScanBox</h1>
    <p class="texto-suave">Muestrario del sistema de diseño</p>

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
      <p class="numero-grande">12</p>
    </div>
  </main>
`;

// Convierte cada <i data-lucide="..."> en su ícono
lucide.createIcons();