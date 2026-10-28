// Escanear: cámara a pantalla completa con guía, o el código escrito a mano.
import { pintar, avisoHTML, alSalirDePantalla } from '../marco.js';
import { rutaDeInicio } from '../sesion.js';
import { abrirCamara, extraerCodigo } from '../escaner.js';
import { ir } from '../rutas.js';

// Mensaje claro para cada error que puede dar el navegador
const ERRORES_CAMARA = {
  NotAllowedError: 'No diste permiso para usar la cámara. Actívalo en la configuración del navegador o escribe el código.',
  NotFoundError: 'No encontramos una cámara en este equipo. Escribe el código de la etiqueta.',
  NotReadableError: 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar, o escribe el código.',
  SinCamara: 'Este navegador no permite usar la cámara. Escribe el código de la etiqueta.',
};

export function pantallaEscanear() {
  pintar(`
    <div class="escaner">
      <h1 class="sr-only">Escanear</h1>
      <video class="escaner-video" muted playsinline></video>
      <div class="escaner-guia" aria-hidden="true"></div>

      <div class="escaner-barra">
        <a class="btn-icono" href="#${rutaDeInicio()}" aria-label="Cerrar"><i data-lucide="x"></i></a>
        <span id="conexion"></span>
      </div>

      <div class="escaner-panel">
        <div id="escaner-mensaje" role="status">
          <p class="escaner-mensaje">Abriendo la cámara…</p>
        </div>
        <form id="form-codigo" class="pila" novalidate hidden>
          <label class="campo campo-codigo">
            Código de la etiqueta
            <input name="codigo" maxlength="6" placeholder="AB12CD"
                   autocomplete="off" autocapitalize="characters" spellcheck="false">
          </label>
          <button type="submit" class="btn btn-primario btn-bloque">
            <i data-lucide="search"></i>Abrir
          </button>
        </form>
        <button id="btn-manual" type="button" class="btn btn-secundario btn-bloque">
          <i data-lucide="keyboard"></i>Escribir código
        </button>
      </div>
    </div>
  `);

  const video = document.querySelector('.escaner-video');
  const lugarMensaje = document.querySelector('#escaner-mensaje');
  const formulario = document.querySelector('#form-codigo');
  const botonManual = document.querySelector('#btn-manual');

  const mensaje = (texto) => { lugarMensaje.innerHTML = `<p class="escaner-mensaje">${texto}</p>`; };
  const error = (texto, icono = 'camera-off') => {
    lugarMensaje.innerHTML = avisoHTML('rojo', icono, texto);
    lucide.createIcons({ root: lugarMensaje });
  };
  const mostrarFormulario = () => {
    formulario.hidden = false;
    botonManual.hidden = true;
    formulario.codigo.focus();
  };

  // ---------- Cámara ----------
  let apagar = null;
  let salio = false;
  let leido = false;

  alSalirDePantalla(() => {   // al cambiar de pantalla se apaga la cámara
    salio = true;
    apagar?.();
  });

  let ultimoAviso = 0;
  const alLeer = (texto) => {
    if (leido) return;
    const codigo = extraerCodigo(texto);
    if (!codigo) {
      // QR de otra cosa (una página web, un producto…): avisar sin repetir a cada instante
      if (Date.now() - ultimoAviso > 3000) {
        error('Este QR no es de una etiqueta ScanBox. Apunta al QR de la etiqueta.', 'scan-qr-code');
        ultimoAviso = Date.now();
      }
      return;
    }
    leido = true;
    navigator.vibrate?.(80);   // pequeña vibración para confirmar, útil con guantes
    apagar?.();
    ir(`/c/${codigo}`);
  };

  abrirCamara(video, alLeer)
    .then((funcionApagar) => {
      if (salio) return funcionApagar();   // se fue antes de que la cámara abriera
      apagar = funcionApagar;
      // Si ya se mostró un aviso (por ejemplo, un QR ajeno), no se tapa
      if (!ultimoAviso) mensaje('Apunta la cámara al código QR de la etiqueta.');
    })
    .catch((e) => {
      error(ERRORES_CAMARA[e.name] ?? 'No pudimos abrir la cámara. Escribe el código de la etiqueta.');
      mostrarFormulario();
    });

  // ---------- Código escrito a mano ----------
  botonManual.addEventListener('click', mostrarFormulario);

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const codigo = extraerCodigo(formulario.codigo.value);
    if (!codigo) {
      return error('El código tiene 6 letras y números, como AB12CD. Lo encuentras debajo del QR.', 'keyboard');
    }
    apagar?.();
    ir(`/c/${codigo}`);
  });
}
