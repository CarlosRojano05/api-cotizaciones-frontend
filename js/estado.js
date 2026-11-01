/**
 * Estado global de la aplicación: quién inició sesión y la configuración de su empresa.
 *
 * La sesión se guarda en localStorage para que siga abierta al recargar la página.
 * Límite a conocer: cualquier script que corra en la página podría leer localStorage.
 * Por eso TODO el contenido que viene de usuarios se escapa (ver utils/html.js).
 */
const CLAVE = 'cotizaciones.sesion';
const COLOR_DEFECTO = '#1F4E79';

let sesion = cargar();
let configuracion = null;
let logoURL = null;

function cargar() {
  try { return JSON.parse(localStorage.getItem(CLAVE)); } catch { return null; }
}

// ---------------- Sesión ----------------
export const haySesion = () => Boolean(sesion && sesion.token);
export const obtenerSesion = () => sesion;
export const esAdmin = () => sesion?.usuario?.rol === 'admin';

export function guardarSesion({ token, usuario, empresa }) {
  sesion = { token, usuario, empresa };
  try { localStorage.setItem(CLAVE, JSON.stringify(sesion)); } catch { /* modo privado: la sesión dura hasta cerrar la pestaña */ }
}

export function cerrarSesion() {
  sesion = null;
  configuracion = null;
  guardarLogoURL(null);
  try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
  aplicarColor(COLOR_DEFECTO);
}

// ---------------- Configuración de la empresa ----------------
export const obtenerConfiguracion = () => configuracion;

export function guardarConfiguracion(config) {
  configuracion = config;
  aplicarColor(config?.color_primario);
}

// ---------------- Logo (se guarda como una URL temporal del navegador) ----------------
export const obtenerLogoURL = () => logoURL;

export function guardarLogoURL(url) {
  if (logoURL) URL.revokeObjectURL(logoURL);   // liberar la memoria del logo anterior
  logoURL = url;
}

// ---------------- Color de marca ----------------
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pinta toda la aplicación con el color de la empresa.
 * Si el color es muy claro (ej. amarillo), el texto sobre él pasa a negro y los textos de color
 * se oscurecen: así siempre se puede leer, sea cual sea el color que elija el cliente.
 */
export function aplicarColor(hex) {
  const color = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : COLOR_DEFECTO;
  const L = luminancia(color);
  const raiz = document.documentElement.style;
  raiz.setProperty('--color-primario', color);
  raiz.setProperty('--color-sobre-primario', L > 0.5 ? '#111111' : '#ffffff');
  raiz.setProperty('--color-primario-texto', L > 0.35 ? `color-mix(in srgb, ${color} 50%, black)` : color);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}
