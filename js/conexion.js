// Indicador permanente: "En línea" / "Sin conexión · N cambios pendientes"

// En la etapa 14 este número saldrá de la cola real de cambios guardados.
const cambiosPendientes = 0;

function conexionHTML() {
  if (navigator.onLine) {
    return `
      <span class="conexion conexion--en-linea">
        <i data-lucide="cloud"></i>En línea
      </span>`;
  }

  const texto = cambiosPendientes === 1
    ? '1 cambio pendiente'
    : `${cambiosPendientes} cambios pendientes`;

  return `
    <span class="conexion conexion--sin-conexion">
      <i data-lucide="cloud-off"></i>Sin conexión · ${texto}
    </span>`;
}

// Dibuja el indicador dentro de #conexion (se llama cada vez que cambia la pantalla)
export function pintarConexion() {
  const lugar = document.querySelector('#conexion');
  if (!lugar) return;
  lugar.innerHTML = conexionHTML();
  lucide.createIcons({ root: lugar });
}

// Se llama una sola vez al arrancar la app
export function vigilarConexion() {
  window.addEventListener('online', pintarConexion);
  window.addEventListener('offline', pintarConexion);
}