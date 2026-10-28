// Suscripción del cliente (sección 5.12) y pago simulado con PSE o tarjeta (Stripe).
// .../#/suscripcion  → plan, próxima fecha de pago, historial y banners de prórroga o bloqueo
// .../#/pagar        → pago simulado: no se cobra nada ni se piden datos reales
import { marcoHTML, avisoHTML, pintar, tomarAvisoPendiente, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual, esAdminEmpresa } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { pagarSuscripcion } from '../acciones.js';
import { estadoHTML } from '../estados.js';
import { BANCOS_PSE } from '../datos/catalogos.js';
import { estaEnLinea } from '../conexion.js';
import { escapar, fechaHora } from '../formato.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);
const precio = (valor) => (valor == null ? 'Por definir' : valor);

function diasRestantes(iso) {
  const dias = Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
  return dias === 1 ? '1 día' : `${dias} días`;
}

function sinPermiso(persona, titulo) {
  pintar(marcoHTML(`<h1>${titulo}</h1>${avisoHTML('rojo', 'lock', 'Solo el administrador de la empresa puede ver y pagar la suscripción.')}`, 'mas', persona));
}

export function pantallaSuscripcion() {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona)) return sinPermiso(persona, 'Suscripción');

  const datos = obtenerDatos();
  const organizacion = datos.organizaciones.find((o) => o.id === persona.orgId);
  const plan = datos.planes.find((p) => p.id === organizacion.plan);
  const pagos = datos.pagos.filter((p) => p.orgId === organizacion.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const mora = datos.configuracion.moraPorcentaje;
  const pendiente = tomarAvisoPendiente();

  let banner = '';
  if (organizacion.estadoPago === 'prorroga') {
    banner = avisoHTML('ambar', 'clock', `Estás en prórroga: quedan ${diasRestantes(organizacion.prorrogaHasta)} para pagar.
      Monto: cuota del plan ${organizacion.recargoMora ? `+ ${mora} % de mora` : ''} (${precio(plan.precio)}).
      Si no se paga, se bloquearán los cambios.`);
  } else if (organizacion.estadoPago === 'bloqueado') {
    banner = avisoHTML('rojo', 'lock', `Tu cuenta está bloqueada por falta de pago. Puedes consultar todo, pero nadie de tu empresa puede hacer cambios.
      Regulariza el pago (cuota ${organizacion.recargoMora ? `+ ${mora} % de mora` : ''}) para reactivarla al instante.`);
  }

  pintar(marcoHTML(`
    ${pendiente ? avisoHTML('verde', 'circle-check', escapar(pendiente)) : ''}
    <h1>Suscripción</h1>
    ${banner}
    <section class="tarjeta">
      <dl class="datos">
        <div class="dato"><dt>Plan actual</dt><dd>${plan.nombre}</dd></div>
        <div class="dato"><dt>Precio</dt><dd>${precio(plan.precio)}</dd></div>
        <div class="dato"><dt>Estado</dt><dd>${estadoHTML(organizacion.estadoPago)}</dd></div>
        <div class="dato"><dt>Próxima fecha de pago</dt><dd>${fechaHora(organizacion.proximoPago)}</dd></div>
      </dl>
    </section>
    <a class="btn ${organizacion.estadoPago === 'al_dia' ? 'btn-secundario' : 'btn-primario'} btn-bloque" href="#/pagar">
      <i data-lucide="credit-card"></i>${organizacion.estadoPago === 'bloqueado' ? 'Regularizar pago' : 'Pagar'}
    </a>

    <h2>Historial de pagos</h2>
    ${pagos.length ? `<ul class="lista-simple">${pagos.map((p) => `
      <li class="fila-pago">
        <span><strong>${escapar(p.concepto)}</strong>
          <span class="texto-suave bloque">${fechaHora(p.fecha)} · ${escapar(p.metodo)} · ${precio(p.monto)}</span></span>
        ${p.estado === 'aprobado'
          ? '<span class="estado estado--verde"><i data-lucide="circle-check"></i>Aprobado</span>'
          : '<span class="estado estado--rojo"><i data-lucide="circle-x"></i>Rechazado</span>'}
      </li>`).join('')}</ul>` : '<p class="texto-suave">Todavía no hay pagos.</p>'}
  `, 'mas', persona));
}

