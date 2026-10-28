// Pantalla "Más": la sesión, las opciones de cada rol, el modo oscuro y las herramientas de la demo.
import { marcoHTML, pintar, mostrarToast } from '../marco.js';
import { usuarioActual, cerrarSesion, rutaDeInicio, esAdminEmpresa, ROLES_SUPERVISION } from '../sesion.js';
import { obtenerDatos, reiniciarDemo } from '../almacen.js';
import { ROLES } from '../datos/catalogos.js';
import { escapar } from '../formato.js';
import { simularSinConexion, simulandoSinConexion, contarCambiosPendientes } from '../conexion.js';
import { temaActual, cambiarTema } from '../tema.js';
import { ir } from '../rutas.js';

function opcionHTML(enlace, icono, titulo, detalle) {
  return `
    <li><a class="fila-enlace" href="${enlace}">
      <span class="circulo circulo--azul"><i data-lucide="${icono}"></i></span>
      <span class="fila-enlace-texto"><strong>${titulo}</strong><span class="texto-suave bloque">${detalle}</span></span>
      <i data-lucide="chevron-right"></i>
    </a></li>`;
}

export function pantallaMas() {
  const persona = usuarioActual();
  const datos = obtenerDatos();
  const organizacion = datos.organizaciones.find((o) => o.id === persona.orgId);
  const area = datos.areas.find((a) => a.id === persona.areaId);
  const detalle = [ROLES[persona.rol], organizacion?.nombre, area?.nombre].filter(Boolean).join(' · ');

  // Opciones según el rol
  const opciones = [];
  if (ROLES_SUPERVISION.includes(persona.rol)) {
    opciones.push(opcionHTML('#/invitados', 'user-plus', 'Invitados', 'Acceso temporal de solo lectura'));
  }
  if (esAdminEmpresa(persona)) {
    opciones.push(opcionHTML('#/etiquetas', 'tag', 'Etiquetas', 'Inventario, desactivar y transferir'));
    opciones.push(opcionHTML('#/usuarios', 'users', 'Usuarios y áreas', 'Roles, áreas y accesos'));
    opciones.push(opcionHTML('#/suscripcion', 'receipt', 'Suscripción', 'Plan, pagos y estado de la cuenta'));
  }

  const oscuro = temaActual() === 'oscuro';
  const simulando = simulandoSinConexion();

  pintar(marcoHTML(`
    <h1>Más</h1>
    <div class="tarjeta">
      <p class="texto-suave">Sesión iniciada como</p>
      <p class="titulo-tarjeta">${escapar(persona.nombre)}</p>
      <p>${escapar(detalle)}</p>
    </div>

    ${opciones.length ? `<ul class="lista-opciones">${opciones.join('')}</ul>` : ''}

    <h2>Pantalla</h2>
    <label class="opcion interruptor">
      <span><strong>Modo oscuro</strong><span class="texto-suave bloque">Menos brillo de noche o en lugares oscuros</span></span>
      <input id="tema" type="checkbox" role="switch" ${oscuro ? 'checked' : ''}>
    </label>

    <div class="pila separado">
      <button id="btn-salir" class="btn btn-secundario btn-bloque"><i data-lucide="log-out"></i>Cerrar sesión</button>
    </div>

    <details class="tarjeta separado">
      <summary class="resumen-desplegable"><i data-lucide="flask-conical"></i> Herramientas de la demostración</summary>
      <p class="texto-suave">No son funciones del producto: sirven para presentar el prototipo.</p>
      <label class="opcion interruptor">
        <span><strong>Simular sin conexión</strong><span class="texto-suave bloque">Como si el celular no tuviera señal. Al apagarlo se sincronizan los cambios.</span></span>
        <input id="simular" type="checkbox" role="switch" ${simulando ? 'checked' : ''}>
      </label>
      <button id="btn-reiniciar" class="btn btn-secundario btn-bloque separado"><i data-lucide="rotate-ccw"></i>Reiniciar demostración</button>
    </details>
  `, 'mas', persona));

  document.querySelector('#tema').addEventListener('change', (evento) => {
    cambiarTema(evento.target.checked ? 'oscuro' : 'claro');
  });

  document.querySelector('#simular').addEventListener('change', (evento) => {
    const antes = contarCambiosPendientes();
    simularSinConexion(evento.target.checked);
    if (evento.target.checked) mostrarToast('Modo sin conexión simulado: los cambios quedarán pendientes.');
    else if (!antes) mostrarToast('Conexión restablecida.');
  });

  document.querySelector('#btn-salir').addEventListener('click', () => {
    cerrarSesion();
    ir('/entrar', { reemplazar: true });
  });

  document.querySelector('#btn-reiniciar').addEventListener('click', () => {
    reiniciarDemo();
    ir(rutaDeInicio(), { reemplazar: true });
  });
}
