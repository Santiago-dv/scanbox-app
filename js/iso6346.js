// Número de contenedor según la norma ISO 6346.
// Formato: 3 letras del dueño + categoría (U, J o Z) + 6 números + dígito de control.
// Ejemplo: CSQU3054383 → el último 3 es el dígito de control.

const PARECE_ISO = /^[A-Z]{3}[UJZ]/;          // empieza como contenedor
const FORMATO_ISO = /^[A-Z]{3}[UJZ]\d{7}$/;   // formato completo

// Valor de cada letra: A=10, B=12, C=13... se saltan 11, 22 y 33.
const VALOR_LETRA = {};
let valor = 10;
for (const letra of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  if (valor % 11 === 0) valor++;
  VALOR_LETRA[letra] = valor;
  valor++;
}

// "mclu 123456-7" → "MCLU1234567"
export function limpiarNumero(texto) {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Recibe los primeros 10 caracteres y devuelve el dígito que debería ir de último
export function calcularDigitoControl(primeros10) {
  let suma = 0;
  [...primeros10].forEach((caracter, posicion) => {
    const valorCaracter = /\d/.test(caracter) ? Number(caracter) : VALOR_LETRA[caracter];
    suma += valorCaracter * 2 ** posicion;
  });
  return (suma % 11) % 10;
}

// Devuelve 'valido', 'revisar' o 'no_aplica' (placas y otros números no se validan)
export function revisarNumeroEquipo(texto) {
  const numero = limpiarNumero(texto);
  if (!PARECE_ISO.test(numero)) return 'no_aplica';
  if (!FORMATO_ISO.test(numero)) return 'revisar';
  const esperado = calcularDigitoControl(numero.slice(0, 10));
  return esperado === Number(numero[10]) ? 'valido' : 'revisar';
}

// "MCLU1234567" → "MCLU 123456 7" (más fácil de leer y de comparar con el físico)
export function formatearNumero(texto) {
  const numero = limpiarNumero(texto);
  if (!FORMATO_ISO.test(numero)) return texto;
  return `${numero.slice(0, 4)} ${numero.slice(4, 10)} ${numero[10]}`;
}