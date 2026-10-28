// Trayecto (sección 5.6):
// .../#/trayecto        → equipos listos para salir y en tránsito
// .../#/trayecto/f01    → iniciar (con checklist obligatorio) o registrar llegada
import { marcoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual, puedeEditarFicha } from '../sesion.js';
import { buscarFicha, fichasDelAmbito } from '../consultas.js';
import {
  checklistTrayecto, fotosPrevias, cargarDocumento, verificarNumero, agregarFoto,
  iniciarTrayecto, registrarLlegada,
} from '../acciones.js';
import { leerFoto } from '../fotos.js';
import { pedirCoordenadas } from '../ubicacion.js';
import { estadoHTML } from '../estados.js';
import { TIPOS_EQUIPO } from '../datos/catalogos.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, fechaHora } from '../formato.js';
import { lineaTiempoHTML } from './ficha.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);
let coordenadas = null;

function mensaje(html) {
  const lugar = $('#mensaje');
  lugar.innerHTML = html;
  lucide.createIcons({ root: lugar });
  lugar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function error(e) {
  mensaje(avisoHTML('rojo', 'circle-alert', escapar(e.message)));
}

function volverHTML(ficha) {
  return `<p class="texto-suave"><a class="enlace" href="#/ficha/${ficha.id}/trayecto"><i data-lucide="arrow-left"></i> ${formatearNumero(ficha.numeroEquipo)}</a></p>`;
}

// ---------- Sin ficha: elegir el equipo ----------

function tarjetaHTML(ficha) {
  return `
    <a class="tarjeta tarjeta-enlace" href="#/trayecto/${ficha.id}">
      <span class="texto-suave"><i data-lucide="${TIPOS_EQUIPO[ficha.tipo].icono}"></i> ${TIPOS_EQUIPO[ficha.tipo].texto} · ${escapar(ficha.ubicacion)}</span>
      <span class="titulo-tarjeta">${formatearNumero(ficha.numeroEquipo)}</span>
      ${estadoHTML(ficha.estado)}
    </a>`;
}

function elegirEquipo(persona) {
  const fichas = fichasDelAmbito(persona).filter((f) => f.etiqueta);
  const enCamino = fichas.filter((f) => f.trayecto?.estado === 'en_curso');
  const listas = fichas.filter((f) => f.estado === 'en_uso' && f.trayecto?.estado !== 'en_curso');
  pintar(marcoHTML(`
    <h1>Trayectos</h1>
    <h2>En tránsito: registrar llegada</h2>
    <div class="pila">${enCamino.length ? enCamino.map(tarjetaHTML).join('') : '<p class="texto-suave">No hay equipos en tránsito en tu área.</p>'}</div>
    <h2>Listos para salir</h2>
    <div class="pila">${listas.length ? listas.map(tarjetaHTML).join('') : '<p class="texto-suave">No hay equipos en uso en tu área.</p>'}</div>
  `, 'inicio', persona));
}

// ---------- Iniciar trayecto: checklist obligatorio ----------

function itemChecklist(cumple, titulo, detalle, accion) {
  return `
    <li class="check ${cumple ? 'check--ok' : 'check--falta'}">
      <span class="circulo circulo--${cumple ? 'verde' : 'rojo'}"><i data-lucide="${cumple ? 'circle-check' : 'circle-x'}"></i></span>
      <span class="check-cuerpo">
        <strong>${titulo}</strong>
        <span class="texto-suave bloque">${detalle}</span>
        ${cumple ? '' : accion}
      </span>
    </li>`;
}

function vistaIniciar(ficha, persona) {
  const lista = checklistTrayecto(ficha);
  const listo = lista.documentos && lista.fotos && lista.numero;
  const preparado = ficha.trayecto?.estado === 'preparacion' ? ficha.trayecto.nodos : null;
  const origen = preparado?.[0]?.nombre ?? ficha.ubicacion;
  const destino = preparado?.at(-1)?.nombre ?? '';
  const tipoDestino = preparado?.at(-1)?.tipo ?? 'bodega';
  const recientes = fotosPrevias(ficha).length;

  pintar(marcoHTML(`
    ${volverHTML(ficha)}
    <h1>Iniciar trayecto</h1>
    <p>Antes de salir, la app exige estos tres puntos. El botón se activa cuando todos estén en verde.</p>

    <ol class="checklist">
      ${itemChecklist(lista.documentos, 'Documentos',
        ficha.documentos.length ? ficha.documentos.map((d) => escapar(d.nombre)).join(' · ') : 'No hay documentos cargados.',
        `<label class="btn btn-secundario btn-bloque"><i data-lucide="file-up"></i>Cargar documento
           <input id="entrada-documento" type="file" accept=".pdf,image/*" hidden></label>`)}
      ${itemChecklist(lista.fotos, 'Fotos antes de salir',
        recientes ? `${recientes} foto${recientes === 1 ? '' : 's'} en las últimas 24 horas.` : 'No hay fotos de las últimas 24 horas.',
        `<label class="btn btn-secundario btn-bloque"><i data-lucide="camera"></i>Tomar foto
           <input id="entrada-foto" type="file" accept="image/*" capture="environment" hidden></label>`)}
      ${itemChecklist(lista.numero, 'Número de equipo verificado',
        lista.numero ? `${formatearNumero(ficha.numeroEquipo)} confirmado en persona.` : 'Escribe el número que ves en el equipo.',
        `<form id="form-verificar" class="fila-formulario" novalidate>
           <input name="numero" class="mayusculas" placeholder="${formatearNumero(ficha.numeroEquipo)}" autocomplete="off" autocapitalize="characters" aria-label="Número de equipo">
           <button type="submit" class="btn btn-secundario">Verificar</button>
         </form>`)}
    </ol>

    <form id="form-trayecto" class="pila separado" novalidate>
      <h2 class="titulo-bloque">Recorrido</h2>
      <label class="campo">Origen <input name="origen" value="${escapar(origen)}"></label>
      <label class="campo">Placa del camión (opcional) <input name="vehiculo" class="mayusculas" placeholder="TKL482" autocapitalize="characters"></label>
      <label class="campo">Destino <input name="destino" value="${escapar(destino)}" placeholder="Terminal de contenedores, Puerto de Cartagena"></label>
      <label class="campo">El destino es
        <select name="tipoDestino">
          <option value="puerto" ${tipoDestino === 'puerto' ? 'selected' : ''}>Puerto</option>
          <option value="bodega" ${tipoDestino !== 'puerto' ? 'selected' : ''}>Bodega</option>
        </select>
      </label>
      <div id="mensaje" role="alert"></div>
      <div class="pie-paso">
        <a class="btn btn-secundario" href="#/ficha/${ficha.id}/trayecto">Cancelar</a>
        <button type="submit" class="btn btn-primario" ${listo ? '' : 'disabled'}>
          <i data-lucide="${listo ? 'route' : 'lock'}"></i>${listo ? 'Iniciar trayecto' : 'Completa el checklist'}
        </button>
      </div>
    </form>
  `, 'inicio', persona));

  const redibujar = () => vistaIniciar(buscarFicha(ficha.id), persona);

  $('#entrada-documento')?.addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    try { cargarDocumento(ficha.id, archivo.name, { coordenadas }); redibujar(); } catch (e) { error(e); }
  });
  $('#entrada-foto')?.addEventListener('change', async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    try {
      agregarFoto(ficha.id, { imagen: await leerFoto(archivo), descripcion: 'Antes de salir', coordenadas });
      redibujar();
    } catch (e) { error(e); }
  });
  $('#form-verificar')?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    try { verificarNumero(ficha.id, evento.target.numero.value, { coordenadas }); redibujar(); } catch (e) { error(e); }
  });
  $('#form-trayecto').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    try {
      iniciarTrayecto(ficha.id, {
        origen: f.origen.value, vehiculo: f.vehiculo.value, destino: f.destino.value,
        tipoDestino: f.tipoDestino.value, coordenadas,
      });
      avisarEnLaSiguientePantalla('Trayecto iniciado. El equipo quedó En tránsito.');
      ir(`/ficha/${ficha.id}/trayecto`, { reemplazar: true });
    } catch (e) { error(e); }
  });
}

