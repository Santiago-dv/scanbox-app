// Inicio y cierre de sesión, y qué puede ver o hacer cada persona.
// OJO: en la versión real esto lo valida un servidor. Aquí se simula
// con las cuentas de demostración guardadas en el navegador.
import { obtenerDatos } from './almacen.js';
import { fechaHora } from './formato.js';

const CLAVE_SESION = 'scanbox-sesion';
const CLAVE_DESTINO = 'scanbox-destino';
export const ROLES_OPERATIVOS = ['admin_org', 'supervisor', 'operador'];

let motivoSalida = null;

// localStorage y sessionStorage pueden fallar (modo incógnito, permisos)
function leer(almacenamiento, clave) {
  try { return JSON.parse(almacenamiento.getItem(clave)); } catch { return null; }
}
function escribir(almacenamiento, clave, valor) {
  try {
    if (valor === null) almacenamiento.removeItem(clave);
    else almacenamiento.setItem(clave, JSON.stringify(valor));
  } catch { /* sin almacenamiento: la sesión dura hasta recargar */ }
}

// Revisa que la cuenta exista y pueda entrar. Devuelve { persona } o { error }
// cuenta: 'usuario' o 'invitado'
function validarCuenta(cuenta, id) {
  const datos = obtenerDatos();

  if (cuenta === 'invitado') {
    const invitado = datos.invitados.find((i) => i.id === id);
    if (!invitado) return { error: 'Correo o contraseña incorrectos.' };
    if (invitado.revocado) return { error: 'Tu acceso de invitado fue revocado.' };
    if (new Date(invitado.vence) <= new Date()) {
      return { error: `Tu acceso de invitado venció (${fechaHora(invitado.vence)}). Pide uno nuevo a quien te invitó.` };
    }
    const { clave, ...persona } = invitado;   // la clave nunca sale de aquí
    return { persona: { ...persona, rol: 'invitado', cuenta: 'invitado' } };
  }

  const usuario = datos.usuarios.find((u) => u.id === id);
  if (!usuario) return { error: 'Correo o contraseña incorrectos.' };
  if (!usuario.activo) return { error: 'Tu cuenta está desactivada. Habla con el administrador de tu empresa.' };
  const { clave, ...persona } = usuario;
  return { persona: { ...persona, cuenta: 'usuario' } };
}

export function iniciarSesion(correo, clave) {
  const datos = obtenerDatos();
  const correoLimpio = correo.trim().toLowerCase();

  const usuario = datos.usuarios.find((u) => u.correo === correoLimpio);
  const invitado = datos.invitados.find((i) => i.correo === correoLimpio);
  const cuenta = usuario
    ? { ...usuario, cuenta: 'usuario' }
    : invitado ? { ...invitado, cuenta: 'invitado' } : null;

  // Mismo mensaje si el correo no existe o la clave está mal: no damos pistas
  if (!cuenta || cuenta.clave !== clave) return { error: 'Correo o contraseña incorrectos.' };

  const resultado = validarCuenta(cuenta.cuenta, cuenta.id);
  if (resultado.error) return resultado;

  escribir(localStorage, CLAVE_SESION, { cuenta: cuenta.cuenta, id: cuenta.id, inicio: new Date().toISOString() });
  return resultado;
}

// Persona con sesión activa, o null. Se revisa cada vez: si un invitado
// venció o un usuario fue desactivado, pierde el acceso de inmediato.
export function usuarioActual() {
  const sesion = leer(localStorage, CLAVE_SESION);
  if (!sesion) return null;
  const { persona, error } = validarCuenta(sesion.cuenta, sesion.id);
  if (error) {
    motivoSalida = error;
    cerrarSesion();
    return null;
  }
  return persona;
}

export function cerrarSesion() {
  escribir(localStorage, CLAVE_SESION, null);
}

// Por qué se cerró la sesión sola (se muestra una vez en la pantalla de entrada)
export function tomarMotivoSalida() {
  const motivo = motivoSalida;
  motivoSalida = null;
  return motivo;
}

// A dónde volver después de iniciar sesión (por ejemplo, la etiqueta de un QR)
export function recordarDestino(ruta) {
  escribir(sessionStorage, CLAVE_DESTINO, ruta);
}
export function tomarDestino() {
  const destino = leer(sessionStorage, CLAVE_DESTINO);
  escribir(sessionStorage, CLAVE_DESTINO, null);
  return destino;
}

export function rutaDeInicio(persona = usuarioActual()) {
  if (!persona) return '/entrar';
  if (persona.rol === 'admin_scanbox') return '/admin';
  if (persona.rol === 'invitado') return '/invitado';
  return '/inicio';
}

// ---------- Permisos ----------

export function puedeVerFicha(persona, ficha) {
  if (!persona || !ficha) return false;
  if (persona.rol === 'invitado') return persona.fichas.includes(ficha.id);
  if (persona.rol === 'admin_scanbox') return false;   // ScanBox supervisa cuentas, no el contenido
  return persona.orgId === ficha.orgId;
}

export function puedeVerEtiqueta(persona, etiqueta) {
  if (!persona || !etiqueta) return false;
  if (persona.rol === 'invitado') return persona.fichas.includes(etiqueta.fichaId);
  if (persona.rol === 'admin_scanbox') return false;
  return persona.orgId === etiqueta.orgId;
}

// Una organización bloqueada por falta de pago puede consultar, pero no cambiar nada
export function puedeEditar(persona) {
  if (!persona || !ROLES_OPERATIVOS.includes(persona.rol)) return false;
  const organizacion = obtenerDatos().organizaciones.find((o) => o.id === persona.orgId);
  return organizacion?.estadoPago !== 'bloqueado';
}

// Editar una ficha: la empresa no está bloqueada y la ficha no está cerrada
export function puedeEditarFicha(persona, ficha) {
  return puedeEditar(persona) && puedeVerFicha(persona, ficha)
    && !['entregado', 'archivado'].includes(ficha.estado);
}
