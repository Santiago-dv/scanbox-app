// Lo que pasa al abrir un QR: .../#/c/KM47TR
// Esta misma pantalla la usará "Escanear" en la etapa 6.
import { marcoHTML, avisoHTML, pintar } from '../marco.js';
import { usuarioActual, recordarDestino, puedeVerEtiqueta, puedeEditar } from '../sesion.js';
import { obtenerDatos, guardar } from '../almacen.js';
import { estadoHTML } from '../estados.js';
import { VARIANTES } from '../datos/catalogos.js';
import { ir } from '../rutas.js';
import { pantallaEntrar } from './entrar.js';

export function pantallaCodigo(codigoEnDireccion) {
  const codigo = codigoEnDireccion.toUpperCase();
  const persona = usuarioActual();

  // Regla de acceso: sin sesión no se muestra NINGÚN dato de la etiqueta
  if (!persona) {
    recordarDestino(`/c/${codigo}`);
    return pantallaEntrar({ desdeQR: true });
  }

  const datos = obtenerDatos();
  const etiqueta = datos.etiquetas.find((e) => e.codigo === codigo);
  const seccion = persona.rol === 'invitado' ? 'invitado' : 'escanear';

  // No existe o es de otra empresa: mismo mensaje, sin pistas
  if (!puedeVerEtiqueta(persona, etiqueta)) {
    return pintar(marcoHTML(`
      <h1>Etiqueta ${codigo}</h1>
      ${avisoHTML('rojo', 'lock', 'No tienes acceso a esta etiqueta. Si crees que es un error, habla con tu supervisor.')}
    `, seccion, persona));
  }

  // Asignada: directo a la ficha
  if (etiqueta.estado === 'asignada') {
    return ir(`/ficha/${etiqueta.fichaId}`, { reemplazar: true });
  }

  // Desactivada: aviso en rojo y queda registrada una alerta
  if (etiqueta.estado === 'desactivada') {
    datos.alertas.push({
      id: `al${Date.now()}`,
      orgId: etiqueta.orgId,
      tipo: 'etiqueta_desactivada',
      fecha: new Date().toISOString(),
      texto: `Se escaneó la etiqueta desactivada ${codigo}`,
      etiqueta: codigo,
      usuarioId: persona.id,
    });
    guardar();
    return pintar(marcoHTML(`
      <h1>Etiqueta ${codigo}</h1>
      <p>${estadoHTML('desactivada')}</p>
      ${avisoHTML('rojo', 'triangle-alert',
        'Esta etiqueta está desactivada. No la uses para identificar carga. Quedó registrada una alerta para el administrador.')}
    `, seccion, persona));
  }

  // Sin asignar: ofrecer asignarla (si la empresa no está bloqueada)
  const variante = VARIANTES[etiqueta.variante].texto.toLowerCase();
  const boton = puedeEditar(persona)
    ? `<a class="btn btn-acento btn-bloque" href="#/asignar/${codigo}">
         <i data-lucide="tag"></i>Asignar ahora
       </a>`
    : `<button class="btn btn-bloque" disabled><i data-lucide="lock"></i>Asignar ahora</button>
       ${avisoHTML('rojo', 'lock', 'Tu organización no puede hacer cambios hasta ponerse al día con el pago.')}`;

  pintar(marcoHTML(`
    <h1>Etiqueta ${codigo}</h1>
    <p>${estadoHTML('sin_asignar')}</p>
    <p>Esta etiqueta ${variante} está libre y lista para usar.</p>
    <div class="pila">${boton}</div>
  `, seccion, persona));
}