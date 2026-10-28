// Asignar etiqueta: flujo guiado de 6 pasos con barra de progreso (sección 5.4).
// .../#/asignar          → empieza escaneando la etiqueta libre
// .../#/asignar/WG35KP   → la etiqueta ya se escaneó: empieza en el paso 2
import {
  marcoHTML, avisoHTML, pintar, alSalirDePantalla, avisarEnLaSiguientePantalla,
} from '../marco.js';
import { usuarioActual, puedeEditar } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { buscarOrganizacion, buscarArea, buscarFicha } from '../consultas.js';
import { TIPOS_EQUIPO, VARIANTES, FIJACIONES } from '../datos/catalogos.js';
import { revisarNumeroEquipo, calcularDigitoControl, limpiarNumero, formatearNumero } from '../iso6346.js';
import { abrirCamara, extraerCodigo } from '../escaner.js';
import { leerFoto } from '../fotos.js';
import { pedirCoordenadas } from '../ubicacion.js';
import { asignarEtiqueta, fichaActivaDeEquipo } from '../acciones.js';
import { escapar, numero } from '../formato.js';
import { ir } from '../rutas.js';

const PASOS = [
  'Escanear etiqueta', 'Número de equipo', 'Foto del número',
  'Tipo y variante', 'Contenido inicial', 'Confirmar',
];

let borrador = null;       // lo que la persona va llenando
let persona = null;
let apagarCamara = null;

// ---------- Utilidades ----------

const $ = (selector) => document.querySelector(selector);

function mostrarMensaje(html) {
  const lugar = $('#mensaje-paso');
  lugar.innerHTML = html;
  lucide.createIcons({ root: lugar });
}

function pieHTML(principal = '') {
  return `
    <div class="pie-paso">
      ${borrador.paso > 0 ? '<button type="button" id="btn-atras" class="btn btn-secundario"><i data-lucide="arrow-left"></i>Atrás</button>' : ''}
      ${principal}
    </div>`;
}

function irAPaso(paso) {
  apagarCamara?.();
  apagarCamara = null;
  borrador.paso = paso;
  dibujarPaso();
}

// Revisa que el código sea de una etiqueta libre de la empresa
function revisarEtiqueta(codigo) {
  const etiqueta = obtenerDatos().etiquetas.find((e) => e.codigo === codigo);
  if (!etiqueta || etiqueta.orgId !== persona.orgId) {
    return { error: 'Esta etiqueta no pertenece a tu organización.' };
  }
  if (etiqueta.estado === 'asignada') {
    const ficha = buscarFicha(etiqueta.fichaId);
    return { error: `La etiqueta ${codigo} ya está asignada a ${formatearNumero(ficha.numeroEquipo)}.
      <a class="enlace" href="#/ficha/${ficha.id}">Ver su ficha</a>` };
  }
  if (etiqueta.estado === 'desactivada') {
    return { error: `La etiqueta ${codigo} está desactivada. Usa otra etiqueta.` };
  }
  return { etiqueta };
}

function aceptarEtiqueta(etiqueta) {
  borrador.codigo = etiqueta.codigo;
  borrador.variante = etiqueta.variante;
  borrador.varianteLote = etiqueta.variante;
  irAPaso(1);
}

// ---------- Paso 1: escanear la etiqueta libre ----------

