// Editar contenido: agregar, retirar y cambiar cantidades (sección 5.5).
// Nada se guarda hasta tocar "Guardar cambios"; cada cambio queda en el historial.
import { marcoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla } from '../marco.js';
import { usuarioActual, puedeEditarFicha } from '../sesion.js';
import { buscarFicha } from '../consultas.js';
import { editarContenido } from '../acciones.js';
import { pedirCoordenadas } from '../ubicacion.js';
import { formatearNumero } from '../iso6346.js';
import { escapar, numero } from '../formato.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);

export function pantallaEditar(fichaId) {
  const persona = usuarioActual();
  const ficha = buscarFicha(fichaId);

  if (!puedeEditarFicha(persona, ficha)) {
    return pintar(marcoHTML(`
      <h1>Editar contenido</h1>
      ${avisoHTML('rojo', 'lock', 'Esta ficha no se puede modificar: está cerrada, no es de tu empresa o tu organización está bloqueada.')}
      ${ficha ? `<a class="enlace" href="#/ficha/${ficha.id}"><i data-lucide="arrow-left"></i> Volver a la ficha</a>` : ''}
    `, 'cajas', persona));
  }

  // Copia de trabajo: "origen" recuerda la posición original para saber qué cambió
  const productos = ficha.contenido.map((item, i) => ({
    ...item, origen: i, cantidadOriginal: item.cantidad, retirado: false,
  }));
  let coordenadas = null;
  pedirCoordenadas().then((c) => { coordenadas = c; });

  pintar(marcoHTML(`
    <p class="texto-suave"><a class="enlace" href="#/ficha/${ficha.id}"><i data-lucide="arrow-left"></i> ${formatearNumero(ficha.numeroEquipo)}</a></p>
    <h1>Editar contenido</h1>
    <ul id="lista-edicion" class="lista-edicion"></ul>

    <form id="form-item" class="tarjeta pila separado" novalidate>
      <h2 class="titulo-bloque">Agregar producto</h2>
      <label class="campo">Producto <input name="nombre"></label>
      <div class="dos-columnas">
        <label class="campo">Cantidad <input name="cantidad" type="number" inputmode="numeric" min="1" step="1"></label>
        <label class="campo">Lote <input name="lote"></label>
      </div>
      <label class="campo">SKU <input name="sku"></label>
      <button type="submit" class="btn btn-secundario btn-bloque"><i data-lucide="plus"></i>Agregar a la lista</button>
    </form>

    <div id="mensaje" role="alert"></div>
    <div class="pie-paso">
      <a class="btn btn-secundario" href="#/ficha/${ficha.id}">Cancelar</a>
      <button type="button" id="btn-guardar" class="btn btn-primario"><i data-lucide="save"></i><span id="texto-guardar">Guardar cambios</span></button>
    </div>
  `, 'cajas', persona));

  const mensaje = (html) => { $('#mensaje').innerHTML = html; lucide.createIcons({ root: $('#mensaje') }); };

  const contarCambios = () => productos.filter((p) =>
    (p.origen === null && !p.retirado)
    || (p.origen !== null && (p.retirado || p.cantidad !== p.cantidadOriginal))).length;

  function filaHTML(p, i) {
    if (p.retirado) {
      return `
        <li class="fila-edicion retirado">
          <span><strong>${escapar(p.nombre)}</strong><span class="texto-suave bloque">Se retirará al guardar</span></span>
          <button type="button" class="btn btn-secundario" data-deshacer="${i}"><i data-lucide="undo-2"></i>Deshacer</button>
        </li>`;
    }
    const cambio = p.origen === null
      ? '<span class="estado estado--azul">Nuevo</span>'
      : p.cantidad !== p.cantidadOriginal
        ? `<span class="texto-suave">Antes: ${numero(p.cantidadOriginal)}</span>`
        : '';
    return `
      <li class="fila-edicion">
        <div class="fila-edicion-titulo">
          <span>
            <strong>${escapar(p.nombre)}</strong>
            <span class="texto-suave bloque">SKU ${escapar(p.sku)} · Lote ${escapar(p.lote)}</span>
            ${cambio}
          </span>
          <button type="button" class="btn-quitar" data-retirar="${i}" aria-label="Retirar ${escapar(p.nombre)}">
            <i data-lucide="trash"></i>
          </button>
        </div>
        <div class="contador">
          <button type="button" data-menos="${i}" aria-label="Quitar uno"><i data-lucide="minus"></i></button>
          <input type="number" inputmode="numeric" min="1" step="1" value="${p.cantidad}" data-cantidad="${i}" aria-label="Cantidad de ${escapar(p.nombre)}">
          <button type="button" data-mas="${i}" aria-label="Agregar uno"><i data-lucide="plus"></i></button>
        </div>
      </li>`;
  }

  function dibujarLista() {
    $('#lista-edicion').innerHTML = productos.length
      ? productos.map(filaHTML).join('')
      : '<li class="texto-suave">No hay productos. Agrega uno abajo.</li>';
    lucide.createIcons({ root: $('#lista-edicion') });

    const total = contarCambios();
    $('#texto-guardar').textContent = total === 1 ? 'Guardar 1 cambio' : total ? `Guardar ${total} cambios` : 'Sin cambios';
    $('#btn-guardar').disabled = total === 0;

    const cambiar = (i, cantidad) => {
      productos[i].cantidad = Math.max(1, cantidad);
      dibujarLista();
    };
    document.querySelectorAll('[data-menos]').forEach((b) => b.addEventListener('click', () => cambiar(+b.dataset.menos, productos[+b.dataset.menos].cantidad - 1)));
    document.querySelectorAll('[data-mas]').forEach((b) => b.addEventListener('click', () => cambiar(+b.dataset.mas, productos[+b.dataset.mas].cantidad + 1)));
    document.querySelectorAll('[data-cantidad]').forEach((entrada) => entrada.addEventListener('change', () => {
      const valor = Number(entrada.value);
      if (!Number.isInteger(valor) || valor < 1) {
        mensaje(avisoHTML('rojo', 'circle-alert', 'La cantidad debe ser un número entero mayor que cero. Para quitar el producto, usa el botón rojo.'));
        return dibujarLista();
      }
      mensaje('');
      cambiar(+entrada.dataset.cantidad, valor);
    }));
    document.querySelectorAll('[data-retirar]').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.retirar;
      if (productos[i].origen === null) productos.splice(i, 1);   // uno nuevo simplemente desaparece
      else productos[i].retirado = true;
      dibujarLista();
    }));
    document.querySelectorAll('[data-deshacer]').forEach((b) => b.addEventListener('click', () => {
      productos[+b.dataset.deshacer].retirado = false;
      dibujarLista();
    }));
  }
  dibujarLista();

  $('#form-item').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = evento.target;
    const nombre = f.nombre.value.trim();
    const cantidad = Number(f.cantidad.value);
    if (!nombre) return mensaje(avisoHTML('rojo', 'circle-alert', 'Escribe el nombre del producto.'));
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return mensaje(avisoHTML('rojo', 'circle-alert', 'La cantidad debe ser un número entero mayor que cero.'));
    }
    productos.push({
      nombre, cantidad, sku: f.sku.value.trim() || '—', lote: f.lote.value.trim() || '—',
      origen: null, cantidadOriginal: null, retirado: false,
    });
    f.reset();
    mensaje('');
    dibujarLista();
  });

  $('#btn-guardar').addEventListener('click', () => {
    try {
      const total = editarContenido(ficha.id, productos, { coordenadas });
      avisarEnLaSiguientePantalla(total === 1 ? 'Se guardó 1 cambio en el contenido.' : `Se guardaron ${total} cambios en el contenido.`);
      ir(`/ficha/${ficha.id}`, { reemplazar: true });
    } catch (error) {
      mensaje(avisoHTML('rojo', 'circle-alert', escapar(error.message)));
    }
  });
}
