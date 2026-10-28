// Modo oscuro opcional (sección 4). La preferencia se guarda solo en este celular.
const CLAVE = 'scanbox-tema';
const COLOR_BARRA = { claro: '#0B3B66', oscuro: '#0A1622' };

export function temaActual() {
  try { return localStorage.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro'; } catch { return 'claro'; }
}

export function aplicarTema(tema = temaActual()) {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
}

export function cambiarTema(tema) {
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento: dura hasta recargar */ }
  aplicarTema(tema);
}
