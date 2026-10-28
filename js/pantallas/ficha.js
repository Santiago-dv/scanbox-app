// Ficha de la caja o contenedor: la pantalla central de ScanBox.
// .../#/ficha/f01            → pestaña Contenido
// .../#/ficha/f01/historial  → pestaña Historial
import { marcoHTML, avisoHTML, pintar, tomarAvisoPendiente } from '../marco.js';
import { usuarioActual, puedeVerFicha, puedeEditar, puedeEditarFicha } from '../sesion.js';
import {
  buscarFicha, buscarArea, nombreDe, historialDeFicha, ultimaModificacion,
} from '../consultas.js';
import { obtenerDatos } from '../almacen.js';
import { estadoHTML, ESTADOS } from '../estados.js';
import { TIPOS_EQUIPO, VARIANTES, ICONOS_ACCION } from '../datos/catalogos.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, fechaHora, numero } from '../formato.js';
import { textoCoordenadas } from '../ubicacion.js';
import { leerFoto } from '../fotos.js';
import { prepararFoto } from './foto.js';
import { ir } from '../rutas.js';

const PESTANAS = [
  { id: 'contenido', texto: 'Contenido' },
  { id: 'evidencia', texto: 'Evidencia' },
  { id: 'trayecto',  texto: 'Trayecto' },
  { id: 'historial', texto: 'Historial' },
  { id: 'cargas',    texto: 'Cargas previas' },
];

// El invitado solo ve el contenido: ni el historial interno ni cargas de otros clientes
const PESTANAS_INVITADO = ['contenido', 'evidencia', 'trayecto'];

// Diferencia entre hora del teléfono y del servidor que se considera "notable"
const MINUTOS_DIFERENCIA = 15;

// ---------- Piezas pequeñas ----------

function filaDato(etiqueta, valor) {
  return `<div class="dato"><dt>${etiqueta}</dt><dd>${escapar(valor || '—')}</dd></div>`;
}

function itemHTML(item) {
  return `
    <li class="item">
      <span>
        <strong>${escapar(item.nombre)}</strong>
        <span class="texto-suave bloque">SKU ${escapar(item.sku)} · Lote ${escapar(item.lote)}</span>
      </span>
      <span class="item-cantidad">${numero(item.cantidad)}</span>
    </li>`;
}

function listaItemsHTML(items) {
  return `<ul class="lista-items">${items.map(itemHTML).join('')}</ul>`;
}

// Botón de acción principal: habilitado, o gris con candado si no se puede editar
function botonAccionHTML(texto, icono, enlace, habilitado) {
  const boton = habilitado
    ? `<a class="btn btn-primario btn-bloque" href="${enlace}"><i data-lucide="${icono}"></i>${texto}</a>`
    : `<button class="btn btn-bloque" disabled><i data-lucide="lock"></i>${texto}</button>`;
  return `<div class="barra-accion">${boton}</div>`;
}

// ---------- Pestañas ----------

function pestanaContenido(ficha, editable, mostrarBoton) {
  const contenido = ficha.contenido.length
    ? listaItemsHTML(ficha.contenido)
    : `<p class="texto-suave">${ficha.cargasPrevias.length && !ficha.etiqueta
        ? 'La etiqueta se liberó y el contenido pasó a Cargas previas.'
        : 'Todavía no hay contenido registrado.'}</p>`;

  return `
    <section class="tarjeta">
      <h2 class="titulo-bloque">Contenido</h2>
      ${contenido}
    </section>
    <section class="tarjeta">
      <h2 class="titulo-bloque">Pedido y cliente</h2>
      <dl class="datos">
        ${filaDato('Cliente', ficha.pedido.cliente)}
        ${filaDato('Pedido', ficha.pedido.numero)}
        ${filaDato('Factura', ficha.pedido.factura)}
        ${filaDato('Dirección de entrega', ficha.pedido.direccion)}
      </dl>
    </section>
    ${mostrarBoton ? botonAccionHTML('Editar contenido', 'pencil', `#/editar/${ficha.id}`, editable) : ''}`;
}