function paso1() {
  $('#paso').innerHTML = `
    <div class="visor">
      <video muted playsinline></video>
      <div class="visor-guia" aria-hidden="true"></div>
    </div>
    <div id="mensaje-paso" role="status">
      <p class="texto-suave texto-centro">Abriendo la cámara…</p>
    </div>
    <form id="form-codigo" class="pila" novalidate>
      <label class="campo campo-codigo">
        O escribe el código
        <input name="codigo" maxlength="6" placeholder="AB12CD"
               autocomplete="off" autocapitalize="characters" spellcheck="false">
      </label>
      <button type="submit" class="btn btn-secundario btn-bloque"><i data-lucide="check"></i>Usar este código</button>
    </form>`;

  let ultimoAviso = 0;
  const probar = (texto, desdeCamara) => {
    const codigo = extraerCodigo(texto);
    if (!codigo) {
      if (!desdeCamara || Date.now() - ultimoAviso > 3000) {
        mostrarMensaje(avisoHTML('rojo', 'scan-qr-code', desdeCamara
          ? 'Este QR no es de una etiqueta ScanBox.'
          : 'El código tiene 6 letras y números, como AB12CD.'));
        ultimoAviso = Date.now();
      }
      return;
    }
    const resultado = revisarEtiqueta(codigo);
    if (resultado.error) {
      if (!desdeCamara || Date.now() - ultimoAviso > 3000) {
        mostrarMensaje(avisoHTML('rojo', 'tag', resultado.error));
        ultimoAviso = Date.now();
      }
      return;
    }
    navigator.vibrate?.(80);
    aceptarEtiqueta(resultado.etiqueta);
  };

  abrirCamara($('.visor video'), (texto) => probar(texto, true))
    .then((apagar) => {
      if (!borrador || borrador.paso !== 0) return apagar();   // ya se movió de paso
      apagarCamara = apagar;
      if (!ultimoAviso) mostrarMensaje('<p class="texto-suave texto-centro">Apunta la cámara al QR de la etiqueta libre.</p>');
    })
    .catch(() => {
      mostrarMensaje(avisoHTML('ambar', 'camera-off', 'No pudimos abrir la cámara. Escribe el código de la etiqueta.'));
    });

  $('#form-codigo').addEventListener('submit', (evento) => {
    evento.preventDefault();
    probar(evento.target.codigo.value, false);
  });
}

// ---------- Paso 2: número de equipo ----------

function validacionHTML(texto) {
  if (!texto.trim()) return '';
  const resultado = revisarNumeroEquipo(texto);
  if (resultado === 'valido') {
    return '<span class="estado estado--verde"><i data-lucide="circle-check"></i>Número válido</span>';
  }
  if (resultado === 'revisar') {
    const limpio = limpiarNumero(texto);
    const pista = /^[A-Z]{3}[UJZ]\d{7}$/.test(limpio)
      ? ` El último dígito debería ser ${calcularDigitoControl(limpio.slice(0, 10))}.`
      : ' Un número de contenedor tiene 4 letras y 7 números.';
    return `<span class="estado estado--rojo"><i data-lucide="circle-alert"></i>Revisar número</span>
            <p class="texto-suave">${pista.trim()}</p>`;
  }
  return '<span class="estado estado--gris"><i data-lucide="info"></i>Placa u otro número: no se valida</span>';
}

function paso2() {
  const areas = obtenerDatos().areas.filter((a) => a.orgId === persona.orgId);
  const etiqueta = obtenerDatos().etiquetas.find((e) => e.codigo === borrador.codigo);
  $('#paso').innerHTML = `
    <p>Etiqueta <strong>${borrador.codigo}</strong> · ${VARIANTES[etiqueta.variante].texto}</p>
    <form id="form-numero" class="pila" novalidate>
      <label class="campo">
        Número de equipo (contenedor o placa)
        <input name="numero" value="${escapar(borrador.numero)}" placeholder="MCLU 482150 0"
               autocomplete="off" autocapitalize="characters" spellcheck="false" class="mayusculas">
      </label>
      <div id="validacion" aria-live="polite">${validacionHTML(borrador.numero)}</div>
      ${persona.areaId ? '' : `
        <label class="campo">
          Área
          <select name="area">
            ${areas.map((a) => `<option value="${a.id}" ${a.id === borrador.areaId ? 'selected' : ''}>${escapar(a.nombre)}</option>`).join('')}
          </select>
        </label>`}
      <label class="campo">
        ¿Dónde está ahora?
        <input name="ubicacion" value="${escapar(borrador.ubicacion)}" placeholder="Patio 3, fila B">
      </label>
      <div id="mensaje-paso" role="alert"></div>
      ${pieHTML('<button type="submit" class="btn btn-primario">Siguiente<i data-lucide="arrow-right"></i></button>')}
    </form>`;

  const formulario = $('#form-numero');
  formulario.numero.addEventListener('input', () => {
    $('#validacion').innerHTML = validacionHTML(formulario.numero.value);
    lucide.createIcons({ root: $('#validacion') });
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const texto = formulario.numero.value.trim();
    const ubicacion = formulario.ubicacion.value.trim();
    if (!texto) return mostrarMensaje(avisoHTML('rojo', 'circle-alert', 'Escribe el número del contenedor o la placa.'));
    if (!ubicacion) return mostrarMensaje(avisoHTML('rojo', 'circle-alert', 'Escribe dónde está el equipo.'));

    const activa = fichaActivaDeEquipo(persona.orgId, texto);
    if (activa) {
      return mostrarMensaje(avisoHTML('rojo', 'circle-alert',
        `Este equipo ya tiene una ficha activa con la etiqueta ${activa.etiqueta}.
         <a class="enlace" href="#/ficha/${activa.id}">Ver su ficha</a>`));
    }

    const resultado = revisarNumeroEquipo(texto);
    borrador.numero = limpiarNumero(texto);
    borrador.numeroVerificado = resultado === 'valido';
    borrador.ubicacion = ubicacion;
    if (formulario.area) borrador.areaId = formulario.area.value;
    // Si es un número de contenedor, el tipo más probable es "contenedor"
    if (!borrador.tipo && resultado !== 'no_aplica') borrador.tipo = 'contenedor';
    irAPaso(2);
  });
}

