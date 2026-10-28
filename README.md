# ScanBox · prototipo navegable

Prototipo de ScanBox: etiquetas QR físicas que se pegan en contenedores, trailers, guayos y cajas.
Al escanear la etiqueta se abre la ficha digital con el contenido, las fotos, el trayecto y el historial.

**Pruébalo:** https://santiago-dv.github.io/scanbox-app/

Es un prototipo: no hay servidor. Los datos de demostración viven en el navegador (localStorage)
y cada persona que lo abre tiene su propia copia.

## Cómo correrlo en tu computador

No necesita instalar nada ni compilar. Solo hay que servir la carpeta con un servidor local
(abrir `index.html` con doble clic no funciona porque usa módulos de JavaScript):

```bash
# Opción 1: Python
python -m http.server 8000
# luego abre http://localhost:8000

# Opción 2: VS Code con la extensión gratuita "Live Server" → clic derecho en index.html → Open with Live Server
```

La cámara solo funciona en `https://` (GitHub Pages) o en `localhost`.

## Cuentas de demostración

Todas usan la clave **demo1234**.

| Correo | Rol | Para probar |
|---|---|---|
| admin@scanbox.demo | Administrador de ScanBox | Cartera de clientes, prórroga/mora/bloqueo, lotes de etiquetas en PDF, configuración |
| admin@ceiba.demo | Administrador de organización (al día) | Etiquetas, usuarios y áreas, suscripción, invitados |
| supervisor@ceiba.demo | Supervisor (Patio de contenedores) | Cerrar fichas, liberar etiquetas, invitados |
| operador@ceiba.demo | Operador (Patio de contenedores) | Escanear, asignar, editar, fotos, trayecto |
| operador2@ceiba.demo | Operador (Bodega 2) | Ver que cada operador trabaja en su área |
| admin@cardon.demo | Administrador (empresa en prórroga) | Banner de prórroga y pago |
| admin@cafe.demo | Administrador (empresa bloqueada) | Regularizar el pago y desbloquear |
| operador@cafe.demo | Operador (empresa bloqueada) | Solo consulta, sin poder editar |
| conductor@invitado.demo | Invitado | Acceso de solo lectura a las fichas compartidas |

- Código de invitación para registrar una empresa nueva: **CARIBE-2026**.
- Etiquetas libres para probar "Asignar etiqueta" (Muelle Ceiba): **WG35KP**, **BK19DV**, **RN72HC**.
- Enlace directo de una etiqueta: `https://santiago-dv.github.io/scanbox-app/c/KM47TR`.
- En **Más → Herramientas de la demostración** puedes simular que no hay señal y reiniciar los datos.
  Reinícialos si algún vencimiento de prueba (por ejemplo el del invitado) ya pasó.

## Qué incluye

- Inicio de sesión por rol, registro de empresa con invitación o pago, recuperación de clave.
- Escanear con la cámara (o escribir el código), ficha con pestañas Contenido, Evidencia, Trayecto, Historial y Cargas previas.
- Asignar etiqueta en 6 pasos con validación del número ISO 6346, editar contenido, fotos con ubicación.
- Trayecto con checklist de salida, registro de llegada por nodos y alertas por número que no coincide o nodo saltado.
- Cerrar ficha (Entregado o Archivado) y liberar la etiqueta para reutilizarla.
- Listado de cajas con búsqueda, filtros y exportación a Excel.
- Invitados con fecha de vencimiento y revocación; inventario de etiquetas, desactivar y transferir; usuarios y áreas.
- Suscripción con prórroga, mora y bloqueo; pago simulado con PSE o tarjeta.
- Panel de ScanBox: cartera de clientes, acciones de cobro, lotes de etiquetas con PDF listo para imprenta, configuración.
- Trabajo sin conexión: indicador permanente, fichas abiertas antes disponibles, cambios pendientes que se sincronizan al volver la señal.
- Modo oscuro, diseño para celular (barra inferior) y escritorio (tablas), instalable como app.

## Qué está simulado

| Parte | En el prototipo | En el producto real |
|---|---|---|
| Servidor y base de datos | localStorage del navegador | Servidor con base de datos y copias de seguridad |
| Inicio de sesión | Claves guardadas en texto, sin cifrar | Autenticación segura |
| Pagos PSE y Stripe | Botón que aprueba después de 1 segundo; tarjeta de prueba fija | Pasarelas reales |
| Sincronización | "Simular sin conexión" o modo avión; al volver la señal, cada cambio pendiente recibe la hora de ese momento como hora del servidor | Cola de cambios contra el servidor |
| Recuperar clave | Mensaje en pantalla, no se envía correo | Correo con enlace |
| Documentos del trayecto | Solo se guarda el nombre del archivo | Archivo guardado en el servidor |
| Fotos | Se comprimen y se guardan en el navegador | Almacenamiento de archivos |

## Estructura

```
index.html            página única; las pantallas se cambian con #/ruta
404.html              convierte /c/AB12CD en #/c/AB12CD (enlace corto de la etiqueta)
sw.js                 service worker: abre la app sin señal
manifest.webmanifest  datos para instalar la app
iconos/               íconos de la app
css/estilos.css       sistema de diseño (colores, semáforo, botones de 48 px, modo oscuro)
js/app.js             rutas de la app y permisos por rol
js/almacen.js         "base de datos" en localStorage
js/acciones.js        todos los cambios (cada uno queda en el historial)
js/sesion.js          sesión y permisos
js/conexion.js        indicador de conexión y sincronización
js/pantallas/         una pantalla por archivo
js/datos/             datos de demostración y catálogos
js/vendor/            librerías incluidas (Lucide, jsQR, qrcode-generator)
```
