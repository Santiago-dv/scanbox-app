// Usuarios, áreas y permisos (sección 5.11): crear usuarios, asignar rol y área, desactivarlos.
import { marcoHTML, avisoHTML, pintar, tomarAvisoPendiente, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual, esAdminEmpresa } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { crearUsuario, actualizarUsuario, crearArea } from '../acciones.js';
import { ROLES } from '../datos/catalogos.js';
import { escapar } from '../formato.js';

const $ = (selector) => document.querySelector(selector);
const ROLES_EMPRESA = ['admin_org', 'supervisor', 'operador'];

function opcionesHTML(lista, elegido) {
  return lista.map(([valor, texto]) => `<option value="${valor}" ${valor === elegido ? 'selected' : ''}>${escapar(texto)}</option>`).join('');
}

export function pantallaUsuarios() {
  const persona = usuarioActual();
  if (!esAdminEmpresa(persona)) {
    return pintar(marcoHTML(`<h1>Usuarios</h1>${avisoHTML('rojo', 'lock', 'Solo el administrador de la empresa puede gestionar usuarios.')}`, 'mas', persona));
  }

  const pendiente = tomarAvisoPendiente();
  const datos = obtenerDatos();
  const areas = datos.areas.filter((a) => a.orgId === persona.orgId);
  const usuarios = datos.usuarios.filter((u) => u.orgId === persona.orgId);
  const rolesOpciones = ROLES_EMPRESA.map((r) => [r, ROLES[r]]);
  const areasOpciones = areas.map((a) => [a.id, a.nombre]);

  pintar(marcoHTML(`
    ${pendiente ? `<div id="aviso-pendiente">${pendiente}</div>` : ''}
    <h1>Usuarios y áreas</h1>
    <h2>Usuarios (${usuarios.length})</h2>
    <ul class="lista-tarjetas">${usuarios.map((u) => `
      <li class="tarjeta ${u.activo ? '' : 'inactivo'}">
        <div class="fila-edicion-titulo">
          <span><strong>${escapar(u.nombre)}</strong><span class="texto-suave bloque">${escapar(u.correo)}</span></span>
          ${u.activo
            ? '<span class="estado estado--verde"><i data-lucide="circle-check"></i>Activo</span>'
            : '<span class="estado estado--gris"><i data-lucide="circle-pause"></i>Desactivado</span>'}
        </div>
        <div class="dos-columnas">
          <label class="campo">Rol<select data-rol="${u.id}" ${u.id === persona.id ? 'disabled' : ''}>${opcionesHTML(rolesOpciones, u.rol)}</select></label>
          <label class="campo">Área<select data-area="${u.id}" ${u.rol === 'admin_org' ? 'disabled' : ''}>
            ${u.rol === 'admin_org' ? '<option>Toda la empresa</option>' : opcionesHTML(areasOpciones, u.areaId)}</select></label>
        </div>
        ${u.id === persona.id ? '<p class="texto-suave">Eres tú.</p>' : `
          <button class="btn btn-secundario btn-bloque" data-activo="${u.id}" data-valor="${!u.activo}">
            <i data-lucide="${u.activo ? 'user-x' : 'user-check'}"></i>${u.activo ? 'Desactivar' : 'Activar'}
          </button>`}
      </li>`).join('')}
    </ul>

    <form id="form-usuario" class="tarjeta pila separado" novalidate>
      <h2 class="titulo-bloque">Crear usuario</h2>
      <label class="campo">Nombre <input name="nombre" autocomplete="off"></label>
      <label class="campo">Correo <input name="correo" type="email" inputmode="email" autocomplete="off"></label>
      <div class="dos-columnas">
        <label class="campo">Rol<select name="rol">${opcionesHTML(rolesOpciones, 'operador')}</select></label>
        <label class="campo">Área<select name="area">${opcionesHTML(areasOpciones, areas[0]?.id)}</select></label>
      </div>
      <button type="submit" class="btn btn-primario btn-bloque"><i data-lucide="user-plus"></i>Crear usuario</button>
    </form>

    <h2>Áreas (${areas.length})</h2>
    <ul class="lista-simple">${areas.map((a) => `
      <li><strong>${escapar(a.nombre)}</strong>
        <span class="texto-suave bloque">${usuarios.filter((u) => u.areaId === a.id).length} usuarios · ${datos.fichas.filter((f) => f.areaId === a.id).length} fichas</span></li>`).join('')}
    </ul>
    <form id="form-area" class="fila-formulario separado" novalidate>
      <input name="nombre" placeholder="Nombre del área nueva" aria-label="Nombre del área nueva">
      <button type="submit" class="btn btn-secundario"><i data-lucide="plus"></i>Crear área</button>
    </form>
    <div id="mensaje" role="alert"></div>
  `, 'mas', persona));

  const error = (e) => {
    $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
    lucide.createIcons({ root: $('#mensaje') });
    $('#mensaje').scrollIntoView({ block: 'nearest' });
  };
  const listo = (texto) => {
    avisarEnLaSiguientePantalla(avisoHTML('verde', 'circle-check', texto));
    pantallaUsuarios();
  };

  document.querySelectorAll('[data-rol]').forEach((s) => s.addEventListener('change', () => {
    try { actualizarUsuario(s.dataset.rol, { rol: s.value }); listo('Rol actualizado.'); } catch (e) { error(e); }
  }));
  document.querySelectorAll('[data-area]').forEach((s) => s.addEventListener('change', () => {
    try { actualizarUsuario(s.dataset.area, { areaId: s.value }); listo('Área actualizada.'); } catch (e) { error(e); }
  }));
  document.querySelectorAll('[data-activo]').forEach((b) => b.addEventListener('click', () => {
    const activar = b.dataset.valor === 'true';
    try {
      actualizarUsuario(b.dataset.activo, { activo: activar });
      listo(activar ? 'Usuario activado.' : 'Usuario desactivado: ya no puede iniciar sesión.');
    } catch (e) { error(e); }
  }));

  $('#form-usuario').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    try {
      const { usuario, clave } = crearUsuario({
        nombre: f.nombre.value, correo: f.correo.value, rol: f.rol.value, areaId: f.area.value,
      });
      listo(`
        ${avisoHTML('verde', 'circle-check', `Se creó el usuario ${escapar(usuario.nombre)}. Compártele estos datos; la clave no se vuelve a mostrar.`)}
        <section class="tarjeta"><dl class="datos">
          <div class="dato"><dt>Correo</dt><dd>${escapar(usuario.correo)}</dd></div>
          <div class="dato"><dt>Clave temporal</dt><dd class="clave">${clave}</dd></div>
        </dl></section>`);
    } catch (e) { error(e); }
  });

  $('#form-area').addEventListener('submit', (evento) => {
    evento.preventDefault();
    try { const area = crearArea(evento.target.nombre.value); listo(`Se creó el área ${escapar(area.nombre)}.`); } catch (e) { error(e); }
  });
}