// ---------- Paso 3: foto del número (configurable por empresa) ----------

function paso3() {
  $('#paso').innerHTML = `
    <p>Toma una foto donde se lea el número <strong>${formatearNumero(borrador.numero)}</strong>. Queda como evidencia.</p>
    ${borrador.foto ? `<img class="vista-previa" src="${borrador.foto.imagen}" alt="Foto del número">` : ''}
    <div id="mensaje-paso" role="status"></div>
    <div class="pila">
      <label class="btn btn-primario btn-bloque">
        <i data-lucide="camera"></i>${borrador.foto ? 'Tomar otra foto' : 'Tomar foto del número'}
        <input id="entrada-foto" type="file" accept="image/*" capture="environment" hidden>
      </label>
      ${borrador.fotoObligatoria
        ? '<p class="texto-suave texto-centro">Tu empresa pide esta foto en cada asignación.</p>'
        : `<button type="button" id="btn-omitir" class="btn btn-secundario btn-bloque">
             ${borrador.foto ? 'Seguir con esta foto' : 'Omitir este paso'}
           </button>`}
    </div>
    ${pieHTML(borrador.foto && borrador.fotoObligatoria
      ? '<button type="button" id="btn-seguir" class="btn btn-primario">Siguiente<i data-lucide="arrow-right"></i></button>'
      : '')}`;

  $('#entrada-foto').addEventListener('change', async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    mostrarMensaje('<p class="texto-suave texto-centro">Procesando la foto…</p>');
    try {
      borrador.foto = { imagen: await leerFoto(archivo), fecha: new Date().toISOString() };
      irAPaso(3);   // con la foto lista se pasa solo al siguiente paso
    } catch {
      mostrarMensaje(avisoHTML('rojo', 'image-off', 'No pudimos leer la foto. Intenta de nuevo.'));
    }
  });
  $('#btn-omitir')?.addEventListener('click', () => irAPaso(3));
  $('#btn-seguir')?.addEventListener('click', () => irAPaso(3));
}

// ---------- Paso 4: tipo de equipo y variante de etiqueta ----------