// ---------- Registrar llegada a un punto ----------

function vistaLlegada(ficha, persona) {
  const nodos = ficha.trayecto.nodos;
  const esperado = nodos.findIndex((n) => n.estado === 'pendiente');
  let imagen = null;

  const opciones = nodos.map((nodo, i) => nodo.estado !== 'pendiente' ? '' : `
    <label class="opcion">
      <input type="radio" name="nodo" value="${i}" ${i === esperado ? 'checked' : ''}>
      <span><strong>${escapar(nodo.nombre)}</strong>
        <span class="texto-suave bloque">${i === esperado ? 'Siguiente punto' : 'Más adelante en el recorrido'}</span></span>
    </label>`).join('');

  pintar(marcoHTML(`
    ${volverHTML(ficha)}
    <h1>Registrar llegada</h1>
    <section class="tarjeta"><ol class="linea-tiempo">${lineaTiempoHTML(ficha.trayecto)}</ol></section>

    <form id="form-llegada" class="pila separado" novalidate>
      <h2 class="titulo-bloque">¿A qué punto llegó?</h2>
      <div class="pila">${opciones}</div>
      <div id="aviso-salto"></div>

      <label class="campo">Confirma el número de equipo
        <input name="numero" class="mayusculas" placeholder="${formatearNumero(ficha.numeroEquipo)}" autocomplete="off" autocapitalize="characters">
      </label>

      <h2 class="titulo-bloque">Foto de inspección</h2>
      <img id="vista-foto" class="vista-previa" alt="Foto de inspección" hidden>
      <label class="btn btn-secundario btn-bloque"><i data-lucide="camera"></i><span id="texto-foto">Tomar foto de inspección</span>
        <input id="entrada-foto" type="file" accept="image/*" capture="environment" hidden></label>

      <div id="mensaje" role="alert"></div>
      <div class="pie-paso">
        <a class="btn btn-secundario" href="#/ficha/${ficha.id}/trayecto">Cancelar</a>
        <button type="submit" class="btn btn-primario"><i data-lucide="map-pin"></i>Registrar llegada</button>
      </div>
    </form>
  `, 'inicio', persona));

  // Si elige un punto que no es el siguiente, se avisa y se pide confirmar
  const revisarSalto = () => {
    const elegido = Number(document.querySelector('input[name="nodo"]:checked').value);
    $('#aviso-salto').innerHTML = elegido === esperado ? '' : `
      ${avisoHTML('ambar', 'triangle-alert', `La secuencia no coincide: el siguiente punto es "${escapar(nodos[esperado].nombre)}". Si continúas, quedará una alerta.`)}
      <label class="opcion"><input type="checkbox" name="salto"><span>Confirmo que el equipo no pasó por "${escapar(nodos[esperado].nombre)}"</span></label>`;
    lucide.createIcons({ root: $('#aviso-salto') });
  };
  document.querySelectorAll('input[name="nodo"]').forEach((r) => r.addEventListener('change', revisarSalto));

  $('#entrada-foto').addEventListener('change', async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    imagen = await leerFoto(archivo);
    $('#vista-foto').src = imagen;
    $('#vista-foto').hidden = false;
    $('#texto-foto').textContent = 'Tomar otra foto';
  });

  $('#form-llegada').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    if (!f.numero.value.trim()) return error(new Error('Escribe el número que ves en el equipo.'));
    if (!imagen) return error(new Error('Toma la foto de inspección.'));
    try {
      const { llegoAlDestino } = registrarLlegada(ficha.id, {
        indiceNodo: Number(f.nodo.value), numero: f.numero.value, imagen,
        saltoConfirmado: Boolean(f.salto?.checked), coordenadas,
      });
      avisarEnLaSiguientePantalla(llegoAlDestino
        ? 'Llegó al destino. El trayecto terminó y la ficha ya se puede cerrar.'
        : 'Llegada registrada.');
      ir(`/ficha/${ficha.id}/trayecto`, { reemplazar: true });
    } catch (e) {
      error(e);
      // La alerta pudo cambiar los datos (número que no coincide): se mantiene la pantalla
    }
  });
}

