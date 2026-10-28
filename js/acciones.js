// Acciones que CAMBIAN datos. Cada una deja su registro en el historial de auditoría,
// que nunca se edita ni se borra (criterio de aceptación 4).
import { obtenerDatos, guardar } from './almacen.js';
import { usuarioActual, puedeEditar, puedeEditarFicha } from './sesion.js';
import { limpiarNumero } from './iso6346.js';

// Identificador único corto: "f" + fecha en base 36 + 4 letras al azar
export function nuevoId(prefijo) {
  return `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function registrarEnHistorial({
  fichaId, accion, detalle, antes = null, despues = null, ubicacion, coordenadas = null,
}) {
  const ahora = new Date().toISOString();
  obtenerDatos().auditoria.push({
    id: nuevoId('a'),
    fichaId,
    usuarioId: usuarioActual().id,
    accion, detalle, antes, despues, ubicacion, coordenadas,
    horaTelefono: ahora,
    horaServidor: ahora,   // en la etapa 14, sin conexión, esta hora llega al sincronizar
  });
}

function guardarOFallar() {
  if (!guardar()) {
    throw new Error('No hay espacio en este celular para guardar los datos. Reinicia la demostración o borra fotos.');
  }
}

// Ficha activa (con etiqueta) del mismo equipo en la empresa, si existe
export function fichaActivaDeEquipo(orgId, numeroEquipo) {
  const numero = limpiarNumero(numeroEquipo);
  return obtenerDatos().fichas.find((f) =>
    f.orgId === orgId && f.etiqueta && limpiarNumero(f.numeroEquipo) === numero);
}

// Paso 6 de "Asignar etiqueta": crea la ficha y la etiqueta pasa a "Asignada"
export function asignarEtiqueta(borrador) {
  const datos = obtenerDatos();
  const persona = usuarioActual();
  if (!puedeEditar(persona)) throw new Error('Tu organización no puede hacer cambios en este momento.');

  const etiqueta = datos.etiquetas.find((e) => e.codigo === borrador.codigo);
  if (!etiqueta || etiqueta.orgId !== persona.orgId || etiqueta.estado !== 'sin_asignar') {
    throw new Error(`La etiqueta ${borrador.codigo} ya no está libre.`);
  }

  const activa = fichaActivaDeEquipo(persona.orgId, borrador.numero);
  if (activa) {
    throw new Error(`Este equipo ya tiene una ficha activa con la etiqueta ${activa.etiqueta}.`);
  }

  // Si el equipo ya tuvo fichas antes, sus cargas previas lo acompañan
  const numero = limpiarNumero(borrador.numero);
  const anteriores = datos.fichas.filter((f) =>
    f.orgId === persona.orgId && limpiarNumero(f.numeroEquipo) === numero);
  const cargasPrevias = anteriores.flatMap((f) => f.cargasPrevias);

  const ahora = new Date().toISOString();
  const ficha = {
    id: nuevoId('f'),
    orgId: persona.orgId,
    areaId: borrador.areaId,
    tipo: borrador.tipo,
    numeroEquipo: numero,
    numeroVerificado: borrador.numeroVerificado,
    etiqueta: etiqueta.codigo,
    estado: 'en_uso',
    ubicacion: borrador.ubicacion,
    pedido: { ...borrador.pedido },
    contenido: borrador.contenido.map((item) => ({ ...item })),
    fotos: borrador.foto
      ? [{ id: nuevoId('ft'), descripcion: 'Número del equipo', fecha: borrador.foto.fecha,
           usuarioId: persona.id, ubicacion: borrador.ubicacion, imagen: borrador.foto.imagen }]
      : [],
    documentos: [],
    trayecto: null,
    cargasPrevias,
  };

  datos.fichas.push(ficha);
  etiqueta.estado = 'asignada';
  etiqueta.fichaId = ficha.id;
  etiqueta.variante = borrador.variante;

  const productos = ficha.contenido.length === 1 ? '1 producto' : `${ficha.contenido.length} productos`;
  registrarEnHistorial({
    fichaId: ficha.id,
    accion: 'asignar',
    detalle: `Asignó la etiqueta ${etiqueta.codigo} con ${productos}${borrador.foto ? ' y foto del número' : ''}`,
    despues: etiqueta.codigo,
    ubicacion: borrador.ubicacion,
    coordenadas: borrador.coordenadas,
  });

  guardarOFallar();
  return ficha;
}

function fichaEditable(fichaId) {
  const ficha = obtenerDatos().fichas.find((f) => f.id === fichaId);
  if (!puedeEditarFicha(usuarioActual(), ficha)) {
    throw new Error('Esta ficha no se puede modificar: está cerrada o tu organización está bloqueada.');
  }
  return ficha;
}

// "Editar contenido": compara la lista nueva con la anterior y registra cada cambio.
// Cada producto de la lista editada trae "origen" (su posición en la lista anterior)
// o null si es nuevo, y "retirado" si se quitó. Devuelve cuántos cambios hubo.
export function editarContenido(fichaId, productos, { coordenadas = null } = {}) {
  const ficha = fichaEditable(fichaId);
  const anterior = ficha.contenido;
  const cambios = [];

  productos.forEach((p) => {
    if (p.origen === null) {
      if (!p.retirado) {
        cambios.push({ detalle: `Agregó "${p.nombre}"`, antes: null, despues: String(p.cantidad) });
      }
      return;
    }
    const original = anterior[p.origen];
    if (p.retirado) {
      cambios.push({ detalle: `Retiró "${original.nombre}"`, antes: String(original.cantidad), despues: '0' });
    } else if (p.cantidad !== original.cantidad) {
      cambios.push({ detalle: `Cambió la cantidad de "${original.nombre}"`,
        antes: String(original.cantidad), despues: String(p.cantidad) });
    }
  });

  if (!cambios.length) return 0;

  ficha.contenido = productos
    .filter((p) => !p.retirado)
    .map(({ nombre, sku, cantidad, lote }) => ({ nombre, sku, cantidad, lote }));

  cambios.forEach((cambio) => registrarEnHistorial({
    fichaId, accion: 'editar_contenido', ...cambio, ubicacion: ficha.ubicacion, coordenadas,
  }));

  guardarOFallar();
  return cambios.length;
}

// "Agregar foto": la foto queda en la galería de evidencia con fecha, ubicación y autor
export function agregarFoto(fichaId, { imagen, descripcion, coordenadas = null }) {
  const ficha = fichaEditable(fichaId);
  const texto = descripcion.trim() || 'Foto de evidencia';
  ficha.fotos.push({
    id: nuevoId('ft'),
    descripcion: texto,
    fecha: new Date().toISOString(),
    usuarioId: usuarioActual().id,
    ubicacion: ficha.ubicacion,
    imagen,
  });
  registrarEnHistorial({
    fichaId, accion: 'agregar_foto', detalle: `Agregó la foto "${texto}"`,
    ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
}