function paso4() {
  const variantes = Object.entries(VARIANTES).map(([id, v]) => `
    <label class="opcion">
      <input type="radio" name="variante" value="${id}" ${id === borrador.variante ? 'checked' : ''}>
      <span><strong>${v.texto}</strong><span class="texto-suave bloque">${v.detalle}</span></span>
    </label>`).join('');

  const tipos = Object.entries(TIPOS_EQUIPO).map(([id, t]) => `
    <button type="button" class="btn btn-secundario accion" data-tipo="${id}" aria-pressed="${id === borrador.tipo}">
      <i data-lucide="${t.icono}"></i>${t.texto}
    </button>`).join('');

  const avisoLote = borrador.variante !== borrador.varianteLote
    ? avisoHTML('ambar', 'circle-alert',
      `Según su lote, esta etiqueta es ${VARIANTES[borrador.varianteLote].texto.toLowerCase()}. Revisa que coincida con la etiqueta física.`)
    : '';
  const fijacion = borrador.variante === 'reciclada'
    ? `<p class="texto-suave"><i data-lucide="info"></i> En tu empresa se fija con: ${FIJACIONES[borrador.fijacion].toLowerCase()}.</p>`
    : '';

  $('#paso').innerHTML = `
    <h2 class="titulo-bloque">Tipo de equipo</h2>
    <div class="acciones">${tipos}</div>
    <h2 class="titulo-bloque separado">Variante de la etiqueta</h2>
    <div class="pila">${variantes}</div>
    ${avisoLote}${fijacion}
    <div id="mensaje-paso" role="alert"></div>
    ${pieHTML('<button type="button" id="btn-seguir" class="btn btn-primario">Siguiente<i data-lucide="arrow-right"></i></button>')}`;

  // Cambiar tipo o variante vuelve a dibujar el paso con la opción marcada
  const redibujar = () => {
    paso4();
    lucide.createIcons({ root: $('#paso') });
    conectarAtras();
  };
  document.querySelectorAll('input[name="variante"]').forEach((opcion) => {
    opcion.addEventListener('change', () => { borrador.variante = opcion.value; redibujar(); });
  });
  document.querySelectorAll('[data-tipo]').forEach((boton) => {
    boton.addEventListener('click', () => { borrador.tipo = boton.dataset.tipo; redibujar(); });
  });
  $('#btn-seguir').addEventListener('click', () => {
    if (!borrador.tipo) return mostrarMensaje(avisoHTML('rojo', 'circle-alert', 'Elige el tipo de equipo.'));
    irAPaso(4);
  });
}

// ---------- Paso 5: contenido inicial ----------

function itemsHTML() {
  if (!borrador.contenido.length) return '<p class="texto-suave">Todavía no hay productos en la lista.</p>';
  return `<ul class="lista-items">${borrador.contenido.map((item, i) => `
    <li class="item">
      <span>
        <strong>${escapar(item.nombre)}</strong>
        <span class="texto-suave bloque">SKU ${escapar(item.sku)} · Lote ${escapar(item.lote)}</span>
      </span>
      <span class="item-cantidad">${numero(item.cantidad)}</span>
      <button type="button" class="btn-quitar" data-quitar="${i}" aria-label="Quitar ${escapar(item.nombre)}">
        <i data-lucide="trash"></i>
      </button>
    </li>`).join('')}</ul>`;
}

