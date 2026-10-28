// Pantallas sin sesión: iniciar sesión y recuperar contraseña.
import { marcoPublicoHTML, avisoHTML, pintar } from '../marco.js';
import {
  iniciarSesion, usuarioActual, tomarDestino, tomarMotivoSalida, rutaDeInicio,
} from '../sesion.js';
import { ir } from '../rutas.js';

// Atajos para presentar la demo (no es una función del producto)
const CUENTAS_DEMO = [
  ['operador@ceiba.demo',     'Operador · Muelle Ceiba (al día)'],
  ['supervisor@ceiba.demo',   'Supervisor · Muelle Ceiba'],
  ['admin@ceiba.demo',        'Administrador · Muelle Ceiba'],
  ['operador@cardon.demo',    'Operador · Transportes Cardón (en prórroga)'],
  ['operador@cafe.demo',      'Operador · Café Sierra Clara (bloqueada)'],
  ['conductor@invitado.demo', 'Invitado · acceso por vencer'],
  ['receptor@invitado.demo',  'Invitado · acceso vencido'],
  ['admin@scanbox.demo',      'Administrador de ScanBox'],
];

export function pantallaEntrar({ desdeQR = false } = {}) {
  // Si ya hay sesión, no tiene sentido mostrar el formulario
  if (usuarioActual()) return ir(rutaDeInicio(), { reemplazar: true });

  const motivo = tomarMotivoSalida();
  const botonesDemo = CUENTAS_DEMO.map(([correo, descripcion]) => `
    <button type="button" class="btn btn-secundario btn-bloque btn-izquierda" data-correo="${correo}">
      <i data-lucide="user"></i>${descripcion}
    </button>`).join('');

  pintar(marcoPublicoHTML(`
    ${desdeQR ? avisoHTML('azul', 'lock',
      'Esta etiqueta pertenece a una organización de ScanBox. Inicia sesión para ver su información.') : ''}
    ${motivo ? avisoHTML('ambar', 'clock', motivo) : ''}

    <h1>Iniciar sesión</h1>
    <form id="form-entrar" class="pila" novalidate>
      <label class="campo">
        Correo
        <input name="correo" type="email" inputmode="email" autocomplete="username" required>
      </label>
      <label class="campo">
        Contraseña
        <input name="clave" type="password" autocomplete="current-password" required>
      </label>
      <div id="error-entrar" role="alert"></div>
      <button type="submit" class="btn btn-primario btn-bloque">
        <i data-lucide="log-in"></i>Entrar
      </button>
    </form>
    <p class="texto-centro">
      <a class="enlace" href="#/recuperar">¿Olvidaste tu contraseña?</a>
    </p>

    <details class="tarjeta cuentas-demo">
      <summary>Cuentas de demostración</summary>
      <p class="texto-suave">Toca una para llenar el formulario. La clave de todas es demo1234.</p>
      <div class="pila">${botonesDemo}</div>
    </details>
  `));

  const formulario = document.querySelector('#form-entrar');
  const lugarError = document.querySelector('#error-entrar');

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();   // que el navegador no recargue la página
    const correo = formulario.correo.value;
    const clave = formulario.clave.value;

    if (!correo || !clave) {
      lugarError.innerHTML = avisoHTML('rojo', 'circle-x', 'Escribe tu correo y tu contraseña.');
      return lucide.createIcons({ root: lugarError });
    }

    const { error, persona } = iniciarSesion(correo, clave);
    if (error) {
      lugarError.innerHTML = avisoHTML('rojo', 'circle-x', error);
      return lucide.createIcons({ root: lugarError });
    }

    // Si llegó por un QR, vuelve a esa etiqueta; si no, a su pantalla de inicio
    ir(tomarDestino() ?? rutaDeInicio(persona), { reemplazar: true });
  });

  document.querySelectorAll('[data-correo]').forEach((boton) => {
    boton.addEventListener('click', () => {
      formulario.correo.value = boton.dataset.correo;
      formulario.clave.value = 'demo1234';
      formulario.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

export function pantallaRecuperar() {
  pintar(marcoPublicoHTML(`
    <h1>Recuperar contraseña</h1>
    <p>Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.</p>
    <form id="form-recuperar" class="pila" novalidate>
      <label class="campo">
        Correo
        <input name="correo" type="email" inputmode="email" autocomplete="username" required>
      </label>
      <div id="resultado" role="status"></div>
      <button type="submit" class="btn btn-primario btn-bloque">
        <i data-lucide="mail"></i>Enviar enlace
      </button>
    </form>
    <p class="texto-centro">
      <a class="enlace" href="#/entrar">Volver a iniciar sesión</a>
    </p>
  `));

  const formulario = document.querySelector('#form-recuperar');
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const resultado = document.querySelector('#resultado');
    // Mismo mensaje exista o no el correo, para no revelar quién tiene cuenta
    resultado.innerHTML = avisoHTML('verde', 'mail',
      'Si el correo está registrado, te llegará un enlace en unos minutos. (En esta demostración no se envía ningún correo).');
    lucide.createIcons({ root: resultado });
  });
}