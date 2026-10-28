// Crea un archivo de Excel (.xlsx) sin librerías.
// Un .xlsx es un ZIP con varios archivos XML adentro; aquí se arma ese ZIP "a mano"
// (sin compresión, que Excel acepta igual).

const codificador = new TextEncoder();

// ---------- CRC-32: suma de verificación que exige el formato ZIP ----------
const TABLA_CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = TABLA_CRC[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ---------- ZIP sin compresión ----------
function crearZip(archivos) {
  const partes = [];
  const central = [];
  let posicion = 0;

  for (const { nombre, contenido } of archivos) {
    const nombreBytes = codificador.encode(nombre);
    const datos = codificador.encode(contenido);
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034B50, true);   // firma de archivo local
    local.setUint16(4, 20, true);           // versión necesaria
    local.setUint16(6, 0x0800, true);       // nombres en UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombreBytes.length, true);
    partes.push(new Uint8Array(local.buffer), nombreBytes, datos);

    const cabecera = new DataView(new ArrayBuffer(46));
    cabecera.setUint32(0, 0x02014B50, true); // firma del directorio central
    cabecera.setUint16(4, 20, true);
    cabecera.setUint16(6, 20, true);
    cabecera.setUint16(8, 0x0800, true);
    cabecera.setUint32(16, crc, true);
    cabecera.setUint32(20, datos.length, true);
    cabecera.setUint32(24, datos.length, true);
    cabecera.setUint16(28, nombreBytes.length, true);
    cabecera.setUint32(42, posicion, true);
    central.push(new Uint8Array(cabecera.buffer), nombreBytes);

    posicion += 30 + nombreBytes.length + datos.length;
  }

  const tamanoCentral = central.reduce((total, parte) => total + parte.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054B50, true);        // fin del directorio central
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, posicion, true);

  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------- Hoja de cálculo ----------
const escaparXML = (texto) => String(texto)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

// Columna número 0 → "A", 26 → "AA"
function letraColumna(indice) {
  let letra = '';
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) letra = String.fromCharCode(65 + ((n - 1) % 26)) + letra;
  return letra;
}

function celda(valor, fila, columna, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  const s = estilo ? ` s="${estilo}"` : '';
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escaparXML(valor ?? '')}</t></is></c>`;
}

// filas: [encabezados, ...datos]. Devuelve un Blob listo para descargar.
export function crearExcel(filas, nombreHoja = 'Hoja1') {
  const anchos = filas[0].map((_, c) =>
    Math.min(60, Math.max(...filas.map((f) => String(f[c] ?? '').length)) + 2));

  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${a}" customWidth="1"/>`).join('')}</cols>
<sheetData>${filas.map((f, i) => `<row r="${i + 1}">${f.map((v, c) => celda(v, i + 1, c, i === 0 ? 1 : 0)).join('')}</row>`).join('')}</sheetData>
</worksheet>`;

  return crearZip([
    { nombre: '[Content_Types].xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>` },
    { nombre: '_rels/.rels', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { nombre: 'xl/workbook.xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escaparXML(nombreHoja).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>` },
    { nombre: 'xl/_rels/workbook.xml.rels', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { nombre: 'xl/styles.xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B3B66"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>` },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: hoja },
  ]);
}

// Hace que el navegador descargue un Blob con ese nombre de archivo
export function descargar(blob, nombreArchivo) {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombreArchivo;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}