function paso5() {
  const p = borrador.pedido;
  $('#paso').innerHTML = `
    <section class="tarjeta">
      <h2 class="titulo-bloque">Productos</h2>
      <div id="lista-items">${itemsHTML()}</div>
    </section>

    <form id="form-item" class="pila separado" novalidate>
      <label class="campo">Producto <input name="nombre" placeholder="Café verde en sacos de 70 kg"></label>
      <div class="dos-columnas">
        <label class="campo">Cantidad <input name="cantidad" type="number" inputmode="numeric" min="1" step="1"></label>
        <label class="campo">Lote <input name="lote" placeholder="L2610-08"></label>
      </div>
      <label class="campo">SKU <input name="sku" placeholder="CAF-VER-70"></label>
      <button type="submit" class="btn btn-secundario btn-bloque"><i data-lucide="plus"></i>Agregar a la lista</button>
    </form>

    <details class="tarjeta separado" ${p.cliente ? 'open' : ''}>
      <summary class="resumen-desplegable">Pedido y cliente (opcional)</summary>
      <div class="pila">
        <label class="campo">Cliente <input id="p-cliente" value="${escapar(p.cliente)}"></label>
        <label class="campo">Pedido <input id="p-numero" value="${escapar(p.numero)}"></label>
        <label class="campo">Factura <input id="p-factura" value="${escapar(p.factura)}"></label>
        <label class="campo">Dirección de entrega <input id="p-direccion" value="${escapar(p.direccion)}"></label>
      </div>
    </details>

    <div id="mensaje-paso" role="alert"></div>
    ${pieHTML('<button type="button" id="btn-seguir" class="btn btn-primario">Siguiente<i data-lucide="arrow-right"></i></button>')}`;

  const formulario = $('#form-item');

  // Lee el formulario; devuelve el producto, un error, o null si está vacío
  const leerItem = () => {
    const nombre = formulario.nombre.value.trim();
    const cantidad = Number(formulario.cantidad.value);
    if (!nombre && !formulario.cantidad.value) return null;
    if (!nombre) return { error: 'Escribe el nombre del producto.' };
    if (!Number.isInteger(cantidad) || cantidad < 1) return { error: 'La cantidad debe ser un número entero mayor que cero.' };
    return {
      item: {
        nombre,
        sku: formulario.sku.value.trim() || '—',
        cantidad,
        lote: formulario.lote.value.trim() || '—',
      },
    };
  };

  const refrescarLista = () => {
    $('#lista-items').innerHTML = itemsHTML();
    lucide.createIcons({ root: $('#lista-items') });
    document.querySelectorAll('[data-quitar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        borrador.contenido.splice(Number(boton.dataset.quitar), 1);
        refrescarLista();
      });
    });
  };
  refrescarLista();

  const guardarPedido = () => {
    borrador.pedido = {
      cliente: $('#p-cliente').value.trim(),
      numero: $('#p-numero').value.trim(),
      factura: $('#p-factura').value.trim(),
      direccion: $('#p-direccion').value.trim(),
    };
  };

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const leido = leerItem();
    if (!leido) return mostrarMensaje(avisoHTML('rojo', 'circle-alert', 'Escribe el producto y la cantidad.'));
    if (leido.error) return mostrarMensaje(avisoHTML('rojo', 'circle-alert', leido.error));
    borrador.contenido.push(leido.item);
    formulario.reset();
    mostrarMensaje('');
    refrescarLista();
    formulario.nombre.focus();
  });

  $('#btn-seguir').addEventListener('click', () => {
    // Si dejó un producto escrito sin agregar, se agrega solo (un toque menos)
    const leido = leerItem();
    if (leido?.error) return mostrarMensaje(avisoHTML('rojo', 'circle-alert', leido.error));
    if (leido?.item) borrador.contenido.push(leido.item);
    if (!borrador.contenido.length) {
      return mostrarMensaje(avisoHTML('rojo', 'circle-alert', 'Agrega al menos un producto.'));
    }
    guardarPedido();
    irAPaso(5);
  });
}

// ---------- Paso 6: confirmar ----------

function paso6() {
  const fila = (etiqueta, valor) => `<div class="dato"><dt>${etiqueta}</dt><dd>${valor}</dd></div>`;
  const area = buscarArea(borrador.areaId);
  const validez = revisarNumeroEquipo(borrador.numero);
  const p = borrador.pedido;

  $('#paso').innerHTML = `
    <section class="tarjeta">
      <dl class="datos">
        ${fila('Etiqueta', `${borrador.codigo} · ${VARIANTES[borrador.variante].texto}`)}
        ${fila('Número de equipo', `${formatearNumero(borrador.numero)}
          ${validez === 'valido' ? '<span class="estado estado--verde"><i data-lucide="circle-check"></i>Número válido</span>' : ''}
          ${validez === 'revisar' ? '<span class="estado estado--rojo"><i data-lucide="circle-alert"></i>Revisar número</span>' : ''}`)}
        ${fila('Tipo', TIPOS_EQUIPO[borrador.tipo].texto)}
        ${fila('Área', escapar(area?.nombre ?? '—'))}
        ${fila('Ubicación', escapar(borrador.ubicacion))}
        ${p.cliente ? fila('Cliente', escapar(p.cliente)) : ''}
      </dl>
    </section>
    ${borrador.foto ? `<img class="vista-previa" src="${borrador.foto.imagen}" alt="Foto del número">` : ''}
    <section class="tarjeta">
      <h2 class="titulo-bloque">Contenido inicial</h2>
      <ul class="lista-items">${borrador.contenido.map((item) => `
        <li class="item">
          <span><strong>${escapar(item.nombre)}</strong>
            <span class="texto-suave bloque">SKU ${escapar(item.sku)} · Lote ${escapar(item.lote)}</span></span>
          <span class="item-cantidad">${numero(item.cantidad)}</span>
        </li>`).join('')}</ul>
    </section>
    <div id="mensaje-paso" role="alert"></div>
    ${pieHTML('<button type="button" id="btn-asignar" class="btn btn-acento"><i data-lucide="tag"></i>Asignar etiqueta</button>')}`;

  $('#btn-asignar').addEventListener('click', () => {
    try {
      const ficha = asignarEtiqueta(borrador);
      avisarEnLaSiguientePantalla(`Etiqueta ${ficha.etiqueta} asignada a ${formatearNumero(ficha.numeroEquipo)}.`);
      borrador = null;
      ir(`/ficha/${ficha.id}`, { reemplazar: true });
    } catch (error) {
      mostrarMensaje(avisoHTML('rojo', 'circle-alert', escapar(error.message)));
    }
  });
}

