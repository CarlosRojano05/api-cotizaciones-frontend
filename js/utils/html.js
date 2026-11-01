/**
 * Plantillas SEGURAS.
 *
 *   html`<p>Hola ${nombre}</p>`
 *
 * Todo lo que insertas con ${...} se ESCAPA automáticamente (< > & " ' se vuelven texto inofensivo).
 * Así, si un cliente se llama  <img src=x onerror=alert(1)>  se verá como texto y no se ejecutará.
 * Es la defensa contra "XSS". Regla de oro: los datos del usuario siempre entran por ${...}.
 *
 * Lo que devuelve html`` está marcado como "ya seguro", por eso puedes anidar plantillas:
 *   html`<ul>${lista.map((x) => html`<li>${x}</li>`)}</ul>`
 *
 * Nota para React: esto se parece mucho a JSX (HTML dentro de JS), y React también escapa por defecto.
 */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

class Seguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

/** Marca un texto como confiable (solo para SVG o HTML que escribiste TÚ, nunca datos del usuario). */
export const crudo = (texto) => new Seguro(texto);

function convertir(valor) {
  if (valor instanceof Seguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(convertir).join('');
  if (valor === null || valor === undefined || valor === false) return '';
  return esc(valor);
}

export function html(partes, ...valores) {
  let salida = partes[0];
  valores.forEach((valor, i) => { salida += convertir(valor) + partes[i + 1]; });
  return new Seguro(salida);
}

/** Dibuja una plantilla dentro de un elemento. */
export function montar(elemento, plantilla) {
  elemento.innerHTML = plantilla instanceof Seguro ? plantilla.texto : esc(plantilla);
}
