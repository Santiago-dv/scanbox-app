// Datos de demostración de ScanBox.
// Todo es inventado: empresas, personas, placas y códigos de dueño de contenedor.
// Las fechas se calculan desde el momento en que se crean los datos,
// así la demo siempre muestra cosas de "hoy", "hace 2 días", etc.

export function crearDatosDemo() {
  const AHORA = Date.now();
  const HORA = 60 * 60 * 1000;
  const hace = (dias, horas = 0) => new Date(AHORA - (dias * 24 + horas) * HORA).toISOString();
  const dentroDe = (dias, horas = 0) => new Date(AHORA + (dias * 24 + horas) * HORA).toISOString();

  // Atajos para no repetir tanto texto
  const item = (nombre, sku, cantidad, lote) => ({ nombre, sku, cantidad, lote });
  const foto = (id, descripcion, fecha, usuarioId, ubicacion) =>
    ({ id, descripcion, fecha, usuarioId, ubicacion });
  const documento = (id, nombre, fecha, usuarioId) => ({ id, nombre, fecha, usuarioId });

  // Historial de auditoría: se agrega, nunca se edita ni se borra
  const auditoria = [];
  let siguiente = 1;
  const registrar = (fichaId, usuarioId, accion, detalle, fecha, ubicacion, antes = null, despues = null) => {
    auditoria.push({
      id: `a${String(siguiente++).padStart(3, '0')}`,
      fichaId, usuarioId, accion, detalle, antes, despues, ubicacion,
      horaTelefono: fecha,
      horaServidor: fecha,
    });
  };

  // ---------- Configuración general (panel de ScanBox) ----------
  const configuracion = {
    prorrogaDias: 7,      // SUPUESTO: valor de ejemplo, editable
    moraPorcentaje: 5,    // SUPUESTO: valor de ejemplo, editable
    cobroEtiqueta: null,  // 'incluida' | 'venta_aparte' | 'deposito' — sin definir
  };

  const planes = [
    { id: 'mensual', nombre: 'Mensual', precio: null },   // null = "Por definir"
    { id: 'anual',   nombre: 'Anual',   precio: null },
  ];

  // ---------- Organizaciones cliente ----------
  const organizaciones = [
    {
      id: 'org-ceiba',
      nombre: 'Muelle Ceiba Logística',
      tipo: 'Logística en puerto',
      ciudad: 'Barranquilla',
      plan: 'anual',
      estadoPago: 'al_dia',
      proximoPago: dentroDe(142),
      prorrogaHasta: null,
      recargoMora: false,
      fotoNumeroObligatoria: true,   // paso 3 de "Asignar etiqueta"
      fijacionReciclada: 'abrazadera',
    },
    {
      id: 'org-cardon',
      nombre: 'Transportes Cardón',
      tipo: 'Transportadora',
      ciudad: 'Malambo',
      plan: 'mensual',
      estadoPago: 'prorroga',
      proximoPago: hace(3),          // ya venció
      prorrogaHasta: dentroDe(4),    // le quedan 4 días de prórroga
      recargoMora: true,
      fotoNumeroObligatoria: false,
      fijacionReciclada: 'adhesivo',
    },
    {
      id: 'org-cafe',
      nombre: 'Café Sierra Clara',
      tipo: 'PYME con bodega',
      ciudad: 'Santa Marta',
      plan: 'mensual',
      estadoPago: 'bloqueado',
      proximoPago: hace(9),
      prorrogaHasta: hace(2),        // la prórroga se acabó hace 2 días
      recargoMora: true,
      fotoNumeroObligatoria: false,
      fijacionReciclada: 'adhesivo',
    },
  ];

  const pagos = [
    { id: 'p01', orgId: 'org-ceiba',  fecha: hace(223), concepto: 'Plan anual',   metodo: 'PSE',    monto: null, estado: 'aprobado' },
    { id: 'p02', orgId: 'org-cardon', fecha: hace(64),  concepto: 'Plan mensual', metodo: 'Stripe', monto: null, estado: 'aprobado' },
    { id: 'p03', orgId: 'org-cardon', fecha: hace(33),  concepto: 'Plan mensual', metodo: 'Stripe', monto: null, estado: 'aprobado' },
    { id: 'p04', orgId: 'org-cardon', fecha: hace(3),   concepto: 'Plan mensual', metodo: 'Stripe', monto: null, estado: 'rechazado' },
    { id: 'p05', orgId: 'org-cafe',   fecha: hace(39),  concepto: 'Plan mensual', metodo: 'PSE',    monto: null, estado: 'aprobado' },
  ];

  const areas = [
    { id: 'area-patio',   orgId: 'org-ceiba',  nombre: 'Patio de contenedores' },
    { id: 'area-bodega2', orgId: 'org-ceiba',  nombre: 'Bodega 2' },
    { id: 'area-flota',   orgId: 'org-cardon', nombre: 'Flota' },
    { id: 'area-cargue',  orgId: 'org-cardon', nombre: 'Cargue y descargue' },
    { id: 'area-cafe',    orgId: 'org-cafe',   nombre: 'Bodega principal' },
  ];

  // ---------- Usuarios (clave de demostración para todos: demo1234) ----------
  const usuarios = [
    { id: 'u-scanbox',     nombre: 'Laura Méndez',    correo: 'admin@scanbox.demo',     rol: 'admin_scanbox', orgId: null,         areaId: null },
    { id: 'u-ceiba-admin', nombre: 'Carlos Ospina',   correo: 'admin@ceiba.demo',       rol: 'admin_org',     orgId: 'org-ceiba',  areaId: null },
    { id: 'u-ceiba-sup',   nombre: 'Diana Rojas',     correo: 'supervisor@ceiba.demo',  rol: 'supervisor',    orgId: 'org-ceiba',  areaId: 'area-patio' },
    { id: 'u-ceiba-op',    nombre: 'Jhon Pérez',      correo: 'operador@ceiba.demo',    rol: 'operador',      orgId: 'org-ceiba',  areaId: 'area-patio' },
    { id: 'u-ceiba-op2',   nombre: 'Yesenia Barrios', correo: 'operador2@ceiba.demo',   rol: 'operador',      orgId: 'org-ceiba',  areaId: 'area-bodega2' },
    { id: 'u-cardon-admin',nombre: 'Andrés Villa',    correo: 'admin@cardon.demo',      rol: 'admin_org',     orgId: 'org-cardon', areaId: null },
    { id: 'u-cardon-sup',  nombre: 'Paola Gutiérrez', correo: 'supervisor@cardon.demo', rol: 'supervisor',    orgId: 'org-cardon', areaId: 'area-flota' },
    { id: 'u-cardon-op',   nombre: 'Luis Herrera',    correo: 'operador@cardon.demo',   rol: 'operador',      orgId: 'org-cardon', areaId: 'area-flota' },
    { id: 'u-cafe-admin',  nombre: 'Marta Julio',     correo: 'admin@cafe.demo',        rol: 'admin_org',     orgId: 'org-cafe',   areaId: null },
    { id: 'u-cafe-op',     nombre: 'Kevin Charris',   correo: 'operador@cafe.demo',     rol: 'operador',      orgId: 'org-cafe',   areaId: 'area-cafe' },
  ].map((u) => ({ ...u, clave: 'demo1234', activo: true }));

  // ---------- Invitados temporales ----------
  const invitados = [
    { id: 'inv-1', nombre: 'Rafael Contreras', correo: 'conductor@invitado.demo', clave: 'demo1234',
      tipo: 'Conductor', orgId: 'org-ceiba', creadoPor: 'u-ceiba-sup',
      fichas: ['f01'], creado: hace(1), vence: dentroDe(0, 5), revocado: false },   // vence en 5 horas
    { id: 'inv-2', nombre: 'Sandra Torres', correo: 'inspectora@invitado.demo', clave: 'demo1234',
      tipo: 'Inspector de puerto', orgId: 'org-ceiba', creadoPor: 'u-ceiba-sup',
      fichas: ['f01', 'f04'], creado: hace(2), vence: dentroDe(3), revocado: false },
    { id: 'inv-3', nombre: 'Óscar Polo', correo: 'receptor@invitado.demo', clave: 'demo1234',
      tipo: 'Receptor', orgId: 'org-cardon', creadoPor: 'u-cardon-sup',
      fichas: ['f11'], creado: hace(6), vence: hace(1), revocado: false },          // ya venció
  ];

  // ---------- Lotes y etiquetas físicas ----------
  const lotes = [
    { id: 'L-2026-001', orgId: 'org-ceiba',  variante: 'magnetica', fecha: hace(150) },
    { id: 'L-2026-002', orgId: 'org-ceiba',  variante: 'reciclada', fecha: hace(150) },
    { id: 'L-2026-003', orgId: 'org-cardon', variante: 'magnetica', fecha: hace(90) },
    { id: 'L-2026-004', orgId: 'org-cardon', variante: 'reciclada', fecha: hace(90) },
    { id: 'L-2026-005', orgId: 'org-cafe',   variante: 'reciclada', fecha: hace(60) },
  ];

  const etiqueta = (codigo, lote, estado, fichaId = null) => {
    const datosLote = lotes.find((l) => l.id === lote);
    return { codigo, lote, orgId: datosLote.orgId, variante: datosLote.variante, estado, fichaId };
  };

  const etiquetas = [
    etiqueta('KM47TR', 'L-2026-001', 'asignada', 'f01'),
    etiqueta('PB82XN', 'L-2026-001', 'asignada', 'f02'),
    etiqueta('HB63WN', 'L-2026-001', 'asignada', 'f03'),
    etiqueta('TR29VD', 'L-2026-001', 'asignada', 'f04'),
    etiqueta('SV74JC', 'L-2026-001', 'asignada', 'f06'),
    etiqueta('QX58LM', 'L-2026-001', 'desactivada'),          // se dañó; su ficha pasó a HB63WN
    etiqueta('WG35KP', 'L-2026-001', 'sin_asignar'),          // la liberaron de f05
    etiqueta('BK19DV', 'L-2026-001', 'sin_asignar'),
    etiqueta('NE18FA', 'L-2026-002', 'asignada', 'f07'),
    etiqueta('RN72HC', 'L-2026-002', 'sin_asignar'),
    etiqueta('LD56QH', 'L-2026-003', 'asignada', 'f08'),
    etiqueta('ZC91MB', 'L-2026-003', 'asignada', 'f09'),
    etiqueta('YH37SE', 'L-2026-003', 'asignada', 'f11'),
    etiqueta('FT48ZE', 'L-2026-003', 'sin_asignar'),
    etiqueta('UF24RK', 'L-2026-004', 'asignada', 'f10'),
    etiqueta('CG45WD', 'L-2026-005', 'asignada', 'f12'),
    etiqueta('MJ62TB', 'L-2026-005', 'asignada', 'f13'),
    etiqueta('XA83NU', 'L-2026-005', 'asignada', 'f14'),
    etiqueta('JS26PU', 'L-2026-005', 'sin_asignar'),          // la liberaron de f15
    etiqueta('VW53LK', 'L-2026-005', 'sin_asignar'),
  ];

  // ---------- Fichas: contenedores, trailers, cajas... ----------
  const fichas = [
    // ===== Muelle Ceiba Logística =====
    {
      id: 'f01', orgId: 'org-ceiba', areaId: 'area-patio',
      tipo: 'contenedor', numeroEquipo: 'MCLU4821500', etiqueta: 'KM47TR',
      estado: 'en_transito', ubicacion: 'Vía al Mar, en camión TKL482',
      pedido: { cliente: 'Cafés del Norte Exportadores', numero: 'EXP-2026-0412',
                factura: 'FE-88213', direccion: 'Terminal de contenedores, Puerto de Cartagena' },
      contenido: [
        item('Café verde en sacos de 70 kg', 'CAF-VER-70', 275, 'L2610-08'),
        item('Estibas de madera tratada', 'EST-MAD-01', 20, 'EM-0926'),
      ],
      fotos: [
        foto('ft01', 'Número del contenedor', hace(1, 3), 'u-ceiba-op', 'Patio 3, fila B'),
        foto('ft02', 'Carga completa antes de cerrar puertas', hace(0, 10), 'u-ceiba-op', 'Patio 3, fila B'),
        foto('ft03', 'Sello de seguridad puesto', hace(0, 10), 'u-ceiba-op', 'Patio 3, fila B'),
        foto('ft04', 'Inspección al subir al camión', hace(0, 6), 'u-ceiba-sup', 'Almacén Central, Barranquilla'),
      ],
      documentos: [
        documento('d01', 'Lista de empaque', hace(0, 11), 'u-ceiba-sup'),
        documento('d02', 'Factura comercial FE-88213', hace(0, 11), 'u-ceiba-sup'),
        documento('d03', 'Declaración de exportación', hace(0, 11), 'u-ceiba-sup'),
      ],
      trayecto: {
        estado: 'en_curso',
        nodos: [
          { nombre: 'Almacén Central', tipo: 'almacen', estado: 'completado', llegada: hace(0, 9),
            usuarioId: 'u-ceiba-sup', fotoId: 'ft04', numeroConfirmado: true },
          { nombre: 'Camión TKL482', tipo: 'camion', estado: 'actual', llegada: hace(0, 6),
            usuarioId: 'u-ceiba-sup', fotoId: 'ft04', numeroConfirmado: true },
          { nombre: 'Puerto de destino', tipo: 'puerto', estado: 'pendiente' },
        ],
      },
      cargasPrevias: [
        { desde: hace(48), hasta: hace(41), cliente: 'Agroexport Bocas',
          pedido: 'EXP-2026-0287', contenido: [item('Aceite de palma en tambores de 200 L', 'ACP-T200', 80, 'AP-0807')] },
        { desde: hace(25), hasta: hace(19), cliente: 'Cafés del Norte Exportadores',
          pedido: 'EXP-2026-0350', contenido: [item('Café verde en sacos de 70 kg', 'CAF-VER-70', 275, 'L2609-14')] },
      ],
    },
    {
      id: 'f02', orgId: 'org-ceiba', areaId: 'area-patio',
      tipo: 'contenedor', numeroEquipo: 'MCLU4821639', etiqueta: 'PB82XN',
      estado: 'en_uso', ubicacion: 'Patio 3, fila C',
      pedido: { cliente: 'Llantas Costa', numero: 'PED-7781', factura: 'FE-88240',
                direccion: 'Zona Franca de Malambo, bodega 14' },
      contenido: [
        item('Llantas para camión 295/80R22.5', 'LLA-29580', 180, 'LL-2610'),
      ],
      fotos: [
        foto('ft05', 'Número del contenedor', hace(2, 5), 'u-ceiba-op', 'Patio 3, fila C'),
        foto('ft06', 'Carga estibada', hace(2, 4), 'u-ceiba-op', 'Patio 3, fila C'),
      ],
      documentos: [],   // el trayecto está listo pero faltan documentos → genera alerta
      trayecto: {
        estado: 'preparacion',
        nodos: [
          { nombre: 'Patio de contenedores', tipo: 'almacen', estado: 'pendiente' },
          { nombre: 'Camión', tipo: 'camion', estado: 'pendiente' },
          { nombre: 'Bodega destino, Malambo', tipo: 'bodega', estado: 'pendiente' },
        ],
      },
      cargasPrevias: [],
    },
    {
      id: 'f03', orgId: 'org-ceiba', areaId: 'area-patio',
      tipo: 'contenedor', numeroEquipo: 'MCLU5192741', etiqueta: 'HB63WN',
      estado: 'en_uso', ubicacion: 'Patio 1, fila A',
      pedido: { cliente: 'Ferretería Industrial del Atlántico', numero: 'PED-7702', factura: 'FE-88102',
                direccion: 'Calle 30 # 12-45, Soledad' },
      contenido: [
        item('Rollos de alambre galvanizado calibre 12', 'ALA-GAL-12', 96, 'AG-0925'),
        item('Cajas de puntillas de 2 pulgadas', 'PUN-2P', 140, 'PN-1002'),
      ],
      fotos: [
        foto('ft07', 'Número del contenedor', hace(9), 'u-ceiba-op', 'Patio 1, fila A'),
        foto('ft08', 'Etiqueta anterior dañada', hace(5), 'u-ceiba-sup', 'Patio 1, fila A'),
      ],
      documentos: [],
      trayecto: null,
      cargasPrevias: [
        { desde: hace(30), hasta: hace(22), cliente: 'Llantas Costa',
          pedido: 'PED-7590', contenido: [item('Llantas para camión 295/80R22.5', 'LLA-29580', 160, 'LL-2609')] },
      ],
    },
    {
      id: 'f04', orgId: 'org-ceiba', areaId: 'area-patio',
      tipo: 'contenedor', numeroEquipo: 'MCLU6053186', etiqueta: 'TR29VD',
      estado: 'entregado', ubicacion: 'Muelle 4, Puerto de Barranquilla',
      cerrada: hace(0, 2),   // se cerró hoy: queda de solo lectura
      pedido: { cliente: 'Frutas del Caribe Export', numero: 'EXP-2026-0398', factura: 'FE-88190',
                direccion: 'Muelle 4, Puerto de Barranquilla' },
      contenido: [
        item('Banano en cajas de 18 kg', 'BAN-18', 1080, 'BN-4410'),
      ],
      fotos: [
        foto('ft09', 'Número del contenedor', hace(3), 'u-ceiba-op', 'Finca La Esperanza, Ciénaga'),
        foto('ft10', 'Temperatura del contenedor refrigerado', hace(3), 'u-ceiba-op', 'Finca La Esperanza, Ciénaga'),
        foto('ft11', 'Inspección en muelle', hace(0, 3), 'u-ceiba-sup', 'Muelle 4, Puerto de Barranquilla'),
      ],
      documentos: [
        documento('d04', 'Lista de empaque', hace(3), 'u-ceiba-sup'),
        documento('d05', 'Certificado fitosanitario', hace(3), 'u-ceiba-sup'),
      ],
      trayecto: {
        estado: 'completado',
        nodos: [
          { nombre: 'Almacén Central', tipo: 'almacen', estado: 'completado', llegada: hace(2, 20),
            usuarioId: 'u-ceiba-op', fotoId: 'ft10', numeroConfirmado: true },
          { nombre: 'Camión SMR915', tipo: 'camion', estado: 'completado', llegada: hace(2, 18),
            usuarioId: 'u-ceiba-op', fotoId: 'ft10', numeroConfirmado: true },
          { nombre: 'Puerto de destino', tipo: 'puerto', estado: 'completado', llegada: hace(0, 3),
            usuarioId: 'u-ceiba-sup', fotoId: 'ft11', numeroConfirmado: true },
        ],
      },
      cargasPrevias: [],
    },
    {
      id: 'f05', orgId: 'org-ceiba', areaId: 'area-patio',
      tipo: 'contenedor', numeroEquipo: 'MCLU7330428', etiqueta: null,   // etiqueta liberada
      estado: 'archivado', ubicacion: 'Patio 2, fila D',
      cerrada: hace(12),
      pedido: { cliente: 'Agroexport Bocas', numero: 'EXP-2026-0301', factura: 'FE-87950',
                direccion: 'Terminal de contenedores, Puerto de Santa Marta' },
      contenido: [],   // el contenido pasó a "Cargas previas" al liberar la etiqueta
      fotos: [
        foto('ft12', 'Número del contenedor', hace(18), 'u-ceiba-op', 'Patio 2, fila D'),
      ],
      documentos: [],
      trayecto: null,
      cargasPrevias: [
        { desde: hace(18), hasta: hace(12), cliente: 'Agroexport Bocas',
          pedido: 'EXP-2026-0301', contenido: [item('Aceite de palma en tambores de 200 L', 'ACP-T200', 80, 'AP-0912')] },
      ],
    },
    {
      id: 'f06', orgId: 'org-ceiba', areaId: 'area-bodega2',
      tipo: 'stillage', numeroEquipo: 'STL-0042', etiqueta: 'SV74JC',
      estado: 'en_uso', ubicacion: 'Bodega 2, pasillo 4',
      pedido: { cliente: 'Repuestos Diésel del Norte', numero: 'PED-7795', factura: 'FE-88251',
                direccion: 'Carrera 46 # 70-12, Barranquilla' },
      contenido: [
        item('Pastillas de freno para tractomula', 'PFR-TM-01', 64, 'PF-2610'),
        item('Filtros de aire', 'FIL-AIR-22', 30, 'FA-2609'),
      ],
      fotos: [foto('ft13', 'Stillage cargado', hace(1, 2), 'u-ceiba-op2', 'Bodega 2, pasillo 4')],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },
    {
      id: 'f07', orgId: 'org-ceiba', areaId: 'area-bodega2',
      tipo: 'estiba', numeroEquipo: 'EST-1187', etiqueta: 'NE18FA',
      estado: 'en_uso', ubicacion: 'Bodega 2, pasillo 1',
      pedido: { cliente: 'Lubricantes La Cordialidad', numero: 'PED-7799', factura: 'FE-88260',
                direccion: 'Carrera 38 # 30-80, Barranquilla' },
      contenido: [
        item('Aceite de motor 15W-40, galón', 'ACM-1540-G', 118, 'AM-2610'),
      ],
      fotos: [foto('ft14', 'Estiba envuelta en plástico', hace(0, 8), 'u-ceiba-op2', 'Bodega 2, pasillo 1')],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },

    // ===== Transportes Cardón (en prórroga) =====
    {
      id: 'f08', orgId: 'org-cardon', areaId: 'area-flota',
      tipo: 'trailer', numeroEquipo: 'R45218', etiqueta: 'LD56QH',
      estado: 'en_uso', ubicacion: 'Patio Cardón, Malambo',
      pedido: { cliente: 'Construcciones Caribe Firme', numero: 'OC-2210', factura: 'TC-5521',
                direccion: 'Obra Torres del Río, Puerto Colombia' },
      contenido: [
        item('Cemento gris en sacos de 50 kg', 'CEM-GR-50', 600, 'CG-2610'),
      ],
      fotos: [foto('ft15', 'Placa del remolque', hace(0, 7), 'u-cardon-op', 'Patio Cardón, Malambo')],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },
    {
      id: 'f09', orgId: 'org-cardon', areaId: 'area-flota',
      tipo: 'contenedor', numeroEquipo: 'TCDU3107451', etiqueta: 'ZC91MB',
      estado: 'en_transito', ubicacion: 'Ruta del Sol, en camión WPN230',
      pedido: { cliente: 'Hogar Total Electrodomésticos', numero: 'OC-2214', factura: 'TC-5530',
                direccion: 'Centro de distribución, Funza' },
      contenido: [
        item('Neveras de 300 L', 'NEV-300', 48, 'NV-2610'),
        item('Lavadoras de 18 kg', 'LAV-18', 30, 'LV-2610'),
      ],
      fotos: [
        foto('ft16', 'Número del contenedor', hace(1, 6), 'u-cardon-op', 'Patio Cardón, Malambo'),
        foto('ft17', 'Carga asegurada con correas', hace(1, 5), 'u-cardon-op', 'Patio Cardón, Malambo'),
      ],
      documentos: [
        documento('d06', 'Remesa terrestre de carga', hace(1, 5), 'u-cardon-sup'),
        documento('d07', 'Factura TC-5530', hace(1, 5), 'u-cardon-sup'),
      ],
      trayecto: {
        estado: 'en_curso',
        nodos: [
          { nombre: 'Almacén Central', tipo: 'almacen', estado: 'completado', llegada: hace(1, 4),
            usuarioId: 'u-cardon-op', fotoId: 'ft17', numeroConfirmado: true },
          { nombre: 'Camión WPN230', tipo: 'camion', estado: 'actual', llegada: hace(1, 3),
            usuarioId: 'u-cardon-op', fotoId: 'ft17', numeroConfirmado: true },
          { nombre: 'Bodega destino, Funza', tipo: 'bodega', estado: 'pendiente' },
        ],
      },
      cargasPrevias: [],
    },
    {
      id: 'f10', orgId: 'org-cardon', areaId: 'area-cargue',
      tipo: 'estiba', numeroEquipo: 'EST-0315', etiqueta: 'UF24RK',
      estado: 'en_uso', ubicacion: 'Muelle de cargue 2',
      pedido: { cliente: 'Agua Pura Caribe', numero: 'OC-2219', factura: 'TC-5536',
                direccion: 'Calle 17 # 8-20, Malambo' },
      contenido: [item('Botellones de agua de 20 L', 'AGU-20L', 60, 'AP-2610')],
      fotos: [],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },
    {
      id: 'f11', orgId: 'org-cardon', areaId: 'area-flota',
      tipo: 'contenedor', numeroEquipo: 'TCDU4582013', etiqueta: 'YH37SE',
      estado: 'entregado', ubicacion: 'Bodega Plásticos Andinos, Sabanalarga',
      cerrada: hace(3),
      pedido: { cliente: 'Plásticos Andinos', numero: 'OC-2190', factura: 'TC-5490',
                direccion: 'Km 2 vía Sabanalarga' },
      contenido: [item('Tubería PVC de 4 pulgadas', 'PVC-4P', 350, 'PV-2609')],
      fotos: [foto('ft18', 'Entrega en bodega del cliente', hace(3), 'u-cardon-op', 'Km 2 vía Sabanalarga')],
      documentos: [documento('d08', 'Remesa terrestre de carga', hace(5), 'u-cardon-sup')],
      trayecto: null,
      cargasPrevias: [],
    },

    // ===== Café Sierra Clara (bloqueada: solo puede consultar) =====
    {
      id: 'f12', orgId: 'org-cafe', areaId: 'area-cafe',
      tipo: 'caja', numeroEquipo: 'CAJ-0001', etiqueta: 'CG45WD',
      estado: 'en_uso', ubicacion: 'Estante A2',
      pedido: { cliente: 'Tienda Café de la Bahía', numero: 'V-0931', factura: 'SC-1204',
                direccion: 'Carrera 2 # 15-30, Rodadero' },
      contenido: [item('Café tostado en grano, bolsa de 500 g', 'CST-G500', 40, 'T2610-03')],
      fotos: [foto('ft19', 'Caja sellada', hace(4), 'u-cafe-op', 'Bodega principal, estante A2')],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },
    {
      id: 'f13', orgId: 'org-cafe', areaId: 'area-cafe',
      tipo: 'caja', numeroEquipo: 'CAJ-0002', etiqueta: 'MJ62TB',
      estado: 'en_uso', ubicacion: 'Estante A3',
      pedido: { cliente: 'Hotel Brisas de Taganga', numero: 'V-0935', factura: 'SC-1209',
                direccion: 'Calle 3 # 1-14, Taganga' },
      contenido: [
        item('Café molido, bolsa de 250 g', 'CSM-250', 80, 'M2610-01'),
        item('Café molido descafeinado, bolsa de 250 g', 'CSD-250', 12, 'D2609-02'),
      ],
      fotos: [],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },
    {
      id: 'f14', orgId: 'org-cafe', areaId: 'area-cafe',
      tipo: 'guayo', numeroEquipo: 'GUA-0007', etiqueta: 'XA83NU',
      estado: 'en_uso', ubicacion: 'Zona de recibo',
      pedido: { cliente: 'Compra a productores', numero: 'C-0412', factura: '—',
                direccion: 'Bodega principal, Santa Marta' },
      contenido: [item('Café pergamino seco, saco de 40 kg', 'CPS-40', 6, 'P2610-05')],
      fotos: [foto('ft20', 'Peso en báscula', hace(6), 'u-cafe-op', 'Bodega principal, zona de recibo')],
      documentos: [],
      trayecto: null,
      cargasPrevias: [],
    },
    {
      id: 'f15', orgId: 'org-cafe', areaId: 'area-cafe',
      tipo: 'caja', numeroEquipo: 'CAJ-0003', etiqueta: null,
      estado: 'archivado', ubicacion: 'Estante B1',
      cerrada: hace(20),
      pedido: { cliente: 'Tienda Café de la Bahía', numero: 'V-0870', factura: 'SC-1150',
                direccion: 'Carrera 2 # 15-30, Rodadero' },
      contenido: [],
      fotos: [],
      documentos: [],
      trayecto: null,
      cargasPrevias: [
        { desde: hace(28), hasta: hace(20), cliente: 'Tienda Café de la Bahía',
          pedido: 'V-0870', contenido: [item('Café tostado en grano, bolsa de 500 g', 'CST-G500', 36, 'T2609-11')] },
      ],
    },
  ];

  // ---------- Historial de auditoría ----------
  // Asignación inicial de cada ficha
  const asignaciones = [
    ['f01', 'u-ceiba-op',  'KM47TR', hace(1, 3),  'Patio 3, fila B'],
    ['f02', 'u-ceiba-op',  'PB82XN', hace(2, 5),  'Patio 3, fila C'],
    ['f03', 'u-ceiba-op',  'QX58LM', hace(9),     'Patio 1, fila A'],
    ['f04', 'u-ceiba-op',  'TR29VD', hace(3),     'Finca La Esperanza, Ciénaga'],
    ['f05', 'u-ceiba-op',  'WG35KP', hace(18),    'Patio 2, fila D'],
    ['f06', 'u-ceiba-op2', 'SV74JC', hace(1, 2),  'Bodega 2, pasillo 4'],
    ['f07', 'u-ceiba-op2', 'NE18FA', hace(0, 8),  'Bodega 2, pasillo 1'],
    ['f08', 'u-cardon-op', 'LD56QH', hace(0, 7),  'Patio Cardón, Malambo'],
    ['f09', 'u-cardon-op', 'ZC91MB', hace(1, 6),  'Patio Cardón, Malambo'],
    ['f10', 'u-cardon-op', 'UF24RK', hace(2),     'Muelle de cargue 2'],
    ['f11', 'u-cardon-op', 'YH37SE', hace(6),     'Patio Cardón, Malambo'],
    ['f12', 'u-cafe-op',   'CG45WD', hace(4),     'Bodega principal, estante A2'],
    ['f13', 'u-cafe-op',   'MJ62TB', hace(5),     'Bodega principal, estante A3'],
    ['f14', 'u-cafe-op',   'XA83NU', hace(6),     'Bodega principal, zona de recibo'],
    ['f15', 'u-cafe-op',   'JS26PU', hace(28),    'Bodega principal, estante B1'],
  ];
  asignaciones.forEach(([fichaId, usuarioId, codigo, fecha, ubicacion]) =>
    registrar(fichaId, usuarioId, 'asignar', `Asignó la etiqueta ${codigo}`, fecha, ubicacion, null, codigo));

  // Movimientos posteriores
  registrar('f01', 'u-ceiba-op', 'editar_contenido', 'Cambió la cantidad de "Café verde en sacos de 70 kg"',
    hace(0, 12), 'Patio 3, fila B', '260', '275');
  registrar('f01', 'u-ceiba-op', 'agregar_foto', 'Agregó la foto "Carga completa antes de cerrar puertas"',
    hace(0, 10), 'Patio 3, fila B');
  registrar('f01', 'u-ceiba-sup', 'cargar_documento', 'Cargó 3 documentos para el trayecto',
    hace(0, 11), 'Almacén Central, Barranquilla');
  registrar('f01', 'u-ceiba-sup', 'iniciar_trayecto', 'Inició el trayecto Almacén Central → Puerto de destino',
    hace(0, 9), 'Almacén Central, Barranquilla');
  registrar('f01', 'u-ceiba-sup', 'llegada_nodo', 'Registró llegada a "Camión TKL482" con foto de inspección',
    hace(0, 6), 'Almacén Central, Barranquilla');

  registrar('f03', 'u-ceiba-sup', 'desactivar_etiqueta', 'Desactivó la etiqueta QX58LM por daño',
    hace(5), 'Patio 1, fila A', 'Asignada', 'Desactivada');
  registrar('f03', 'u-ceiba-sup', 'transferir_etiqueta', 'Transfirió la ficha a la etiqueta HB63WN',
    hace(5), 'Patio 1, fila A', 'QX58LM', 'HB63WN');

  registrar('f04', 'u-ceiba-sup', 'llegada_nodo', 'Registró llegada a "Puerto de destino" con foto de inspección',
    hace(0, 3), 'Muelle 4, Puerto de Barranquilla');
  registrar('f04', 'u-ceiba-sup', 'cerrar', 'Cerró la ficha como Entregado',
    hace(0, 2), 'Muelle 4, Puerto de Barranquilla', 'En tránsito', 'Entregado');

  registrar('f05', 'u-ceiba-sup', 'cerrar', 'Cerró la ficha como Archivado',
    hace(12), 'Patio 2, fila D', 'En uso', 'Archivado');
  registrar('f05', 'u-ceiba-sup', 'liberar', 'Liberó la etiqueta WG35KP; el contenido pasó a Cargas previas',
    hace(12), 'Patio 2, fila D', 'WG35KP', null);

  registrar('f15', 'u-cafe-admin', 'cerrar', 'Cerró la ficha como Archivado',
    hace(20), 'Bodega principal, estante B1', 'En uso', 'Archivado');
  registrar('f15', 'u-cafe-admin', 'liberar', 'Liberó la etiqueta JS26PU; el contenido pasó a Cargas previas',
    hace(20), 'Bodega principal, estante B1', 'JS26PU', null);

  // Cambio hecho sin conexión: la hora del teléfono y la del servidor no coinciden
  registrar('f07', 'u-ceiba-op2', 'editar_contenido', 'Cambió la cantidad de "Aceite de motor 15W-40, galón"',
    hace(0, 6), 'Bodega 2, pasillo 1', '120', '118');
  auditoria.at(-1).horaServidor = hace(0, 3);   // se sincronizó 3 horas después

  // ---------- Alertas guardadas ----------
  // (las de trayecto sin documentos y prórroga se calculan; esta es un evento)
  const alertas = [
    { id: 'al1', orgId: 'org-ceiba', tipo: 'etiqueta_desactivada', fecha: hace(0, 1),
      texto: 'Se escaneó la etiqueta desactivada QX58LM en Patio 1', etiqueta: 'QX58LM', usuarioId: 'u-ceiba-op' },
  ];

  return {
    configuracion, planes, organizaciones, pagos, areas, usuarios, invitados,
    lotes, etiquetas, fichas, auditoria, alertas,
  };
}