// Service worker: guarda la app en el celular para que abra y funcione sin conexión.
// Estrategia "primero la red": con señal siempre se usa la versión más nueva;
// sin señal se usa la copia guardada.
// OJO: al agregar un archivo nuevo a la app, súmalo a esta lista y sube la VERSION.
const VERSION = 'scanbox-v1';
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estilos.css',
  'iconos/apple-touch-icon.png',
  'iconos/favicon-32.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
  'iconos/icono-maskable-512.png',
  'js/acciones.js',
  'js/almacen.js',
  'js/app.js',
  'js/conexion.js',
  'js/consultas.js',
  'js/datos/catalogos.js',
  'js/datos/demo.js',
  'js/escaner.js',
  'js/estados.js',
  'js/excel.js',
  'js/formato.js',
  'js/fotos.js',
  'js/iso6346.js',
  'js/marco.js',
  'js/pantallas/admin.js',
  'js/pantallas/asignar.js',
  'js/pantallas/cajas.js',
  'js/pantallas/cierre.js',
  'js/pantallas/codigo.js',
  'js/pantallas/editar.js',
  'js/pantallas/entrar.js',
  'js/pantallas/escanear.js',
  'js/pantallas/etiquetas.js',
  'js/pantallas/ficha.js',
  'js/pantallas/foto.js',
  'js/pantallas/inicio.js',
  'js/pantallas/invitados.js',
  'js/pantallas/mas.js',
  'js/pantallas/registro.js',
  'js/pantallas/suscripcion.js',
  'js/pantallas/trayecto.js',
  'js/pantallas/usuarios.js',
  'js/pdf.js',
  'js/rutas.js',
  'js/sesion.js',
  'js/tema.js',
  'js/ubicacion.js',
  'js/vendor/jsQR.min.js',
  'js/vendor/lucide.min.js',
  'js/vendor/qrcode.min.mjs',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting()),
  );
});

// Borra las copias de versiones anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves
        .filter((clave) => clave.startsWith('scanbox-') && clave !== VERSION)
        .map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // QR: .../scanbox-app/c/AB12CD se abre como la app en #/c/AB12CD (también sin conexión)
  if (request.mode === 'navigate' && url.href.startsWith(self.registration.scope)) {
    const qr = url.pathname.match(/\/c\/([A-Za-z0-9]{6})\/?$/);
    if (qr) {
      evento.respondWith(Response.redirect(new URL(`./#/c/${qr[1].toUpperCase()}`, self.registration.scope).href, 302));
      return;
    }
  }

  const propio = url.origin === self.location.origin;
  const fuente = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!propio && !fuente) return;

  evento.respondWith(
    fetch(request)
      .then((respuesta) => {
        if (respuesta.ok || respuesta.type === 'opaque') {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copia));
        }
        return respuesta;
      })
      .catch(async () => (await caches.match(request, { ignoreSearch: true }))
        ?? (request.mode === 'navigate' ? caches.match('index.html') : Response.error())),
  );
});