export function pantallaPagar() {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona)) return sinPermiso(persona, 'Pagar');

  const datos = obtenerDatos();
  const organizacion = datos.organizaciones.find((o) => o.id === persona.orgId);
  const plan = datos.planes.find((p) => p.id === organizacion.plan);
  let metodo = 'PSE';

  const formulario = () => (metodo === 'PSE' ? `
      <label class="campo">Banco<select name="banco">${BANCOS_PSE.map((b) => `<option>${b}</option>`).join('')}</select></label>
      <label class="campo">Tipo de persona<select name="persona"><option>Jurídica (empresa)</option><option>Natural</option></select></label>
      <p class="texto-suave">En el servicio real, PSE abriría la página de tu banco. Aquí no se abre nada.</p>`
    : `
      <label class="campo">Número de tarjeta de prueba
        <input value="4242 4242 4242 4242" readonly aria-readonly="true"></label>
      <p class="texto-suave">Tarjeta de prueba fija. No escribas datos de una tarjeta real: esta demostración no los pide ni los guarda.</p>`);

  const dibujar = () => {
    pintar(marcoHTML(`
      <p class="texto-suave"><a class="enlace" href="#/suscripcion"><i data-lucide="arrow-left"></i> Suscripción</a></p>
      <h1>Pagar</h1>
      ${avisoHTML('azul', 'flask-conical', 'Pago simulado: no se cobra dinero. Así se verá el flujo cuando se conecten PSE y Stripe.')}
      <section class="tarjeta">
        <dl class="datos">
          <div class="dato"><dt>Concepto</dt><dd>Plan ${plan.nombre.toLowerCase()}${organizacion.recargoMora ? ` + ${datos.configuracion.moraPorcentaje} % de mora` : ''}</dd></div>
          <div class="dato"><dt>Monto</dt><dd>${precio(plan.precio)}</dd></div>
        </dl>
      </section>
      <h2 class="titulo-bloque separado">Método de pago</h2>
      <div class="dos-columnas">
        <button class="btn ${metodo === 'PSE' ? 'btn-primario' : 'btn-secundario'}" data-metodo="PSE"><i data-lucide="landmark"></i>PSE</button>
        <button class="btn ${metodo === 'Stripe' ? 'btn-primario' : 'btn-secundario'}" data-metodo="Stripe"><i data-lucide="credit-card"></i>Tarjeta</button>
      </div>
      <form id="form-pago" class="pila separado" novalidate>
        ${formulario()}
        <div id="mensaje" role="alert">${estaEnLinea() ? '' : avisoHTML('ambar', 'cloud-off', 'Necesitas conexión a internet para pagar.')}</div>
        <button type="submit" class="btn btn-acento btn-bloque" ${estaEnLinea() ? '' : 'disabled'}>
          <i data-lucide="lock"></i>Pagar ${precio(plan.precio) === 'Por definir' ? '' : precio(plan.precio)} con ${metodo === 'PSE' ? 'PSE' : 'tarjeta'}
        </button>
      </form>
    `, 'mas', persona));

    document.querySelectorAll('[data-metodo]').forEach((b) => b.addEventListener('click', () => {
      metodo = b.dataset.metodo;
      dibujar();
    }));

    $('#form-pago').addEventListener('submit', (evento) => {
      evento.preventDefault();
      const boton = evento.target.querySelector('button[type="submit"]');
      boton.disabled = true;
      boton.innerHTML = `<i data-lucide="loader-circle" class="girando"></i>Procesando con ${metodo === 'PSE' ? 'PSE' : 'Stripe'} (simulado)…`;
      lucide.createIcons({ root: boton });
      // Pausa corta para que se vea el estado "procesando", como en un pago real
      setTimeout(() => {
        try {
          pagarSuscripcion(metodo);
          avisarEnLaSiguientePantalla('Pago aprobado (simulado). Tu cuenta quedó al día y los cambios están habilitados.');
          ir('/suscripcion', { reemplazar: true });
        } catch (e) {
          $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
          lucide.createIcons({ root: $('#mensaje') });
          boton.disabled = false;
          boton.textContent = 'Intentar de nuevo';
        }
      }, 1200);
    });
  };
  dibujar();
}
