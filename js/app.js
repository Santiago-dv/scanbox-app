// Punto de partida de ScanBox: registra las pantallas y arranca.
import { agregarRuta, iniciarRutas } from './rutas.js';
import { ROLES_OPERATIVOS } from './sesion.js';
import { vigilarConexion } from './conexion.js';
import { pantallaEntrar, pantallaRecuperar } from './pantallas/entrar.js';
import { pantallaCodigo } from './pantallas/codigo.js';
import { pantallaInicio } from './pantallas/inicio.js';
import { pantallaEscanear } from './pantallas/escanear.js';
import { pantallaFicha } from './pantallas/ficha.js';
import { pantallaMas } from './pantallas/mas.js';
import {
  pantallaCajas, pantallaAsignar, pantallaTrayecto,
  pantallaEditar, pantallaFoto, pantallaInvitado, pantallaAdmin,
} from './pantallas/provisionales.js';

const OPERATIVOS = { roles: ROLES_OPERATIVOS };

// Sin sesión
agregarRuta(/^\/entrar$/, () => pantallaEntrar(), { publica: true });
agregarRuta(/^\/recuperar$/, pantallaRecuperar, { publica: true });
agregarRuta(/^\/c\/([A-Za-z0-9]{6})$/, pantallaCodigo, { publica: true });   // decide ella misma

// Con sesión
agregarRuta(/^\/inicio$/, pantallaInicio, OPERATIVOS);
agregarRuta(/^\/escanear$/, pantallaEscanear, OPERATIVOS);
agregarRuta(/^\/cajas$/, pantallaCajas, OPERATIVOS);
agregarRuta(/^\/asignar(?:\/([A-Za-z0-9]{6}))?$/, pantallaAsignar, OPERATIVOS);   // código opcional
agregarRuta(/^\/trayecto(?:\/(\w+))?$/, pantallaTrayecto, OPERATIVOS);           // ficha opcional
agregarRuta(/^\/editar\/(\w+)$/, pantallaEditar, OPERATIVOS);
agregarRuta(/^\/foto\/(\w+)$/, pantallaFoto, OPERATIVOS);
agregarRuta(/^\/ficha\/(\w+)(?:\/(contenido|evidencia|trayecto|historial|cargas))?$/, pantallaFicha);
agregarRuta(/^\/invitado$/, pantallaInvitado, { roles: ['invitado'] });
agregarRuta(/^\/admin$/, pantallaAdmin, { roles: ['admin_scanbox'] });
agregarRuta(/^\/mas$/, pantallaMas);

vigilarConexion();
iniciarRutas();
