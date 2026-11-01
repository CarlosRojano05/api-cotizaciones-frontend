/** Formato de dinero, fechas y estados para mostrar al usuario. */
import { html } from './html.js';
import { obtenerConfiguracion } from '../estado.js';

// ---------------- Dinero ----------------
const SIN_DECIMALES = ['COP', 'CLP', 'PYG', 'JPY'];
const formateadores = new Map();

/** 1234567 -> "$ 1.234.567"   (en COP se ocultan los decimales si el valor es exacto, igual que el PDF) */
export function dinero(valor, moneda) {
  const n = Number(valor ?? 0);
  const codigo = moneda || obtenerConfiguracion()?.moneda || 'COP';
  const decimales = SIN_DECIMALES.includes(codigo) && Number.isInteger(n) ? 0 : 2;
  const clave = `${codigo}-${decimales}`;
  try {
    if (!formateadores.has(clave)) {
      formateadores.set(clave, new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: codigo, minimumFractionDigits: decimales, maximumFractionDigits: decimales,
      }));
    }
    return formateadores.get(clave).format(n);
  } catch {
    return `$ ${n.toFixed(decimales)}`;
  }
}

/** Para los ejes de la gráfica: 1500000 -> "1,5 M", 350000 -> "350 mil" */
export function abreviar(valor) {
  const v = Math.abs(valor);
  if (v >= 1e6) return `${(valor / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (v >= 1e3) return `${Math.round(valor / 1e3).toLocaleString('es-CO')} mil`;
  return String(Math.round(valor));
}

export function numero(valor, maxDecimales = 2) {
  return Number(valor ?? 0).toLocaleString('es-CO', { maximumFractionDigits: maxDecimales });
}

// ---------------- Fechas ----------------
// El backend envía "2026-10-23" (solo fecha) o "2026-10-23T10:00:00" (fecha y hora).
// Las fechas sin hora se separan a mano: así NUNCA se corren un día por zona horaria.
const partes = (iso) => String(iso).slice(0, 10).split('-');
const dos = (n) => String(n).padStart(2, '0');

export function fechaCorta(iso) {
  if (!iso) return '—';
  const [a, m, d] = partes(iso);
  return `${d}/${m}/${a}`;
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const hora = new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${fechaCorta(iso)} ${hora}`;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function sumarDias(iso, dias) {
  const [a, m, d] = partes(iso).map(Number);
  const f = new Date(a, m - 1, d + dias);
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

/** Días entre hoy y una fecha (negativo si ya pasó). */
export function diasHasta(iso) {
  const [a, m, d] = partes(iso).map(Number);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(a, m - 1, d) - hoy) / 86400000);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "2026-10" -> "oct" */
export const nombreMes = (aaaaMm) => MESES[Number(String(aaaaMm).split('-')[1]) - 1] ?? '';

/** Texto amable para el vencimiento: "Vence hoy", "Vence en 3 días", "Venció hace 5 días". */
export function textoVencimiento(iso) {
  const d = diasHasta(iso);
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Vence mañana';
  if (d > 1) return `Vence en ${d} días`;
  if (d === -1) return 'Venció ayer';
  return `Venció hace ${-d} días`;
}

// ---------------- Textos ----------------
/** Para buscar sin importar mayúsculas ni tildes: "Pérez" coincide con "perez". */
export const normalizar = (texto) =>
  String(texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const iniciales = (nombre) =>
  String(nombre ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

// ---------------- Estados ----------------
const CLASES_ESTADO = { Pendiente: 'pendiente', Aceptada: 'aceptada', Rechazada: 'rechazada' };

/** Etiqueta de color. Una cotización Pendiente cuyo plazo pasó se muestra como "Vencida". */
export function insigniaEstado(estado, vencida = false) {
  if (vencida) return html`<span class="insignia insignia-vencida">Vencida</span>`;
  return html`<span class="insignia insignia-${CLASES_ESTADO[estado] ?? 'pendiente'}">${estado}</span>`;
}
