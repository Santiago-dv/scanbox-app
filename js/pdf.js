// Crea un PDF sencillo (rectángulos y texto) sin librerías.
// Se usa para imprimir los lotes de etiquetas: los QR se dibujan como cuadritos
// vectoriales, así salen nítidos a cualquier tamaño en la imprenta.

const MM = 72 / 25.4;   // 1 milímetro en puntos de PDF
export const A4 = { ancho: 210, alto: 297 };

// Caracteres fuera de Latin-1 que la fuente estándar sí tiene (codificación WinAnsi)
const WIN_ANSI = { '—': 0x97, '–': 0x96, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '€': 0x80 };

function textoPDF(texto) {
  let resultado = '';
  for (const caracter of String(texto)) {
    let codigo = caracter.charCodeAt(0);
    if (WIN_ANSI[caracter]) codigo = WIN_ANSI[caracter];
    else if (codigo > 0xFF) codigo = 0x3F;   // "?"
    const letra = String.fromCharCode(codigo);
    resultado += letra === '(' || letra === ')' || letra === '\\' ? `\\${letra}` : letra;
  }
  return resultado;
}

const n = (valor) => Number(valor.toFixed(2));

export class DocumentoPDF {
  constructor() {
    this.paginas = [];
    this.nuevaPagina();
  }

  nuevaPagina() {
    this.actual = [];
    this.paginas.push(this.actual);
  }

  // Coordenadas en milímetros desde la esquina superior izquierda (como en papel)
  rectangulo(x, y, ancho, alto, { relleno = null, borde = null, grosor = 0.2 } = {}) {
    const yPdf = (A4.alto - y - alto) * MM;
    const color = (hex) => [1, 3, 5].map((i) => n(parseInt(hex.slice(i, i + 2), 16) / 255)).join(' ');
    const ops = ['q'];
    if (relleno) ops.push(`${color(relleno)} rg`);
    if (borde) ops.push(`${color(borde)} RG ${n(grosor * MM)} w`);
    ops.push(`${n(x * MM)} ${n(yPdf)} ${n(ancho * MM)} ${n(alto * MM)} re`, relleno && borde ? 'B' : relleno ? 'f' : 'S', 'Q');
    this.actual.push(ops.join(' '));
  }

  texto(x, y, contenido, { tamano = 10, negrita = false, color = '#000000', centrado = false, anchoCaja = 0 } = {}) {
    // Ancho aproximado de Helvetica para centrar (0,55 del tamaño por letra)
    const anchoTexto = String(contenido).length * tamano * 0.55 / MM;
    const xFinal = centrado ? x + (anchoCaja - anchoTexto) / 2 : x;
    const yPdf = (A4.alto - y) * MM;
    const rgb = [1, 3, 5].map((i) => n(parseInt(color.slice(i, i + 2), 16) / 255)).join(' ');
    this.actual.push(`BT ${rgb} rg /${negrita ? 'F2' : 'F1'} ${tamano} Tf ${n(xFinal * MM)} ${n(yPdf)} Td (${textoPDF(contenido)}) Tj ET`);
  }

  // Dibuja un QR (de la librería qrcode-generator) en un cuadrado de "lado" milímetros
  qr(codigoQR, x, y, lado) {
    const modulos = codigoQR.getModuleCount();
    const tam = lado / modulos;
    const ops = ['q 0 0 0 rg'];
    for (let fila = 0; fila < modulos; fila++) {
      // Une los cuadritos negros seguidos de una fila en un solo rectángulo
      for (let col = 0; col < modulos; col++) {
        if (!codigoQR.isDark(fila, col)) continue;
        let fin = col;
        while (fin + 1 < modulos && codigoQR.isDark(fila, fin + 1)) fin++;
        const yPdf = (A4.alto - (y + (fila + 1) * tam)) * MM;
        ops.push(`${n((x + col * tam) * MM)} ${n(yPdf)} ${n((fin - col + 1) * tam * MM)} ${n(tam * MM + 0.05)} re`);
        col = fin;
      }
    }
    ops.push('f Q');
    this.actual.push(ops.join('\n'));
  }

  // Arma el archivo PDF y lo devuelve como Blob
  generar() {
    const objetos = [];
    const agregar = (contenido) => { objetos.push(contenido); return objetos.length; };

    const catalogo = agregar(null);   // se completa al final
    const paginasId = agregar(null);
    const fuente = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fuenteNegrita = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const hijos = this.paginas.map((ops) => {
      const flujo = ops.join('\n');
      const contenido = agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
      return agregar(`<< /Type /Page /Parent ${paginasId} 0 R /MediaBox [0 0 ${n(A4.ancho * MM)} ${n(A4.alto * MM)}] `
        + `/Resources << /Font << /F1 ${fuente} 0 R /F2 ${fuenteNegrita} 0 R >> >> /Contents ${contenido} 0 R >>`);
    });

    objetos[catalogo - 1] = `<< /Type /Catalog /Pages ${paginasId} 0 R >>`;
    objetos[paginasId - 1] = `<< /Type /Pages /Kids [${hijos.map((id) => `${id} 0 R`).join(' ')}] /Count ${hijos.length} >>`;

    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const posiciones = objetos.map((contenido, i) => {
      const posicion = pdf.length;
      pdf += `${i + 1} 0 obj\n${contenido}\nendobj\n`;
      return posicion;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    pdf += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogo} 0 R >>\nstartxref\n${xref}\n%%EOF`;

    // Cada carácter es un byte (Latin-1): así las posiciones del índice "xref" son exactas
    const bytes = Uint8Array.from(pdf, (caracter) => caracter.charCodeAt(0) & 0xFF);
    return new Blob([bytes], { type: 'application/pdf' });
  }
}
