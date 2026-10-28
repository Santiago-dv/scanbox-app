// Consultas que usan varias pantallas. Solo leen datos, nunca los cambian.
import { obtenerDatos } from './almacen.js';

export const buscarFicha = (id) => obtenerDatos().fichas.find((f) => f.id === id);
export const buscarUsuario = (id) => obtenerDatos().usuarios.find((u) => u.id === id);
export const buscarOrganizacion = (id) => obtenerDatos().organizaciones.find((o) => o.id === id);
export const buscarArea = (id) => obtenerDatos().areas.find((a) => a.id === id);

export function nombreDe(usuarioId) {
  return buscarUsuario(usuarioId)?.nombre ?? 'Usuario desconocido';
}

// Fichas del trabajo diario de una persona:
// el administrador ve toda su empresa; supervisor y operador, su área.
export function fichasDelAmbito(persona) {
  return obtenerDatos().fichas.filter((f) =>
    f.orgId === persona.orgId &&
    (persona.rol === 'admin_org' || f.areaId === persona.areaId));
}

// Registros del historial de esas fichas, del más reciente al más antiguo
export function actividadDe(fichas, cantidad = 6) {
  const ids = new Set(fichas.map((f) => f.id));
  return obtenerDatos().auditoria
    .filter((registro) => ids.has(registro.fichaId))
    .sort((a, b) => new Date(b.horaTelefono) - new Date(a.horaTelefono))
    .slice(0, cantidad);
}

export function esDeHoy(iso) {
  return Boolean(iso) && new Date(iso).toDateString() === new Date().toDateString();
}

// Historial completo de una ficha, del más reciente al más antiguo
export function historialDeFicha(fichaId) {
  return actividadDe([{ id: fichaId }], Infinity);
}

export function ultimaModificacion(fichaId) {
  return historialDeFicha(fichaId)[0] ?? null;
}
