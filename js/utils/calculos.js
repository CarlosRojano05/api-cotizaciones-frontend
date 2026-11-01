/**
 * Cálculo de totales de una cotización mientras el usuario la arma.
 *
 * Usa las MISMAS reglas que el backend (así lo que ves es lo que se guarda):
 *   subtotal = suma de (cantidad x precio) de cada línea, cada una redondeada a 2 decimales
 *   base     = subtotal - descuento
 *   impuesto = base x IVA% / 100   (redondeado a 2 decimales)
 *   total    = base + impuesto
 *
 * Es una vista previa: el servidor siempre recalcula y es quien manda.
 */
export function redondear(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Convierte lo que se escribe en un campo ("12,5" o "12.5") a número. Devuelve NaN si no es válido. */
export function aNumero(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.');
  return limpio === '' ? NaN : Number(limpio);
}

export function calcularTotales(lineas, descuento = 0, ivaPorcentaje = 0) {
  const subtotales = lineas.map((l) => {
    const cantidad = Number.isFinite(l.cantidad) ? l.cantidad : 0;
    const precio = Number.isFinite(l.precio) ? l.precio : 0;
    return redondear(cantidad * precio);
  });
  const subtotal = redondear(subtotales.reduce((a, b) => a + b, 0));
  const desc = Number.isFinite(descuento) ? redondear(descuento) : 0;
  const base = redondear(subtotal - desc);
  const iva = Number.isFinite(ivaPorcentaje) ? ivaPorcentaje : 0;
  const impuesto = redondear(base * iva / 100);
  return { subtotales, subtotal, descuento: desc, base, impuesto, total: redondear(base + impuesto) };
}