function fotoHTML(foto) {
  // En la etapa 8 las fotos nuevas traen la imagen; las de la demo son marcadores
  const imagen = foto.imagen
    ? `<img src="${foto.imagen}" alt="${escapar(foto.descripcion)}">`
    : `<span class="foto-marcador"><i data-lucide="image"></i></span>`;
  return `
    <figure class="foto">
      ${imagen}
      <figcaption>
        <strong>${escapar(foto.descripcion)}</strong>
        <span class="bloque">${fechaHora(foto.fecha)}</span>
        <span class="bloque"><i data-lucide="map-pin"></i> ${escapar(foto.ubicacion)}</span>
        <span class="bloque"><i data-lucide="user"></i> ${escapar(nombreDe(foto.usuarioId))}</span>
      </figcaption>
    </figure>`;
}

function pestanaEvidencia(ficha, editable, mostrarBoton) {
  const fotos = [...ficha.fotos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return `
    ${fotos.length
      ? `<div class="galeria">${fotos.map(fotoHTML).join('')}</div>`
      : '<p class="texto-suave">Todavía no hay fotos de evidencia.</p>'}
    ${mostrarBoton ? botonFotoHTML(editable) : ''}`;
}

// "Agregar foto" abre la cámara del celular directamente (sin pantalla intermedia)
function botonFotoHTML(editable) {
  if (!editable) return botonAccionHTML('Agregar foto', 'camera', '', false);
  return `
    <div class="barra-accion">
      <label class="btn btn-primario btn-bloque">
        <i data-lucide="camera"></i>Agregar foto
        <input id="entrada-evidencia" type="file" accept="image/*" capture="environment" hidden>
      </label>
    </div>`;
}

const ICONO_NODO = { completado: 'circle-check', actual: 'truck', pendiente: 'circle' };
const TEXTO_NODO = { completado: 'Completado', actual: 'Aquí está ahora', pendiente: 'Pendiente' };

function nodoHTML(nodo) {
  const detalle = nodo.llegada
    ? `<span class="texto-suave bloque">Llegada: ${fechaHora(nodo.llegada)} · ${escapar(nombreDe(nodo.usuarioId))}</span>
       <span class="texto-suave bloque">${nodo.numeroConfirmado ? 'Número de equipo confirmado' : 'Número sin confirmar'}${nodo.fotoId ? ' · con foto de inspección' : ''}</span>`
    : '';
  return `
    <li class="nodo nodo--${nodo.estado}">
      <span class="nodo-punto"><i data-lucide="${ICONO_NODO[nodo.estado]}"></i></span>
      <span>
        <strong>${escapar(nodo.nombre)}</strong>
        <span class="bloque nodo-estado">${TEXTO_NODO[nodo.estado]}</span>
        ${detalle}
      </span>
    </li>`;
}

function pestanaTrayecto(ficha, editable, mostrarBoton) {
  const trayecto = ficha.trayecto;
  const documentos = ficha.documentos.length
    ? `<ul class="lista-simple">${ficha.documentos.map((d) => `
        <li><i data-lucide="file-text"></i> ${escapar(d.nombre)}
          <span class="texto-suave bloque">${fechaHora(d.fecha)} · ${escapar(nombreDe(d.usuarioId))}</span></li>`).join('')}</ul>`
    : '<p class="texto-suave">No hay documentos cargados.</p>';

  let boton = '';
  if (mostrarBoton && (!trayecto || trayecto.estado === 'preparacion')) {
    boton = botonAccionHTML('Iniciar trayecto', 'route', `#/trayecto/${ficha.id}`, editable);
  } else if (mostrarBoton && trayecto.estado === 'en_curso') {
    boton = botonAccionHTML('Registrar llegada', 'map-pin', `#/trayecto/${ficha.id}`, editable);
  }

  return `
    <section class="tarjeta">
      <h2 class="titulo-bloque">Trayecto actual</h2>
      ${trayecto
        ? `<ol class="linea-tiempo">${trayecto.nodos.map(nodoHTML).join('')}</ol>`
        : '<p class="texto-suave">Esta ficha no tiene un trayecto registrado.</p>'}
    </section>
    <section class="tarjeta">
      <h2 class="titulo-bloque">Documentos</h2>
      ${documentos}
    </section>
    ${boton}`;
}

function registroHTML(registro) {
  const cambio = registro.antes || registro.despues
    ? `<span class="cambio"><span class="antes">${escapar(registro.antes ?? '—')}</span>
         <i data-lucide="arrow-right"></i>
         <span class="despues">${escapar(registro.despues ?? '—')}</span></span>`
    : '';

  // Cambio hecho sin conexión: si la hora del teléfono y la del servidor difieren mucho, se avisa
  const diferencia = Math.abs(new Date(registro.horaServidor) - new Date(registro.horaTelefono)) / 60000;
  const avisoHora = diferencia > MINUTOS_DIFERENCIA
    ? `<span class="hora-distinta"><i data-lucide="cloud-off"></i>
         Hecho sin conexión · hora del teléfono: ${fechaHora(registro.horaTelefono)}
         · llegó al servidor: ${fechaHora(registro.horaServidor)}</span>`
    : '';

  return `
    <li class="registro">
      <span class="circulo circulo--gris"><i data-lucide="${ICONOS_ACCION[registro.accion] ?? 'activity'}"></i></span>
      <span>
        <strong>${escapar(registro.detalle)}</strong>
        ${cambio}
        <span class="texto-suave bloque">${escapar(nombreDe(registro.usuarioId))} · ${fechaHora(registro.horaTelefono)}</span>
        <span class="texto-suave bloque"><i data-lucide="map-pin"></i> ${escapar(registro.ubicacion)}${registro.coordenadas ? ` · ${textoCoordenadas(registro.coordenadas)}` : ''}</span>
        ${avisoHora}
      </span>
    </li>`;
}

function pestanaHistorial(ficha) {
  const registros = historialDeFicha(ficha.id);
  return `
    <p class="texto-suave"><i data-lucide="lock"></i> El historial no se puede editar ni borrar.</p>
    <ul class="lista-registros">${registros.map(registroHTML).join('')}</ul>`;
}

function cargaHTML(carga) {
  return `
    <section class="tarjeta">
      <h2 class="titulo-bloque">${escapar(carga.cliente)}</h2>
      <p class="texto-suave">Pedido ${escapar(carga.pedido)} · ${fechaHora(carga.desde)} a ${fechaHora(carga.hasta)}</p>
      ${listaItemsHTML(carga.contenido)}
    </section>`;
}

function pestanaCargas(ficha) {
  const cargas = [...ficha.cargasPrevias].sort((a, b) => new Date(b.hasta) - new Date(a.hasta));
  return cargas.length
    ? cargas.map(cargaHTML).join('')
    : '<p class="texto-suave">Este equipo no tiene cargas previas registradas.</p>';
}

// ---------- Pantalla ----------

export function pantallaFicha(id, pestanaPedida = 'contenido') {
  const persona = usuarioActual();
  const ficha = buscarFicha(id);
  const esInvitado = persona.rol === 'invitado';
  const seccion = esInvitado ? 'invitado' : 'cajas';

  if (!puedeVerFicha(persona, ficha)) {
    return pintar(marcoHTML(`
      <h1>Ficha no disponible</h1>
      ${avisoHTML('rojo', 'lock', 'No tienes acceso a esta ficha.')}
    `, seccion, persona));
  }

  const visibles = PESTANAS.filter((p) => !esInvitado || PESTANAS_INVITADO.includes(p.id));
  const pestana = visibles.some((p) => p.id === pestanaPedida) ? pestanaPedida : 'contenido';

  const editable = puedeEditarFicha(persona, ficha);
  const cerrada = ['entregado', 'archivado'].includes(ficha.estado);
  const mostrarBotones = !esInvitado && !cerrada;   // al invitado y a las cerradas no se les muestra

  // Mensaje que dejó la pantalla anterior (por ejemplo, "Etiqueta asignada")
  const pendiente = tomarAvisoPendiente();

  // Avisos de solo lectura, en orden de importancia
  let aviso = '';
  if (esInvitado) {
    aviso = avisoHTML('azul', 'eye', 'Acceso de solo lectura');
  } else if (cerrada) {
    aviso = avisoHTML('verde', 'circle-check',
      `Ficha cerrada como ${ESTADOS[ficha.estado].texto} (${fechaHora(ficha.cerrada)}). Queda de solo lectura con su historial intacto.`);
  } else if (!puedeEditar(persona)) {
    aviso = avisoHTML('rojo', 'lock',
      'Tu organización está bloqueada por falta de pago. Puedes ver el último contenido y todo el historial, pero no hacer cambios.');
  }

  const tipo = TIPOS_EQUIPO[ficha.tipo];
  const area = buscarArea(ficha.areaId);
  const etiqueta = ficha.etiqueta
    ? obtenerDatos().etiquetas.find((e) => e.codigo === ficha.etiqueta)
    : null;
  const ultima = ultimaModificacion(ficha.id);

  const contarFotos = ficha.fotos.length ? ` (${ficha.fotos.length})` : '';
  const pestanasHTML = visibles.map((p) => `
    <a class="pestana" href="#/ficha/${ficha.id}/${p.id}" ${p.id === pestana ? 'aria-current="page"' : ''}>
      ${p.texto}${p.id === 'evidencia' ? contarFotos : ''}
    </a>`).join('');

  const cuerpo = {
    contenido: () => pestanaContenido(ficha, editable, mostrarBotones),
    evidencia: () => pestanaEvidencia(ficha, editable, mostrarBotones),
    trayecto: () => pestanaTrayecto(ficha, editable, mostrarBotones),
    historial: () => pestanaHistorial(ficha),
    cargas: () => pestanaCargas(ficha),
  }[pestana]();

  pintar(marcoHTML(`
    ${pendiente ? avisoHTML('verde', 'circle-check', escapar(pendiente)) : ''}
    ${aviso}
    <header class="ficha-encabezado">
      <p class="texto-suave"><i data-lucide="${tipo.icono}"></i> ${tipo.texto}${area ? ` · ${escapar(area.nombre)}` : ''}</p>
      <h1 class="numero-equipo">${formatearNumero(ficha.numeroEquipo)}</h1>
      <div class="fila">
        ${estadoHTML(ficha.estado)}
        <span class="estado estado--gris"><i data-lucide="tag"></i>${etiqueta
          ? `${etiqueta.codigo} · ${VARIANTES[etiqueta.variante].texto}`
          : 'Sin etiqueta'}</span>
      </div>
      <p class="ubicacion"><i data-lucide="map-pin"></i> ${escapar(ficha.ubicacion)}</p>
      ${ultima && !esInvitado
        ? `<p class="texto-suave">Última modificación: ${escapar(nombreDe(ultima.usuarioId))}, ${fechaHora(ultima.horaTelefono)}</p>`
        : ''}
    </header>

    <nav class="pestanas" aria-label="Secciones de la ficha">${pestanasHTML}</nav>

    ${cuerpo}
  `, seccion, persona));

  // Foto tomada desde la pestaña Evidencia: se achica y pasa a la pantalla de descripción
  document.querySelector('#entrada-evidencia')?.addEventListener('change', async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    prepararFoto(ficha.id, await leerFoto(archivo));
    ir(`/foto/${ficha.id}`);
  });

  // Si la pestaña activa quedó escondida a la derecha, se desliza para mostrarla
  document.querySelector('.pestana[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  window.scrollTo(0, 0);
}
