/** Piezas de interfaz reutilizables: avisos, ventanas modales, confirmaciones, cargando… */
import { html } from './html.js';
import { icono } from './iconos.js';

// ---------------- Navegación ----------------
/** Cambia de pantalla: navegar('/clientes') */
export function navegar(ruta) {
  const destino = `#${ruta}`;
  if (location.hash === destino) recargar();
  else location.hash = destino;
}

/** Vuelve a dibujar la pantalla actual (útil después de guardar algo). */
export function recargar() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// ---------------- Avisos (toasts) ----------------
export function toast(mensaje, tipo = 'ok') {
  let zona = document.getElementById('toasts');
  if (!zona) {
    zona = document.createElement('div');
    zona.id = 'toasts';
    zona.setAttribute('aria-live', 'polite');
    document.body.append(zona);
  }
  const aviso = document.createElement('div');
  aviso.className = `toast toast-${tipo}`;
  aviso.textContent = mensaje;               // textContent: nunca interpreta HTML
  if (tipo === 'error') aviso.setAttribute('role', 'alert');
  zona.append(aviso);
  setTimeout(() => {
    aviso.classList.add('toast-salida');
    setTimeout(() => aviso.remove(), 300);
  }, tipo === 'error' ? 6000 : 3500);
}

// ---------------- Ventanas modales ----------------
const pila = [];   // ventanas abiertas (la última es la que está arriba)

/**
 * abrirModal({ titulo, contenido: html`...`, alMontar(el, cerrar), alCerrar })
 * Se cierra con la X, haciendo clic afuera, con Escape o con cualquier botón [data-cerrar].
 */
export function abrirModal({ titulo, contenido, ancho = 'normal', alMontar, alCerrar }) {
  const anterior = document.activeElement;
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = html`
    <div class="modal modal-${ancho}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" tabindex="-1">
      <header class="modal-cabecera">
        <h2 id="modal-titulo">${titulo}</h2>
        <button type="button" class="btn-icono" data-cerrar aria-label="Cerrar">${icono('cerrar')}</button>
      </header>
      <div class="modal-cuerpo">${contenido}</div>
    </div>`.texto;
  document.body.append(fondo);
  document.body.classList.add('modal-abierto');
  pila.push(fondo);

  let cerrado = false;
  const teclado = (e) => { if (e.key === 'Escape' && pila[pila.length - 1] === fondo) cerrar(); };
  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    document.removeEventListener('keydown', teclado);
    pila.splice(pila.indexOf(fondo), 1);
    fondo.remove();
    if (!pila.length) document.body.classList.remove('modal-abierto');
    if (anterior && anterior.isConnected) anterior.focus();
    alCerrar?.();
  }

  document.addEventListener('keydown', teclado);
  fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrar(); });
  fondo.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) cerrar(); });

  const primero = fondo.querySelector('.modal-cuerpo input:not([type=hidden]), .modal-cuerpo select, .modal-cuerpo textarea');
  (primero || fondo.querySelector('.modal')).focus();
  alMontar?.(fondo, cerrar);
  return { cerrar, elemento: fondo };
}

/** Pregunta "¿Seguro?" y devuelve una promesa: true si confirmó, false si canceló. */
export function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false }) {
  return new Promise((resolver) => {
    let decidido = false;
    abrirModal({
      titulo,
      ancho: 'chico',
      contenido: html`
        <p class="texto-modal">${mensaje}</p>
        <div class="acciones">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="button" class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" data-confirmar>${textoConfirmar}</button>
        </div>`,
      alMontar(el, cerrar) {
        el.querySelector('[data-confirmar]').addEventListener('click', () => { decidido = true; resolver(true); cerrar(); });
        el.querySelector('[data-confirmar]').focus();
      },
      alCerrar() { if (!decidido) resolver(false); },
    });
  });
}

// ---------------- Botones y formularios ----------------
/** Bloquea el botón mientras se ejecuta una acción: evita que un doble clic guarde dos veces. */
export async function conBoton(boton, accion) {
  if (!boton || boton.disabled) return undefined;
  boton.disabled = true;
  boton.classList.add('cargando');
  try { return await accion(); } finally {
    boton.disabled = false;
    boton.classList.remove('cargando');
  }
}

/** Muestra (o limpia, si no pasas mensaje) el texto de error dentro de un formulario. */
export function errorForm(formulario, mensaje) {
  const zona = formulario.querySelector('.error-form');
  if (!zona) return;
  zona.textContent = mensaje || '';
  zona.hidden = !mensaje;
}

// ---------------- Bloques de estado ----------------
export const bloqueCargando = (texto = 'Cargando…') =>
  html`<div class="bloque-estado" role="status"><span class="spinner"></span><p>${texto}</p></div>`;

export const bloqueError = (mensaje) =>
  html`<div class="bloque-estado bloque-error" role="alert">${icono('alerta', 28)}<p>${mensaje}</p>
    <button type="button" class="btn" data-accion="reintentar">Reintentar</button></div>`;

export const estadoVacio = (titulo, texto, accion = '') =>
  html`<div class="bloque-estado vacio"><h3>${titulo}</h3><p>${texto}</p>${accion}</div>`;

// ---------------- Varios ----------------
export function debounce(funcion, ms = 300) {
  let temporizador;
  return (...args) => { clearTimeout(temporizador); temporizador = setTimeout(() => funcion(...args), ms); };
}

/** Guarda un archivo (blob) en el computador del usuario. */
export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
