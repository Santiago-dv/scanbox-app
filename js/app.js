// Punto de partida de ScanBox: registra las pantallas y arranca.
import { agregarRuta, iniciarRutas } from './rutas.js';
import { ROLES_OPERATIVOS } from './sesion.js';
import { vigilarConexion } from './conexion.js';
import { pantallaEntrar, pantallaRecuperar } from './pantallas/entrar.js';
import { pantallaMas } from './pantallas/mas.js';
import {
  pantallaInicio, pantallaEscanear, pantallaCajas, pantallaAsignar,
  pantallaFicha, pantallaInvitado, pantallaAdmin,
} from './pantallas/provisionales.js';
import { pantallaCodigo } from './pantallas/codigo.js';

const OPERATIVOS = { roles: ROLES_OPERATIVOS };

// Sin sesión
agregarRuta(/^\/entrar$/, () => pantallaEntrar(), { publica: true });
agregarRuta(/^\/c\/([A-Za-z0-9]{6})$/, pantallaCodigo, { publica: true });
agregarRuta(/^\/recuperar$/, pantallaRecuperar, { publica: true });
agregarRuta(/^\/c\/([A-Za-z0-9]{6})$/, pantallaCodigo, { publica: true });   // decide ella misma

// Con sesión
agregarRuta(/^\/inicio$/, pantallaInicio, OPERATIVOS);
agregarRuta(/^\/escanear$/, pantallaEscanear, OPERATIVOS);
agregarRuta(/^\/cajas$/, pantallaCajas, OPERATIVOS);
agregarRuta(/^\/asignar\/([A-Za-z0-9]{6})$/, pantallaAsignar, OPERATIVOS);
agregarRuta(/^\/ficha\/(\w+)$/, pantallaFicha);
agregarRuta(/^\/invitado$/, pantallaInvitado, { roles: ['invitado'] });
agregarRuta(/^\/admin$/, pantallaAdmin, { roles: ['admin_scanbox'] });
agregarRuta(/^\/mas$/, pantallaMas);

vigilarConexion();
iniciarRutas();