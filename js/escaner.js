// Lector de QR con la cámara. Lo usan "Escanear" y, en la etapa 7, "Asignar etiqueta".
// Usa el lector que trae el navegador (BarcodeDetector, en Android) y, si no existe
// (iPhone, computadores), la librería jsQR guardada en js/vendor.

let promesaJsQR = null;

// jsQR pesa 130 KB: solo se descarga la primera vez que se necesita
function cargarJsQR() {
  promesaJsQR ??= new Promise((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = 'js/vendor/jsQR.min.js';
    script.onload = () => resolver(window.jsQR);
    script.onerror = () => rechazar(new Error('No se pudo cargar el lector de QR'));
    document.head.append(script);
  });
  return promesaJsQR;
}

// Saca el código de 6 caracteres de lo que trae el QR: ".../c/KM47TR" o "KM47TR"
export function extraerCodigo(texto) {
  const limpio = String(texto).trim();
  const enlace = limpio.match(/\/c\/([A-Za-z0-9]{6})\/?$/);
  if (enlace) return enlace[1].toUpperCase();
  if (/^[A-Za-z0-9]{6}$/.test(limpio)) return limpio.toUpperCase();
  return null;
}

// Devuelve una función que mira un cuadro del video y responde el texto del QR (o null)
async function crearLector() {
  if ('BarcodeDetector' in window) {
    const formatos = await BarcodeDetector.getSupportedFormats();
    if (formatos.includes('qr_code')) {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
    }
  }

  const jsQR = await cargarJsQR();
  const lienzo = document.createElement('canvas');
  const contexto = lienzo.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    // Se achica el cuadro a 640 px de ancho: suficiente para leer y mucho más rápido
    const escala = Math.min(1, 640 / video.videoWidth);
    lienzo.width = Math.round(video.videoWidth * escala);
    lienzo.height = Math.round(video.videoHeight * escala);
    contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
    return jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

// Prende la cámara trasera dentro de <video> y llama alLeer(texto) cuando lee un QR.
// Devuelve una función para apagar la cámara. Si algo falla, lanza el error del navegador.
export async function abrirCamara(video, alLeer) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('Este navegador no permite usar la cámara'), { name: 'SinCamara' });
  }

  const flujo = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },   // cámara de atrás
    audio: false,
  });
  video.srcObject = flujo;
  await video.play();

  let activo = true;
  const apagar = () => {
    activo = false;
    flujo.getTracks().forEach((pista) => pista.stop());
    video.srcObject = null;
  };

  try {
    const leer = await crearLector();
    const revisar = async () => {
      if (!activo) return;
      if (video.readyState >= 2) {
        try {
          const texto = await leer(video);
          if (texto && activo) alLeer(texto);
        } catch { /* cuadro borroso o ilegible: se intenta con el siguiente */ }
      }
      if (activo) setTimeout(revisar, 200);   // 5 intentos por segundo
    };
    revisar();
  } catch (error) {
    apagar();
    throw error;
  }

  return apagar;
}