// ---------- Pantalla ----------

export function pantallaTrayecto(fichaId) {
  const persona = usuarioActual();
  pedirCoordenadas().then((c) => { coordenadas = c; });
  if (!fichaId) return elegirEquipo(persona);

  const ficha = buscarFicha(fichaId);
  if (!puedeEditarFicha(persona, ficha)) {
    return pintar(marcoHTML(`
      <h1>Trayecto</h1>
      ${avisoHTML('rojo', 'lock', 'Este trayecto no se puede modificar: la ficha está cerrada, no es de tu empresa o tu organización está bloqueada.')}
      ${ficha ? `<a class="enlace" href="#/ficha/${ficha.id}/trayecto"><i data-lucide="arrow-left"></i> Volver a la ficha</a>` : ''}
    `, 'inicio', persona));
  }

  if (ficha.trayecto?.estado === 'en_curso') return vistaLlegada(ficha, persona);
  if (ficha.trayecto?.estado === 'completado') {
    pintar(marcoHTML(`
      ${volverHTML(ficha)}
      <h1>Trayecto terminado</h1>
      ${avisoHTML('verde', 'circle-check', `El último trayecto terminó (${fechaHora(ficha.trayecto.nodos.at(-1).llegada)}). Para un viaje nuevo, inicia otro trayecto.`)}
      <button id="btn-nuevo" class="btn btn-primario btn-bloque"><i data-lucide="route"></i>Iniciar un trayecto nuevo</button>
    `, 'inicio', persona));
    $('#btn-nuevo').addEventListener('click', () => vistaIniciar(ficha, persona));
    return;
  }
  vistaIniciar(ficha, persona);
}
