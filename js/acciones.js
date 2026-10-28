// Acciones que CAMBIAN datos. Las que tocan una ficha dejan su registro en el historial
// de auditoría, que nunca se edita ni se borra (criterio de aceptación 4).
// Las de la cuenta (usuarios, pagos, lotes) quedan en "eventos".
import { obtenerDatos, guardar } from './almacen.js';
import {
  usuarioActual, puedeEditar, puedeEditarFicha, puedeCerrar, puedeGestionarInvitados,
  esAdminEmpresa, puedeVerFicha,
} from './sesion.js';
import { estaEnLinea } from './conexion.js';
import { limpiarNumero, revisarNumeroEquipo } from './iso6346.js';
import { ESTADOS } from './estados.js';

// ---------- Utilidades ----------

// Identificador único corto: "f" + fecha en base 36 + 4 letras al azar
export function nuevoId(prefijo) {
  return `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const ahora = () => new Date().toISOString();

export function registrarEnHistorial({
  fichaId, accion, detalle, antes = null, despues = null, ubicacion, coordenadas = null,
}) {
  const hora = ahora();
  obtenerDatos().auditoria.push({
    id: nuevoId('a'),
    fichaId,
    usuarioId: usuarioActual().id,
    accion, detalle, antes, despues, ubicacion, coordenadas,
    horaTelefono: hora,
    // Sin conexión, el cambio queda pendiente: la hora del servidor llega al sincronizar
    horaServidor: estaEnLinea() ? hora : null,
  });
}

// Movimientos de la cuenta que no son de una ficha (usuarios, etiquetas libres, pagos…)
function registrarEvento(orgId, texto, extra = {}) {
  obtenerDatos().eventos.push({
    id: nuevoId('ev'), orgId, fecha: ahora(), usuarioId: usuarioActual()?.id ?? null, texto, ...extra,
  });
}

function registrarAlerta(ficha, tipo, texto) {
  obtenerDatos().alertas.push({
    id: nuevoId('al'), orgId: ficha.orgId, tipo, fecha: ahora(), texto,
    fichaId: ficha.id, usuarioId: usuarioActual().id,
  });
}

function guardarOFallar() {
  if (!guardar()) {
    throw new Error('No hay espacio en este celular para guardar los datos. Reinicia la demostración o borra fotos.');
  }
}

// Clave temporal de 8 caracteres, sin letras que se confundan (I, l, O, 0)
export function claveTemporal() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(8)), (n) => letras[n % letras.length]).join('');
}

function correoEnUso(correo) {
  const datos = obtenerDatos();
  return datos.usuarios.some((u) => u.correo === correo) || datos.invitados.some((i) => i.correo === correo);
}

function sumarMeses(fecha, meses) {
  const resultado = new Date(fecha);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado.toISOString();
}

// ---------- Asignar etiqueta (etapa 7) ----------

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

// ---------- Contenido y fotos (etapa 8) ----------

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
  const foto = {
    id: nuevoId('ft'),
    descripcion: texto,
    fecha: ahora(),
    usuarioId: usuarioActual().id,
    ubicacion: ficha.ubicacion,
    imagen,
  };
  ficha.fotos.push(foto);
  registrarEnHistorial({
    fichaId, accion: 'agregar_foto', detalle: `Agregó la foto "${texto}"`,
    ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
  return foto;
}

// ---------- Trayecto (etapa 9) ----------

// En la demo solo se guarda el nombre del archivo, no el archivo
export function cargarDocumento(fichaId, nombre, { coordenadas = null } = {}) {
  const ficha = fichaEditable(fichaId);
  ficha.documentos.push({ id: nuevoId('d'), nombre, fecha: ahora(), usuarioId: usuarioActual().id });
  registrarEnHistorial({
    fichaId, accion: 'cargar_documento', detalle: `Cargó el documento "${nombre}"`,
    ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
}

function numeroCoincide(ficha, texto) {
  return limpiarNumero(texto) === limpiarNumero(ficha.numeroEquipo);
}

// Confirmar en persona que el número físico es el de la ficha
export function verificarNumero(fichaId, texto, { coordenadas = null } = {}) {
  const ficha = fichaEditable(fichaId);
  if (!numeroCoincide(ficha, texto)) {
    registrarAlerta(ficha, 'numero_no_coincide',
      `El número escrito (${limpiarNumero(texto)}) no coincide con la ficha ${ficha.numeroEquipo}`);
    guardar();
    throw new Error('El número no coincide con el de la ficha. Revisa el equipo: quedó registrada una alerta.');
  }
  if (revisarNumeroEquipo(ficha.numeroEquipo) === 'revisar') {
    throw new Error('El número de la ficha no pasa la validación ISO 6346. Revísalo con tu supervisor.');
  }
  ficha.numeroVerificado = true;
  registrarEnHistorial({
    fichaId, accion: 'verificar_numero', detalle: 'Verificó el número de equipo en persona',
    ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
}

// Fotos tomadas en las últimas 24 horas: cuentan como "fotos previas" al trayecto
export function fotosPrevias(ficha) {
  const limite = Date.now() - 24 * 60 * 60 * 1000;
  return ficha.fotos.filter((foto) => new Date(foto.fecha).getTime() >= limite);
}

// Lo que se exige antes de iniciar un trayecto (criterio de aceptación 3)
export function checklistTrayecto(ficha) {
  return {
    documentos: ficha.documentos.length > 0,
    fotos: fotosPrevias(ficha).length > 0,
    numero: Boolean(ficha.numeroVerificado),
  };
}

export function iniciarTrayecto(fichaId, { origen, vehiculo, destino, tipoDestino, coordenadas = null }) {
  const ficha = fichaEditable(fichaId);
  const lista = checklistTrayecto(ficha);
  if (!lista.documentos || !lista.fotos || !lista.numero) {
    throw new Error('Faltan documentos, fotos o la verificación del número. Completa el checklist.');
  }
  if (!origen.trim() || !destino.trim()) throw new Error('Escribe el origen y el destino.');
  if (ficha.trayecto?.estado === 'en_curso') throw new Error('Este equipo ya tiene un trayecto en curso.');

  const persona = usuarioActual();
  const ultimaFoto = [...ficha.fotos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
  const nodos = [{
    nombre: origen.trim(), tipo: 'almacen', estado: 'actual', llegada: ahora(),
    usuarioId: persona.id, fotoId: ultimaFoto.id, numeroConfirmado: true,
  }];
  if (vehiculo.trim()) {
    nodos.push({ nombre: `Camión ${limpiarNumero(vehiculo)}`, tipo: 'camion', estado: 'pendiente' });
  }
  nodos.push({ nombre: destino.trim(), tipo: tipoDestino, estado: 'pendiente' });

  // El trayecto anterior (ya terminado) se guarda aparte; su detalle sigue en el historial
  if (ficha.trayecto?.estado === 'completado') {
    ficha.trayectosAnteriores = [...(ficha.trayectosAnteriores ?? []), ficha.trayecto];
  }
  ficha.trayecto = { estado: 'en_curso', nodos };
  const antes = ficha.estado;
  ficha.estado = 'en_transito';
  ficha.ubicacion = origen.trim();

  registrarEnHistorial({
    fichaId, accion: 'iniciar_trayecto',
    detalle: `Inició el trayecto ${origen.trim()} → ${destino.trim()}`,
    antes: ESTADOS[antes].texto, despues: ESTADOS.en_transito.texto,
    ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
}

// Llegada a un punto del trayecto: número confirmado, foto de inspección y ubicación.
// Si el número no coincide, no se registra; si se salta un punto, queda una alerta.
export function registrarLlegada(fichaId, { indiceNodo, numero, imagen, saltoConfirmado = false, coordenadas = null }) {
  const ficha = fichaEditable(fichaId);
  const trayecto = ficha.trayecto;
  if (trayecto?.estado !== 'en_curso') throw new Error('Este equipo no tiene un trayecto en curso.');

  const nodo = trayecto.nodos[indiceNodo];
  const esperado = trayecto.nodos.findIndex((n) => n.estado === 'pendiente');
  if (!nodo || nodo.estado !== 'pendiente') throw new Error('Ese punto del trayecto ya se registró.');

  if (!numeroCoincide(ficha, numero)) {
    registrarAlerta(ficha, 'numero_no_coincide',
      `En "${nodo.nombre}" escribieron ${limpiarNumero(numero)}, pero la ficha es ${ficha.numeroEquipo}`);
    guardar();
    throw new Error('El número no coincide con el de la ficha. No se registró la llegada y quedó una alerta.');
  }
  if (!imagen) throw new Error('Toma la foto de inspección.');

  if (indiceNodo !== esperado) {
    if (!saltoConfirmado) throw new Error(`La secuencia no coincide: el siguiente punto es "${trayecto.nodos[esperado].nombre}".`);
    trayecto.nodos.slice(esperado, indiceNodo).forEach((omitido) => { omitido.estado = 'omitido'; });
    registrarAlerta(ficha, 'secuencia',
      `Se registró la llegada a "${nodo.nombre}" sin pasar por "${trayecto.nodos[esperado].nombre}"`);
  }

  const persona = usuarioActual();
  const foto = {
    id: nuevoId('ft'), descripcion: `Inspección en ${nodo.nombre}`, fecha: ahora(),
    usuarioId: persona.id, ubicacion: nodo.nombre, imagen,
  };
  ficha.fotos.push(foto);

  trayecto.nodos.forEach((n) => { if (n.estado === 'actual') n.estado = 'completado'; });
  const esUltimo = indiceNodo === trayecto.nodos.length - 1;
  Object.assign(nodo, {
    estado: esUltimo ? 'completado' : 'actual',
    llegada: ahora(), usuarioId: persona.id, fotoId: foto.id, numeroConfirmado: true,
  });
  ficha.ubicacion = nodo.nombre;

  registrarEnHistorial({
    fichaId, accion: 'llegada_nodo', detalle: `Registró llegada a "${nodo.nombre}" con foto de inspección`,
    ubicacion: nodo.nombre, coordenadas,
  });

  if (esUltimo) {
    trayecto.estado = 'completado';
    ficha.estado = 'en_uso';   // llegó: ahora se puede cerrar como Entregado
  }
  guardarOFallar();
  return { llegoAlDestino: esUltimo };
}

// ---------- Cierre y reasignación (etapa 9) ----------

function fichaParaCerrar(fichaId) {
  const ficha = obtenerDatos().fichas.find((f) => f.id === fichaId);
  if (!puedeCerrar(usuarioActual(), ficha)) {
    throw new Error('Solo un supervisor o el administrador puede hacer esto, y la empresa debe estar al día.');
  }
  return ficha;
}

export function cerrarFicha(fichaId, estadoFinal, { coordenadas = null } = {}) {
  const ficha = fichaParaCerrar(fichaId);
  if (!['entregado', 'archivado'].includes(estadoFinal)) throw new Error('Elige Entregado o Archivado.');
  if (['entregado', 'archivado'].includes(ficha.estado)) throw new Error('Esta ficha ya está cerrada.');
  if (ficha.estado === 'en_transito') throw new Error('El equipo está en tránsito: registra la llegada al destino antes de cerrar.');

  const antes = ficha.estado;
  ficha.estado = estadoFinal;
  ficha.cerrada = ahora();
  registrarEnHistorial({
    fichaId, accion: 'cerrar', detalle: `Cerró la ficha como ${ESTADOS[estadoFinal].texto}`,
    antes: ESTADOS[antes].texto, despues: ESTADOS[estadoFinal].texto,
    ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
}

// La etiqueta vuelve a "Sin asignar" y el contenido pasa a Cargas previas
export function liberarEtiqueta(fichaId, { coordenadas = null } = {}) {
  const ficha = fichaParaCerrar(fichaId);
  if (!['entregado', 'archivado'].includes(ficha.estado)) throw new Error('Primero cierra la ficha.');
  if (!ficha.etiqueta) throw new Error('Esta ficha ya no tiene etiqueta.');

  const datos = obtenerDatos();
  const etiqueta = datos.etiquetas.find((e) => e.codigo === ficha.etiqueta);
  const asignacion = datos.auditoria
    .filter((r) => r.fichaId === ficha.id && ['asignar', 'transferir_etiqueta'].includes(r.accion))
    .sort((a, b) => new Date(a.horaTelefono) - new Date(b.horaTelefono))[0];

  if (ficha.contenido.length) {
    ficha.cargasPrevias.push({
      desde: asignacion?.horaTelefono ?? ficha.cerrada,
      hasta: ahora(),
      cliente: ficha.pedido.cliente || 'Sin cliente',
      pedido: ficha.pedido.numero || '—',
      contenido: ficha.contenido,
    });
  }
  ficha.contenido = [];
  const codigo = ficha.etiqueta;
  ficha.etiqueta = null;
  if (etiqueta && etiqueta.estado === 'asignada') {
    etiqueta.estado = 'sin_asignar';
    etiqueta.fichaId = null;
  }

  registrarEnHistorial({
    fichaId, accion: 'liberar', detalle: `Liberó la etiqueta ${codigo}; el contenido pasó a Cargas previas`,
    antes: codigo, despues: null, ubicacion: ficha.ubicacion, coordenadas,
  });
  guardarOFallar();
}

// ---------- Invitados (etapa 11) ----------

export function crearInvitado({ nombre, correo, tipo, fichas, vence }) {
  const persona = usuarioActual();
  if (!puedeGestionarInvitados(persona)) throw new Error('No tienes permiso para crear invitados.');
  const correoLimpio = correo.trim().toLowerCase();
  if (!nombre.trim()) throw new Error('Escribe el nombre del invitado.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) throw new Error('Escribe un correo válido.');
  if (correoEnUso(correoLimpio)) throw new Error('Ese correo ya tiene una cuenta.');
  if (!fichas.length) throw new Error('Elige al menos una ficha a la que tendrá acceso.');
  if (!(new Date(vence) > new Date())) throw new Error('La fecha de vencimiento debe ser en el futuro.');

  const datos = obtenerDatos();
  const invalidas = fichas.filter((id) => !puedeVerFicha(persona, datos.fichas.find((f) => f.id === id)));
  if (invalidas.length) throw new Error('Hay fichas que no son de tu empresa.');

  const clave = claveTemporal();
  const invitado = {
    id: nuevoId('inv'), nombre: nombre.trim(), correo: correoLimpio, clave, tipo,
    orgId: persona.orgId, creadoPor: persona.id, fichas: [...fichas],
    creado: ahora(), vence: new Date(vence).toISOString(), revocado: false,
  };
  datos.invitados.push(invitado);
  registrarEvento(persona.orgId, `Creó la cuenta de invitado de ${invitado.nombre} (${tipo})`);
  guardarOFallar();
  return { invitado, clave };
}

export function revocarInvitado(invitadoId) {
  const persona = usuarioActual();
  if (!puedeGestionarInvitados(persona)) throw new Error('No tienes permiso para revocar invitados.');
  const invitado = obtenerDatos().invitados.find((i) => i.id === invitadoId && i.orgId === persona.orgId);
  if (!invitado) throw new Error('No se encontró el invitado.');
  invitado.revocado = true;
  registrarEvento(persona.orgId, `Revocó el acceso de ${invitado.nombre}`);
  guardarOFallar();
}

// ---------- Etiquetas (etapa 11) ----------

function etiquetaDeMiEmpresa(codigo) {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona) || !puedeEditar(persona)) {
    throw new Error('Solo el administrador de la empresa puede hacer esto, con la empresa al día.');
  }
  const etiqueta = obtenerDatos().etiquetas.find((e) => e.codigo === codigo && e.orgId === persona.orgId);
  if (!etiqueta) throw new Error('No se encontró la etiqueta.');
  return etiqueta;
}

// Etiqueta perdida o dañada: queda "Desactivada". Si tenía ficha, la ficha la conserva
// hasta transferirla a una etiqueta nueva.
export function desactivarEtiqueta(codigo, motivo) {
  const etiqueta = etiquetaDeMiEmpresa(codigo);
  if (etiqueta.estado === 'desactivada') throw new Error('La etiqueta ya está desactivada.');
  const antes = etiqueta.estado;
  etiqueta.estado = 'desactivada';
  etiqueta.motivo = motivo;

  if (etiqueta.fichaId) {
    const ficha = obtenerDatos().fichas.find((f) => f.id === etiqueta.fichaId);
    registrarEnHistorial({
      fichaId: ficha.id, accion: 'desactivar_etiqueta',
      detalle: `Desactivó la etiqueta ${codigo} (${motivo.toLowerCase()})`,
      antes: ESTADOS[antes].texto, despues: ESTADOS.desactivada.texto, ubicacion: ficha.ubicacion,
    });
  }
  registrarEvento(etiqueta.orgId, `Desactivó la etiqueta ${codigo} (${motivo.toLowerCase()})`, { etiqueta: codigo });
  guardarOFallar();
}

// "Transferir ficha a una etiqueta nueva", conservando todo el historial
export function transferirFicha(codigoViejo, codigoNuevo) {
  const vieja = etiquetaDeMiEmpresa(codigoViejo);
  const nueva = etiquetaDeMiEmpresa(codigoNuevo.toUpperCase());
  if (!vieja.fichaId) throw new Error('Esta etiqueta no tiene una ficha para transferir.');
  if (nueva.estado !== 'sin_asignar') throw new Error(`La etiqueta ${nueva.codigo} no está libre.`);

  const ficha = obtenerDatos().fichas.find((f) => f.id === vieja.fichaId);
  ficha.etiqueta = nueva.codigo;
  nueva.estado = 'asignada';
  nueva.fichaId = ficha.id;
  vieja.fichaId = null;
  if (vieja.estado !== 'desactivada') vieja.estado = 'desactivada';

  registrarEnHistorial({
    fichaId: ficha.id, accion: 'transferir_etiqueta',
    detalle: `Transfirió la ficha a la etiqueta ${nueva.codigo}`,
    antes: vieja.codigo, despues: nueva.codigo, ubicacion: ficha.ubicacion,
  });
  registrarEvento(vieja.orgId, `Transfirió la ficha ${ficha.numeroEquipo} de ${vieja.codigo} a ${nueva.codigo}`);
  guardarOFallar();
  return ficha;
}

// ---------- Usuarios y áreas (etapa 11) ----------

function soloAdmin() {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona)) throw new Error('Solo el administrador de la empresa puede hacer esto.');
  return persona;
}

export function crearUsuario({ nombre, correo, rol, areaId }) {
  const persona = soloAdmin();
  const correoLimpio = correo.trim().toLowerCase();
  if (!nombre.trim()) throw new Error('Escribe el nombre.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) throw new Error('Escribe un correo válido.');
  if (correoEnUso(correoLimpio)) throw new Error('Ese correo ya tiene una cuenta.');
  if (!['admin_org', 'supervisor', 'operador'].includes(rol)) throw new Error('Elige un rol.');
  if (rol !== 'admin_org' && !areaId) throw new Error('Elige el área de trabajo.');

  const clave = claveTemporal();
  const usuario = {
    id: nuevoId('u'), nombre: nombre.trim(), correo: correoLimpio, rol,
    orgId: persona.orgId, areaId: rol === 'admin_org' ? null : areaId, clave, activo: true,
  };
  obtenerDatos().usuarios.push(usuario);
  registrarEvento(persona.orgId, `Creó el usuario ${usuario.nombre}`);
  guardarOFallar();
  return { usuario, clave };
}

export function actualizarUsuario(usuarioId, cambios) {
  const persona = soloAdmin();
  const usuario = obtenerDatos().usuarios.find((u) => u.id === usuarioId && u.orgId === persona.orgId);
  if (!usuario) throw new Error('No se encontró el usuario.');
  if (usuario.id === persona.id && (cambios.activo === false || (cambios.rol && cambios.rol !== 'admin_org'))) {
    throw new Error('No puedes desactivarte ni quitarte el rol de administrador a ti mismo.');
  }
  if (cambios.rol) {
    usuario.rol = cambios.rol;
    if (cambios.rol === 'admin_org') usuario.areaId = null;
  }
  if (cambios.areaId !== undefined && usuario.rol !== 'admin_org') usuario.areaId = cambios.areaId;
  if (usuario.rol !== 'admin_org' && !usuario.areaId) {
    usuario.areaId = obtenerDatos().areas.find((a) => a.orgId === persona.orgId)?.id ?? null;
  }
  if (cambios.activo !== undefined) usuario.activo = cambios.activo;
  registrarEvento(persona.orgId, `Actualizó el usuario ${usuario.nombre}`);
  guardarOFallar();
}

export function crearArea(nombre) {
  const persona = soloAdmin();
  const limpio = nombre.trim();
  if (!limpio) throw new Error('Escribe el nombre del área.');
  const datos = obtenerDatos();
  if (datos.areas.some((a) => a.orgId === persona.orgId && a.nombre.toLowerCase() === limpio.toLowerCase())) {
    throw new Error('Ya existe un área con ese nombre.');
  }
  const area = { id: nuevoId('area'), orgId: persona.orgId, nombre: limpio };
  datos.areas.push(area);
  registrarEvento(persona.orgId, `Creó el área ${limpio}`);
  guardarOFallar();
  return area;
}

// ---------- Suscripción y registro (etapa 12) ----------

// Pago simulado: no se cobra nada. Deja la empresa al día.
export function pagarSuscripcion(metodo) {
  const persona = soloAdmin();
  if (!estaEnLinea()) throw new Error('Necesitas conexión a internet para pagar.');
  const datos = obtenerDatos();
  const organizacion = datos.organizaciones.find((o) => o.id === persona.orgId);
  const plan = datos.planes.find((p) => p.id === organizacion.plan);

  datos.pagos.push({
    id: nuevoId('p'), orgId: organizacion.id, fecha: ahora(),
    concepto: `Plan ${plan.nombre.toLowerCase()}${organizacion.recargoMora ? ` + ${datos.configuracion.moraPorcentaje} % de mora` : ''}`,
    metodo, monto: null, estado: 'aprobado',
  });
  const base = new Date(organizacion.proximoPago) > new Date() ? organizacion.proximoPago : ahora();
  organizacion.proximoPago = sumarMeses(base, organizacion.plan === 'anual' ? 12 : 1);
  organizacion.estadoPago = 'al_dia';
  organizacion.prorrogaHasta = null;
  organizacion.recargoMora = false;
  registrarEvento(organizacion.id, `Pagó la suscripción con ${metodo} (simulado)`);
  guardarOFallar();
}

// Registro de organización nueva: con código de invitación o pagando el plan elegido
export function registrarOrganizacion({ codigo, plan, empresa, admin }) {
  const datos = obtenerDatos();
  const conInvitacion = Boolean(codigo?.trim());
  if (conInvitacion && !datos.configuracion.invitaciones.includes(codigo.trim().toUpperCase())) {
    throw new Error('El código de invitación no es válido.');
  }
  if (!['mensual', 'anual'].includes(plan)) throw new Error('Elige un plan.');
  if (!empresa.nombre.trim()) throw new Error('Escribe el nombre de la empresa.');
  if (!admin.nombre.trim()) throw new Error('Escribe tu nombre.');
  const correo = admin.correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Escribe un correo válido.');
  if (correoEnUso(correo)) throw new Error('Ese correo ya tiene una cuenta.');
  if (admin.clave.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');

  const organizacion = {
    id: nuevoId('org'), nombre: empresa.nombre.trim(), tipo: empresa.tipo.trim() || 'Empresa',
    ciudad: empresa.ciudad.trim(), plan,
    estadoPago: 'al_dia',
    // Con invitación, el primer pago vence en 30 días; sin invitación, se paga hoy
    proximoPago: conInvitacion ? new Date(Date.now() + 30 * 86400000).toISOString() : ahora(),
    prorrogaHasta: null, recargoMora: false,
    fotoNumeroObligatoria: false, fijacionReciclada: 'abrazadera',
  };
  datos.organizaciones.push(organizacion);
  datos.areas.push({ id: nuevoId('area'), orgId: organizacion.id, nombre: 'Área principal' });
  datos.usuarios.push({
    id: nuevoId('u'), nombre: admin.nombre.trim(), correo, rol: 'admin_org',
    orgId: organizacion.id, areaId: null, clave: admin.clave, activo: true,
  });
  datos.eventos.push({ id: nuevoId('ev'), orgId: organizacion.id, fecha: ahora(), usuarioId: null,
    texto: `Se registró la empresa ${conInvitacion ? 'con invitación' : `con el plan ${plan}`}` });
  guardarOFallar();
  return { organizacion, correo, pagarAhora: !conInvitacion };
}

// ---------- Panel de ScanBox (etapa 13) ----------

function soloScanBox() {
  const persona = usuarioActual();
  if (persona?.rol !== 'admin_scanbox') throw new Error('Solo el administrador de ScanBox puede hacer esto.');
  return persona;
}

// Acciones de cartera: activar prórroga, aplicar recargo, bloquear ediciones, reactivar
export function cambiarEstadoPago(orgId, accion) {
  soloScanBox();
  const datos = obtenerDatos();
  const organizacion = datos.organizaciones.find((o) => o.id === orgId);
  if (!organizacion) throw new Error('No se encontró el cliente.');

  if (accion === 'prorroga') {
    organizacion.estadoPago = 'prorroga';
    organizacion.prorrogaHasta = new Date(Date.now() + datos.configuracion.prorrogaDias * 86400000).toISOString();
    registrarEvento(orgId, `ScanBox activó una prórroga de ${datos.configuracion.prorrogaDias} días`);
  } else if (accion === 'recargo') {
    organizacion.recargoMora = true;
    registrarEvento(orgId, `ScanBox aplicó el recargo por mora (${datos.configuracion.moraPorcentaje} %)`);
  } else if (accion === 'bloquear') {
    organizacion.estadoPago = 'bloqueado';
    registrarEvento(orgId, 'ScanBox bloqueó las ediciones por falta de pago');
  } else if (accion === 'reactivar') {
    organizacion.estadoPago = 'al_dia';
    organizacion.prorrogaHasta = null;
    organizacion.recargoMora = false;
    registrarEvento(orgId, 'ScanBox reactivó la cuenta');
  } else {
    throw new Error('Acción desconocida.');
  }
  guardarOFallar();
}

// Lote de códigos únicos: 2 letras, 2 números y 2 letras, sin I ni O (se confunden con 1 y 0)
export function generarLote(orgId, variante, cantidad) {
  soloScanBox();
  const total = Number(cantidad);
  if (!Number.isInteger(total) || total < 1 || total > 500) throw new Error('La cantidad debe estar entre 1 y 500.');
  if (!['magnetica', 'reciclada'].includes(variante)) throw new Error('Elige la variante.');
  const datos = obtenerDatos();
  if (!datos.organizaciones.some((o) => o.id === orgId)) throw new Error('Elige el cliente.');

  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const usados = new Set(datos.etiquetas.map((e) => e.codigo));
  const azar = (texto) => texto[crypto.getRandomValues(new Uint32Array(1))[0] % texto.length];
  const codigos = [];
  while (codigos.length < total) {
    const codigo = azar(letras) + azar(letras) + azar('0123456789') + azar('0123456789') + azar(letras) + azar(letras);
    if (!usados.has(codigo)) { usados.add(codigo); codigos.push(codigo); }
  }

  const anio = new Date().getFullYear();
  const consecutivo = datos.lotes.filter((l) => l.id.startsWith(`L-${anio}-`)).length + 1;
  const lote = { id: `L-${anio}-${String(consecutivo).padStart(3, '0')}`, orgId, variante, fecha: ahora() };
  datos.lotes.push(lote);
  codigos.forEach((codigo) => datos.etiquetas.push({
    codigo, lote: lote.id, orgId, variante, estado: 'sin_asignar', fichaId: null,
  }));
  registrarEvento(orgId, `ScanBox generó el lote ${lote.id} con ${total} etiquetas`);
  guardarOFallar();
  return { lote, codigos };
}

export function guardarConfiguracion({ prorrogaDias, moraPorcentaje, cobroEtiqueta }) {
  soloScanBox();
  const dias = Number(prorrogaDias);
  const mora = Number(moraPorcentaje);
  if (!Number.isInteger(dias) || dias < 1 || dias > 60) throw new Error('La prórroga debe ser de 1 a 60 días.');
  if (!(mora >= 0 && mora <= 50)) throw new Error('La mora debe estar entre 0 % y 50 %.');
  Object.assign(obtenerDatos().configuracion, {
    prorrogaDias: dias, moraPorcentaje: mora, cobroEtiqueta: cobroEtiqueta || null,
  });
  guardarOFallar();
}
