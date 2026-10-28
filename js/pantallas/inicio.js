// Panel de inicio del operador, supervisor y administrador de la empresa.
import { marcoHTML, avisoHTML, pintar, tomarAvisoPendiente } from '../marco.js';
import { usuarioActual, puedeEditar } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import {
  buscarOrganizacion, buscarArea, buscarFicha, nombreDe,
  fichasDelAmbito, actividadDe, esDeHoy,
} from '../consultas.js';
import { contarCambiosPendientes } from '../conexion.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, tiempoRelativo } from '../formato.js';
import { ICONOS_ACCION } from '../datos/catalogos.js';

function metricaHTML(numero, texto, icono, color) {
  return `
    <div class="tarjeta metrica">
      <span class="circulo circulo--${color}"><i data-lucide="${icono}"></i></span>
      <p class="numero-grande">${numero}</p>
      <p class="texto-suave">${texto}</p>
    </div>`;
}

function accionHTML(texto, icono, enlace, habilitada) {
  if (!habilitada) {
    return `<button class="btn accion" disabled><i data-lucide="lock"></i>${texto}</button>`;
  }
  return `<a class="btn btn-secundario accion" href="${enlace}"><i data-lucide="${icono}"></i>${texto}</a>`;
}

function diasRestantes(iso) {
  const dias = Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
  return dias === 1 ? '1 día' : `${dias} días`;
}

// Alertas: pago de la empresa, trayectos sin documentos y etiquetas desactivadas escaneadas
function alertasPara(persona, organizacion, fichas) {
  const datos = obtenerDatos();
  const alertas = [];

  if (organizacion.estadoPago === 'bloqueado') {
    alertas.push({ color: 'rojo', icono: 'lock',
      texto: 'Tu organización está bloqueada por falta de pago. Puedes consultar todo, pero no hacer cambios.' });
  }
  if (organizacion.estadoPago === 'prorroga') {
    alertas.push({ color: 'ambar', icono: 'clock',
      texto: `Pago en prórroga: quedan ${diasRestantes(organizacion.prorrogaHasta)} para pagar la cuota más `
        + `${datos.configuracion.moraPorcentaje} % de mora. Monto: Por definir.` });
  }

  fichas
    .filter((f) => f.trayecto?.estado === 'preparacion' && f.documentos.length === 0)
    .forEach((f) => alertas.push({ color: 'rojo', icono: 'file-x', enlace: `#/ficha/${f.id}`,
      texto: `${formatearNumero(f.numeroEquipo)} tiene un trayecto listo, pero sin documentos.` }));

  datos.alertas
    .filter((a) => a.orgId === persona.orgId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 3)
    .forEach((a) => alertas.push({ color: 'rojo', icono: 'triangle-alert',
      enlace: a.fichaId ? `#/ficha/${a.fichaId}/historial` : null,
      texto: `${escapar(a.texto)} · ${escapar(nombreDe(a.usuarioId))}, ${tiempoRelativo(a.fecha)}` }));

  return alertas;
}

function alertaHTML(alerta) {
  const aviso = avisoHTML(alerta.color, alerta.icono, alerta.texto);
  return alerta.enlace ? `<a class="aviso-enlace" href="${alerta.enlace}">${aviso}</a>` : aviso;
}

function actividadHTML(registro) {
  const ficha = buscarFicha(registro.fichaId);
  const accion = registro.detalle.charAt(0).toLowerCase() + registro.detalle.slice(1);
  return `
    <li>
      <a class="actividad" href="#/ficha/${ficha.id}">
        <span class="circulo circulo--gris"><i data-lucide="${ICONOS_ACCION[registro.accion] ?? 'activity'}"></i></span>
        <span>
          <strong>${escapar(nombreDe(registro.usuarioId))}</strong> ${escapar(accion)}
          <span class="texto-suave bloque">${formatearNumero(ficha.numeroEquipo)} · ${tiempoRelativo(registro.horaTelefono)}</span>
        </span>
      </a>
    </li>`;
}

export function pantallaInicio() {
  const persona = usuarioActual();
  const organizacion = buscarOrganizacion(persona.orgId);
  const area = buscarArea(persona.areaId);
  const fichas = fichasDelAmbito(persona);
  const editable = puedeEditar(persona);

  const activas = fichas.filter((f) => f.estado === 'en_uso' || f.estado === 'en_transito').length;
  const enTransito = fichas.filter((f) => f.estado === 'en_transito').length;
  const cerradasHoy = fichas.filter((f) => esDeHoy(f.cerrada)).length;
  const pendientes = contarCambiosPendientes();

  const alertas = alertasPara(persona, organizacion, fichas);
  const actividad = actividadDe(fichas);

  const pendiente = tomarAvisoPendiente();

  pintar(marcoHTML(`
    ${pendiente ? avisoHTML('verde', 'circle-check', escapar(pendiente)) : ''}
    <h1>Hola, ${escapar(persona.nombre.split(' ')[0])}</h1>
    <p class="texto-suave">${escapar(organizacion.nombre)} · ${escapar(area?.nombre ?? 'Toda la empresa')}</p>
    ${persona.rol === 'admin_org' && organizacion.estadoPago !== 'al_dia'
      ? `<a class="btn btn-primario btn-bloque" href="#/pagar"><i data-lucide="credit-card"></i>${organizacion.estadoPago === 'bloqueado' ? 'Regularizar pago' : 'Pagar ahora'}</a>`
      : ''}

    <section class="metricas" aria-label="Resumen">
      ${metricaHTML(activas, 'Cajas activas', 'package', 'azul')}
      ${metricaHTML(enTransito, 'En tránsito', 'truck', 'ambar')}
      ${metricaHTML(cerradasHoy, 'Cerradas hoy', 'circle-check', 'verde')}
      ${metricaHTML(pendientes, 'Cambios sin sincronizar', 'cloud-upload', 'gris')}
    </section>

    <h2>Acceso rápido</h2>
    <div class="acciones">
      ${accionHTML('Escanear', 'scan-line', '#/escanear', true)}
      ${accionHTML('Asignar etiqueta', 'tag', '#/asignar', editable)}
      ${accionHTML('Iniciar trayecto', 'route', '#/trayecto', editable)}
    </div>

    <div class="columnas">
      <section>
        <h2>Alertas</h2>
        ${alertas.length
          ? alertas.map(alertaHTML).join('')
          : avisoHTML('verde', 'circle-check', 'Sin alertas. Todo en orden.')}
      </section>
      <section>
        <h2>Actividad reciente</h2>
        ${actividad.length
          ? `<ul class="lista-actividad">${actividad.map(actividadHTML).join('')}</ul>`
          : '<p class="texto-suave">Todavía no hay movimientos en tu área.</p>'}
      </section>
    </div>
  `, 'inicio', persona));
}
