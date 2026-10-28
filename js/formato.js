// Funciones para mostrar datos en pantalla.

// Evita que un texto escrito por alguien se interprete como HTML
export function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caracter]);
}

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

// "25 de oct de 2026, 3:40 p. m."
export function fechaHora(iso) {
  return iso ? FORMATO_FECHA_HORA.format(new Date(iso)) : '—';
}

const RELATIVO = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' });

// "dentro de 5 horas", "ayer", "hace 3 días"
export function tiempoRelativo(iso) {
  const minutos = Math.round((new Date(iso) - Date.now()) / 60000);
  if (Math.abs(minutos) < 60) return RELATIVO.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return RELATIVO.format(horas, 'hour');
  return RELATIVO.format(Math.round(horas / 24), 'day');
}

// 1080 → "1.080"
export function numero(valor) {
  return Number(valor).toLocaleString('es-CO');
}
