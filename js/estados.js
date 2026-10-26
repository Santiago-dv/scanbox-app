// Cada estado tiene color, ícono y texto. Nunca solo color.
export const ESTADOS = {
  // Fichas de contenedor o caja
  en_uso:      { texto: 'En uso',      color: 'azul',  icono: 'package' },
  en_transito: { texto: 'En tránsito', color: 'ambar', icono: 'truck' },
  entregado:   { texto: 'Entregado',   color: 'verde', icono: 'circle-check' },
  archivado:   { texto: 'Archivado',   color: 'gris',  icono: 'archive' },

  // Etiquetas físicas
  sin_asignar: { texto: 'Sin asignar', color: 'gris',  icono: 'tag' },
  asignada:    { texto: 'Asignada',    color: 'azul',  icono: 'tag' },
  desactivada: { texto: 'Desactivada', color: 'rojo',  icono: 'ban' },

  // Pago de la organización
  al_dia:      { texto: 'Al día',      color: 'verde', icono: 'circle-check' },
  prorroga:    { texto: 'En prórroga', color: 'ambar', icono: 'clock' },
  bloqueado:   { texto: 'Bloqueado',   color: 'rojo',  icono: 'lock' },
};

export function estadoHTML(clave) {
  const estado = ESTADOS[clave];
  if (!estado) return '';
  return `
    <span class="estado estado--${estado.color}">
      <i data-lucide="${estado.icono}"></i>${estado.texto}
    </span>`;
}