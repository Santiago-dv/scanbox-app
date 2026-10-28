// Punto de partida de ScanBox: registra las pantallas y arranca.
import { agregarRuta, iniciarRutas } from './rutas.js';
import { ROLES_OPERATIVOS, ROLES_SUPERVISION } from './sesion.js';
import { vigilarConexion, alSincronizar } from './conexion.js';
import { mostrarToast } from './marco.js';
import { aplicarTema } from './tema.js';
import { pantallaEntrar, pantallaRecuperar } from './pantallas/entrar.js';
import { pantallaRegistro } from './pantallas/registro.js';
import { pantallaCodigo } from './pantallas/codigo.js';
import { pantallaInicio } from './pantallas/inicio.js';
import { pantallaEscanear } from './pantallas/escanear.js';
import { pantallaAsignar } from './pantallas/asignar.js';
import { pantallaFicha } from './pantallas/ficha.js';
import { pantallaEditar } from './pantallas/editar.js';
import { pantallaFoto } from './pantallas/foto.js';
import { pantallaTrayecto } from './pantallas/trayecto.js';
import { pantallaCerrar, pantallaLiberar } from './pantallas/cierre.js';
import { pantallaCajas } from './pantallas/cajas.js';
import { pantallaInvitados, pantallaNuevoInvitado, pantallaMisFichas } from './pantallas/invitados.js';
import { pantallaEtiquetas, pantallaEtiqueta } from './pantallas/etiquetas.js';
import { pantallaUsuarios } from './pantallas/usuarios.js';
import { pantallaSuscripcion, pantallaPagar } from './pantallas/suscripcion.js';
import {
  pantallaAdmin, pantallaAdminCliente, pantallaLotes, pantallaNuevoLote, pantallaLote, pantallaConfiguracion,
} from './pantallas/admin.js';
import { pantallaMas } from './pantallas/mas.js';

const OPERATIVOS = { roles: ROLES_OPERATIVOS };
const SUPERVISION = { roles: ROLES_SUPERVISION };
const ADMIN_EMPRESA = { roles: ['admin_org'] };
const SCANBOX = { roles: ['admin_scanbox'] };
const CODIGO = '([A-Za-z0-9]{6})';

// Sin sesión
agregarRuta(/^\/entrar$/, () => pantallaEntrar(), { publica: true });
agregarRuta(/^\/recuperar$/, pantallaRecuperar, { publica: true });
agregarRuta(/^\/registro$/, pantallaRegistro, { publica: true });
agregarRuta(new RegExp(`^/c/${CODIGO}$`), pantallaCodigo, { publica: true });   // decide ella misma

// Trabajo diario
agregarRuta(/^\/inicio$/, pantallaInicio, OPERATIVOS);
agregarRuta(/^\/escanear$/, pantallaEscanear, OPERATIVOS);
agregarRuta(new RegExp(`^/asignar(?:/${CODIGO})?$`), pantallaAsignar, OPERATIVOS);   // código opcional
agregarRuta(/^\/cajas$/, pantallaCajas, OPERATIVOS);
agregarRuta(/^\/ficha\/(\w+)(?:\/(contenido|evidencia|trayecto|historial|cargas))?$/, pantallaFicha);
agregarRuta(/^\/editar\/(\w+)$/, pantallaEditar, OPERATIVOS);
agregarRuta(/^\/foto\/(\w+)$/, pantallaFoto, OPERATIVOS);
agregarRuta(/^\/trayecto(?:\/(\w+))?$/, pantallaTrayecto, OPERATIVOS);            // ficha opcional
agregarRuta(/^\/cerrar\/(\w+)$/, pantallaCerrar, SUPERVISION);
agregarRuta(/^\/liberar\/(\w+)$/, pantallaLiberar, SUPERVISION);

// Administración de la empresa
agregarRuta(/^\/invitados$/, pantallaInvitados, SUPERVISION);
agregarRuta(/^\/invitados\/nuevo$/, pantallaNuevoInvitado, SUPERVISION);
agregarRuta(/^\/etiquetas$/, pantallaEtiquetas, ADMIN_EMPRESA);
agregarRuta(new RegExp(`^/etiquetas/${CODIGO}$`), pantallaEtiqueta, ADMIN_EMPRESA);
agregarRuta(/^\/usuarios$/, pantallaUsuarios, ADMIN_EMPRESA);
agregarRuta(/^\/suscripcion$/, pantallaSuscripcion, ADMIN_EMPRESA);
agregarRuta(/^\/pagar$/, pantallaPagar, ADMIN_EMPRESA);

// Invitado
agregarRuta(/^\/invitado$/, pantallaMisFichas, { roles: ['invitado'] });

// Panel de ScanBox
agregarRuta(/^\/admin$/, pantallaAdmin, SCANBOX);
agregarRuta(/^\/admin\/cliente\/([\w-]+)$/, pantallaAdminCliente, SCANBOX);
agregarRuta(/^\/lotes$/, pantallaLotes, SCANBOX);
agregarRuta(/^\/lotes\/nuevo$/, pantallaNuevoLote, SCANBOX);
agregarRuta(/^\/lotes\/(L-\d{4}-\d{3})$/, pantallaLote, SCANBOX);
agregarRuta(/^\/configuracion$/, pantallaConfiguracion, SCANBOX);

// Para todos con sesión
agregarRuta(/^\/mas$/, pantallaMas);

aplicarTema();
alSincronizar((cantidad) => mostrarToast(cantidad === 1
  ? '1 cambio sincronizado con el servidor.'
  : `${cantidad} cambios sincronizados con el servidor.`));
vigilarConexion();
iniciarRutas();

// App instalable y disponible sin conexión (solo en HTTPS o en localhost)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch((error) => console.warn('No se pudo activar el modo sin conexión', error));
}
