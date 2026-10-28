// Listas fijas que usa toda la app.

export const ROLES = {
  admin_scanbox: 'Administrador de ScanBox',
  admin_org:     'Administrador de organización',
  supervisor:    'Supervisor de área',
  operador:      'Operador',
  invitado:      'Invitado temporal',
};

export const TIPOS_EQUIPO = {
  contenedor: { texto: 'Contenedor', icono: 'container' },
  trailer:    { texto: 'Trailer',    icono: 'truck' },
  caja:       { texto: 'Caja',       icono: 'box' },
  estiba:     { texto: 'Estiba',     icono: 'layers' },
  stillage:   { texto: 'Stillage',   icono: 'grid-3x3' },
  guayo:      { texto: 'Guayo',      icono: 'package-open' },
};

export const VARIANTES = {
  magnetica: { texto: 'Magnética', detalle: 'HDPE multicapa con imanes, para superficies metálicas' },
  reciclada: { texto: 'Reciclada', detalle: 'Plástico reciclado con QR protegido, para cajas no metálicas' },
};

// SUPUESTO del documento: la etiqueta reciclada se fija de una de estas dos formas
export const FIJACIONES = {
  abrazadera: 'Porta-etiqueta de abrazadera',
  adhesivo:   'Adhesivo reposicionable',
};

export const TIPOS_INVITADO = ['Conductor', 'Receptor', 'Inspector de puerto'];

// El cobro de la etiqueta física no está definido: se elige en el panel de ScanBox
export const COBRO_ETIQUETA = {
  incluida:     'Incluida en la suscripción',
  venta_aparte: 'Venta aparte',
  deposito:     'Depósito',
};

// Ícono de cada tipo de movimiento del historial
export const ICONOS_ACCION = {
  asignar: 'tag',
  editar_contenido: 'pencil',
  agregar_foto: 'camera',
  cargar_documento: 'file-text',
  iniciar_trayecto: 'truck',
  llegada_nodo: 'map-pin',
  cerrar: 'circle-check',
  liberar: 'unlink',
  desactivar_etiqueta: 'ban',
  transferir_etiqueta: 'arrow-right-left',
};
