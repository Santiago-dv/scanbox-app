// Estructura que comparten las pantallas, y la función que las dibuja.
import { pintarConexion } from './conexion.js';

const INICIO   = { id: 'inicio',   texto: 'Inicio',   icono: 'house' };
const ESCANEAR = { id: 'escanear', texto: 'Escanear', icono: 'scan-line', destacado: true };
const CAJAS    = { id: 'cajas',    texto: 'Cajas',    icono: 'package' };
const MAS      = { id: 'mas',      texto: 'Más',      icono: 'ellipsis' };

// Cada rol ve su propia navegación
function seccionesPara(persona) {
  if (persona?.rol === 'invitado') {
    return [{ id: 'invitado', texto: 'Mis fichas', icono: 'eye' }, MAS];
  }
  if (persona?.rol === 'admin_scanbox') {
    return [
      { id: 'admin', texto: 'Clientes', icono: 'building' },
      { id: 'lotes', texto: 'Lotes', icono: 'qr-code' },
      { id: 'configuracion', texto: 'Ajustes', icono: 'settings' },
      MAS,
    ];
  }
  return [INICIO, ESCANEAR, CAJAS, MAS];
}

function encabezadoHTML() {
  return `
    <header class="encabezado">
      <span class="marca"><i data-lucide="box"></i>ScanBox</span>
      <span id="conexion"></span>
    </header>`;
}

// Pantallas con sesión: encabezado, navegación y contenido
export function marcoHTML(contenido, seccionActiva, persona) {
  const enlaces = seccionesPara(persona).map((s) => `
    <a href="#/${s.id}"
       class="nav-item ${s.destacado ? 'nav-item--destacado' : ''}"
       ${s.id === seccionActiva ? 'aria-current="page"' : ''}>
      <i data-lucide="${s.icono}"></i>
      <span>${s.texto}</span>
    </a>`).join('');

  return `
    <div class="marco">
      ${encabezadoHTML()}
      <nav class="nav-principal" aria-label="Navegación principal">
        ${enlaces}
      </nav>
      <main class="contenido">
        ${contenido}
      </main>
    </div>`;
}

// Pantallas sin sesión (entrar, recuperar contraseña): sin navegación
export function marcoPublicoHTML(contenido) {
  return `
    ${encabezadoHTML()}
    <main class="pagina">
      ${contenido}
    </main>`;
}

// Mensaje destacado con ícono. color: azul, verde, ambar o rojo
export function avisoHTML(color, icono, texto) {
  return `
    <div class="aviso aviso--${color}">
      <i data-lucide="${icono}"></i>
      <p>${texto}</p>
    </div>`;
}

// Mensaje para mostrar en la próxima pantalla (por ejemplo, "Etiqueta asignada")
let avisoPendiente = null;
export function avisarEnLaSiguientePantalla(texto) {
  avisoPendiente = texto;
}
export function tomarAvisoPendiente() {
  const texto = avisoPendiente;
  avisoPendiente = null;
  return texto;
}

// Aviso flotante que se cierra solo (por ejemplo, "3 cambios sincronizados")
export function mostrarToast(texto) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<i data-lucide="cloud-check"></i>${texto}`;
  document.body.append(toast);
  lucide.createIcons({ root: toast });
  setTimeout(() => toast.remove(), 4000);
}

// Una pantalla puede pedir que se haga algo al salir de ella (por ejemplo, apagar la cámara)
let alSalir = null;
export function alSalirDePantalla(funcion) {
  alSalir = funcion;
}

// Dibuja una pantalla completa dentro de #app
export function pintar(html) {
  alSalir?.();   // primero se despide la pantalla anterior
  alSalir = null;
  document.querySelector('#app').innerHTML = html;
  lucide.createIcons();
  pintarConexion();
  window.scrollTo(0, 0);
}