// ---------- Armado de la pantalla ----------

const DIBUJAR = [paso1, paso2, paso3, paso4, paso5, paso6];

function conectarAtras() {
  $('#btn-atras')?.addEventListener('click', () => irAPaso(borrador.paso - 1));
}

function dibujarPaso() {
  const paso = borrador.paso;
  $('#paso-numero').textContent = `Paso ${paso + 1} de ${PASOS.length}`;
  $('#paso-titulo').textContent = PASOS[paso];
  document.querySelectorAll('.progreso li').forEach((segmento, i) => {
    segmento.classList.toggle('hecho', i <= paso);
  });
  $('.progreso').setAttribute('aria-valuenow', paso + 1);

  DIBUJAR[paso]();
  lucide.createIcons({ root: $('#paso') });
  conectarAtras();
  window.scrollTo(0, 0);
}

export function pantallaAsignar(codigoEnDireccion) {
  persona = usuarioActual();

  if (!puedeEditar(persona)) {
    return pintar(marcoHTML(`
      <h1>Asignar etiqueta</h1>
      ${avisoHTML('rojo', 'lock', 'Tu organización está bloqueada por falta de pago. No se pueden asignar etiquetas hasta regularizar el pago.')}
    `, 'escanear', persona));
  }

  const organizacion = buscarOrganizacion(persona.orgId);
  borrador = {
    paso: 0,
    codigo: null,
    variante: null,
    varianteLote: null,
    numero: '',
    numeroVerificado: false,
    areaId: persona.areaId ?? obtenerDatos().areas.find((a) => a.orgId === persona.orgId)?.id,
    ubicacion: buscarArea(persona.areaId)?.nombre ?? '',
    foto: null,
    tipo: null,
    contenido: [],
    pedido: { cliente: '', numero: '', factura: '', direccion: '' },
    coordenadas: null,
    fotoObligatoria: organizacion.fotoNumeroObligatoria,
    fijacion: organizacion.fijacionReciclada,
  };

  pintar(marcoHTML(`
    <div class="asistente">
      <p class="texto-suave" id="paso-numero"></p>
      <h1 id="paso-titulo"></h1>
      <ol class="progreso" role="progressbar" aria-label="Avance" aria-valuemin="1" aria-valuemax="${PASOS.length}">
        ${PASOS.map(() => '<li></li>').join('')}
      </ol>
      <div id="paso"></div>
    </div>
  `, 'escanear', persona));

  // Al salir: apagar la cámara y descartar el borrador
  alSalirDePantalla(() => {
    apagarCamara?.();
    apagarCamara = null;
    borrador = null;
  });

  // Se pide el GPS desde el principio para tenerlo listo al confirmar
  const borradorActual = borrador;
  pedirCoordenadas().then((coordenadas) => { borradorActual.coordenadas = coordenadas; });

  // Si llegó con el código (desde "Asignar ahora"), el paso 1 ya está hecho
  if (codigoEnDireccion) {
    const resultado = revisarEtiqueta(codigoEnDireccion.toUpperCase());
    if (resultado.etiqueta) return aceptarEtiqueta(resultado.etiqueta);
    dibujarPaso();
    return mostrarMensaje(avisoHTML('rojo', 'tag', resultado.error));
  }
  dibujarPaso();
}
