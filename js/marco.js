// Estructura que comparten todas las pantallas con sesión iniciada:
// encabezado arriba, navegación y contenido.
const SECCIONES = [
  { id: 'inicio',   texto: 'Inicio',   icono: 'house' },
  { id: 'escanear', texto: 'Escanear', icono: 'scan-line', destacado: true },
  { id: 'cajas',    texto: 'Cajas',    icono: 'package' },
  { id: 'mas',      texto: 'Más',      icono: 'ellipsis' },
];

export function marcoHTML(contenido, seccionActiva) {
  const enlaces = SECCIONES.map((s) => `
    <a href="#/${s.id}"
       class="nav-item ${s.destacado ? 'nav-item--destacado' : ''}"
       ${s.id === seccionActiva ? 'aria-current="page"' : ''}>
      <i data-lucide="${s.icono}"></i>
      <span>${s.texto}</span>
    </a>`).join('');

  return `
    <div class="marco">
      <header class="encabezado">
        <span class="marca"><i data-lucide="box"></i>ScanBox</span>
        <span id="conexion"></span>
      </header>
      <nav class="nav-principal" aria-label="Navegación principal">
        ${enlaces}
      </nav>
      <main class="contenido">
        ${contenido}
      </main>
    </div>`;
}