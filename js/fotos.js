// Fotos tomadas con la cámara del celular.
// Se achican antes de guardarlas: una foto de 4 MB queda en unos 100 KB.

export async function leerFoto(archivo, ladoMaximo = 1024, calidad = 0.7) {
  const imagen = await createImageBitmap(archivo);   // respeta la orientación de la foto
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  return lienzo.toDataURL('image/jpeg', calidad);
}
