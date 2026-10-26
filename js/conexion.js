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

export function vigilarConexion() {
  const pintar = () => {
    const lugar = document.querySelector('#conexion');
    if (!lugar) return;
    lugar.innerHTML = conexionHTML();
    lucide.createIcons({ root: lugar });
  };

  // El navegador avisa cuando se pierde o vuelve la señal
  window.addEventListener('online', pintar);
  window.addEventListener('offline', pintar);
  pintar();
}