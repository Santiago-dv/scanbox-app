// Coordenadas del GPS del celular, para que cada cambio quede con su ubicación.
// Si la persona no da permiso o no hay señal, se sigue sin coordenadas.

let ultimas = null;

export function pedirCoordenadas() {
  return new Promise((resolver) => {
    if (!navigator.geolocation) return resolver(ultimas);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        ultimas = {
          lat: Number(posicion.coords.latitude.toFixed(5)),
          lon: Number(posicion.coords.longitude.toFixed(5)),
          precision: Math.round(posicion.coords.accuracy),
        };
        resolver(ultimas);
      },
      () => resolver(ultimas),   // sin permiso o sin señal: se usa la última conocida (o ninguna)
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

// "10.98781, -74.78892 (±20 m)"
export function textoCoordenadas(coordenadas) {
  if (!coordenadas) return '';
  return `${coordenadas.lat}, ${coordenadas.lon} (±${coordenadas.precision} m)`;
}
