// Registro de organización nueva (sección 5.1): solo con invitación o con plan elegido.
import { marcoPublicoHTML, avisoHTML, pintar, avisarEnLaSiguientePantalla } from '../marco.js';
import { iniciarSesion } from '../sesion.js';
import { obtenerDatos } from '../almacen.js';
import { registrarOrganizacion } from '../acciones.js';
import { escapar } from '../formato.js';
import { ir } from '../rutas.js';

const $ = (selector) => document.querySelector(selector);

export function pantallaRegistro() {
  const planes = obtenerDatos().planes;
  pintar(marcoPublicoHTML(`
    <p class="texto-suave"><a class="enlace" href="#/entrar"><i data-lucide="arrow-left"></i> Iniciar sesión</a></p>
    <h1>Registrar mi empresa</h1>
    <p>Para crear una cuenta necesitas un código de invitación de ScanBox, o elegir un plan y pagarlo.</p>
    <form id="form-registro" class="pila" novalidate>
      <fieldset class="tarjeta pila">
        <legend class="titulo-bloque">1. Plan</legend>
        ${planes.map((p, i) => `
          <label class="opcion">
            <input type="radio" name="plan" value="${p.id}" ${i === 0 ? 'checked' : ''}>
            <span><strong>${p.nombre}</strong><span class="texto-suave bloque">Precio: ${p.precio ?? 'Por definir'}</span></span>
          </label>`).join('')}
      </fieldset>

      <fieldset class="tarjeta pila">
        <legend class="titulo-bloque">2. ¿Cómo empiezas?</legend>
        <label class="opcion">
          <input type="radio" name="inicio" value="invitacion" checked>
          <span><strong>Tengo un código de invitación</strong><span class="texto-suave bloque">La cuenta queda activa y el primer pago vence en 30 días.</span></span>
        </label>
        <label class="campo" id="campo-codigo">Código de invitación
          <input name="codigo" class="mayusculas" placeholder="CARIBE-2026" autocomplete="off" autocapitalize="characters">
        </label>
        <label class="opcion">
          <input type="radio" name="inicio" value="pago">
          <span><strong>Pagar ahora el plan elegido</strong><span class="texto-suave bloque">Pago simulado con PSE o tarjeta.</span></span>
        </label>
      </fieldset>

      <fieldset class="tarjeta pila">
        <legend class="titulo-bloque">3. Empresa</legend>
        <label class="campo">Nombre de la empresa <input name="empresa"></label>
        <label class="campo">Tipo <input name="tipo" placeholder="Logística en puerto, transportadora, PYME…"></label>
        <label class="campo">Ciudad <input name="ciudad"></label>
      </fieldset>

      <fieldset class="tarjeta pila">
        <legend class="titulo-bloque">4. Administrador de la cuenta</legend>
        <label class="campo">Tu nombre <input name="nombre" autocomplete="name"></label>
        <label class="campo">Correo <input name="correo" type="email" inputmode="email" autocomplete="username"></label>
        <label class="campo">Contraseña (mínimo 8 caracteres) <input name="clave" type="password" autocomplete="new-password"></label>
      </fieldset>

      <p class="texto-suave">Demostración: el código <strong>CARIBE-2026</strong> funciona.</p>
      <div id="mensaje" role="alert"></div>
      <button type="submit" class="btn btn-primario btn-bloque"><i data-lucide="building"></i>Crear cuenta</button>
    </form>
  `));

  const formulario = $('#form-registro');
  const mostrarCodigo = () => { $('#campo-codigo').hidden = formulario.inicio.value !== 'invitacion'; };
  formulario.querySelectorAll('input[name="inicio"]').forEach((r) => r.addEventListener('change', mostrarCodigo));

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const f = formulario;
    try {
      if (f.inicio.value === 'invitacion' && !f.codigo.value.trim()) throw new Error('Escribe el código de invitación.');
      const { correo, pagarAhora } = registrarOrganizacion({
        codigo: f.inicio.value === 'invitacion' ? f.codigo.value : '',
        plan: f.plan.value,
        empresa: { nombre: f.empresa.value, tipo: f.tipo.value, ciudad: f.ciudad.value },
        admin: { nombre: f.nombre.value, correo: f.correo.value, clave: f.clave.value },
      });
      iniciarSesion(correo, f.clave.value);
      if (pagarAhora) {
        ir('/pagar', { reemplazar: true });
      } else {
        avisarEnLaSiguientePantalla('Cuenta creada. Ya puedes crear usuarios y áreas desde Más.');
        ir('/inicio', { reemplazar: true });
      }
    } catch (e) {
      $('#mensaje').innerHTML = avisoHTML('rojo', 'circle-alert', escapar(e.message));
      lucide.createIcons({ root: $('#mensaje') });
      $('#mensaje').scrollIntoView({ block: 'nearest' });
    }
  });
}
