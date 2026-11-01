/** Configuración del negocio: datos para el PDF, color de marca, logo y preferencias comerciales. */
import { api, ErrorApi } from '../api.js';
import { aplicarColor, esAdmin, guardarConfiguracion, guardarLogoURL, obtenerConfiguracion, obtenerLogoURL } from '../estado.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { aNumero } from '../utils/calculos.js';
import { conBoton, confirmar, errorForm, toast } from '../utils/ui.js';

export const titulo = 'Configuración';

const COLORES = ['#1F4E79', '#0F766E', '#1B7F5C', '#7B2D8E', '#B42318', '#C2570C', '#374151', '#0E7490'];
const MAX_LOGO = 2 * 1024 * 1024;

export default async function render({ contenedor }) {
  const admin = esAdmin();
  const c = await api.empresa.configuracion();
  const bloqueado = admin ? '' : 'disabled';

  montar(contenedor, html`
    <div class="cabecera-pagina"><div><h1>Configuración</h1>
      <p class="subtitulo">Estos datos y preferencias aparecen en tus cotizaciones y definen cómo se calculan.</p></div></div>
    ${admin ? '' : html`<div class="aviso aviso-info">Solo el administrador puede modificar la configuración.</div>`}

    <form id="form-config" novalidate>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Datos del negocio</h2>
        <div class="rejilla">
          <div class="campo campo-completo"><label for="cf-nombre">Nombre del negocio *</label>
            <input class="entrada" id="cf-nombre" name="nombre" maxlength="150" value="${c.nombre}" ${bloqueado}></div>
          <div class="campo"><label for="cf-nit">NIT</label><input class="entrada" id="cf-nit" name="nit" maxlength="30" value="${c.nit}" ${bloqueado}></div>
          <div class="campo"><label for="cf-tel">Teléfono</label><input class="entrada" id="cf-tel" name="telefono" maxlength="30" value="${c.telefono}" ${bloqueado}></div>
          <div class="campo"><label for="cf-email">Correo</label><input class="entrada" id="cf-email" name="email" type="email" maxlength="100" value="${c.email}" ${bloqueado}></div>
          <div class="campo"><label for="cf-web">Sitio web</label><input class="entrada" id="cf-web" name="sitio_web" maxlength="100" value="${c.sitio_web}" ${bloqueado}></div>
          <div class="campo campo-completo"><label for="cf-dir">Dirección</label><input class="entrada" id="cf-dir" name="direccion" maxlength="255" value="${c.direccion}" ${bloqueado}></div>
        </div>
      </section>

      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Marca</h2>
        <div class="rejilla" style="align-items:start">
          <div class="campo"><label for="cf-color">Color principal</label>
            <input class="entrada" id="cf-color" name="color_primario" type="color" value="${(c.color_primario || '#1F4E79').toLowerCase()}" ${bloqueado}>
            ${admin ? html`<div class="selector-color" aria-label="Colores sugeridos">${COLORES.map((col) => html`<button type="button" class="muestra-color" data-color="${col}" style="background:${col}" title="${col}" aria-label="Usar el color ${col}"></button>`)}</div>` : ''}
            <span class="ayuda">Se usa en el PDF y en toda esta aplicación.</span></div>
          <div class="campo"><label>Logo</label>
            <div class="fila-logo">
              <div class="vista-logo" id="vista-logo"></div>
              ${admin ? html`<div style="display:flex;flex-direction:column;gap:.5rem;align-items:flex-start">
                <label class="btn btn-sm" for="archivo-logo" style="cursor:pointer">${icono('imagen', 16)} Elegir imagen…</label>
                <input type="file" id="archivo-logo" accept="image/png,image/jpeg,image/webp" class="solo-lector">
                <button type="button" class="btn btn-sm" id="quitar-logo">${icono('basura', 16)} Quitar logo</button>
                <span class="ayuda">PNG, JPG o WEBP · máx. 2 MB</span></div>` : ''}
            </div>
          </div>
        </div>
      </section>

      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Preferencias comerciales</h2>
        <div class="rejilla">
          <div class="campo"><label for="cf-iva">IVA por defecto (%)</label>
            <input class="entrada" id="cf-iva" name="iva_defecto" type="number" min="0" max="100" step="any" value="${c.iva_defecto}" ${bloqueado}>
            <span class="ayuda">Cada cotización puede cambiarlo (0 = exenta).</span></div>
          <div class="campo"><label for="cf-dias">Validez de las cotizaciones (días)</label>
            <input class="entrada" id="cf-dias" name="validez_dias" type="number" min="1" max="365" step="1" value="${c.validez_dias}" ${bloqueado}></div>
          <div class="campo"><label for="cf-pref">Prefijo de numeración</label>
            <input class="entrada" id="cf-pref" name="prefijo" maxlength="10" value="${c.prefijo}" style="text-transform:uppercase" ${bloqueado}>
            <span class="ayuda">Ej.: FER → FER-0001. Si lo cambias, las cotizaciones anteriores también muestran el nuevo prefijo.</span></div>
          <div class="campo"><label for="cf-mon">Moneda</label>
            <input class="entrada" id="cf-mon" name="moneda" maxlength="3" value="${c.moneda}" style="text-transform:uppercase" ${bloqueado}>
            <span class="ayuda">Código de 3 letras: COP, USD, MXN…</span></div>
          <div class="campo campo-completo"><label for="cf-cond">Términos y condiciones</label>
            <textarea class="entrada" id="cf-cond" name="condiciones" rows="5" maxlength="2000" ${bloqueado}>${c.condiciones}</textarea>
            <span class="ayuda">Se imprimen al final de cada PDF.</span></div>
        </div>
      </section>

      <p class="error-form" role="alert" hidden style="margin-top:1rem"></p>
      ${admin ? html`<div class="acciones" style="margin-top:1rem"><button type="submit" class="btn btn-primario">Guardar configuración</button></div>` : ''}
    </form>`);

  const form = contenedor.querySelector('#form-config');
  const vistaLogo = contenedor.querySelector('#vista-logo');

  function pintarLogo() {
    const url = obtenerLogoURL();
    montar(vistaLogo, url ? html`<img src="${url}" alt="Logo actual">` : html`<span>Sin logo</span>`);
    const quitar = contenedor.querySelector('#quitar-logo');
    if (quitar) quitar.hidden = !url;
  }
  pintarLogo();

  // El color se aplica en vivo para que veas cómo queda antes de guardar.
  // Si sales sin guardar, se vuelve al color guardado.
  const colorInput = form.querySelector('#cf-color');
  colorInput.addEventListener('input', () => aplicarColor(colorInput.value));
  window.addEventListener('hashchange', () => aplicarColor(obtenerConfiguracion()?.color_primario), { once: true });
  contenedor.addEventListener('click', (e) => {
    const muestra = e.target.closest('[data-color]');
    if (!muestra) return;
    colorInput.value = muestra.dataset.color.toLowerCase();
    aplicarColor(colorInput.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!admin) return;
    errorForm(form);
    const d = Object.fromEntries(new FormData(form));
    const iva = aNumero(d.iva_defecto);
    const dias = aNumero(d.validez_dias);
    if (!d.nombre.trim()) return errorForm(form, 'El nombre del negocio es obligatorio.');
    if (!(iva >= 0 && iva <= 100)) return errorForm(form, 'El IVA debe estar entre 0 y 100.');
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return errorForm(form, 'La validez debe ser un número entero de días entre 1 y 365.');

    const datos = {
      nombre: d.nombre.trim(), nit: d.nit.trim(), telefono: d.telefono.trim(), email: d.email.trim(), sitio_web: d.sitio_web.trim(),
      direccion: d.direccion.trim(), color_primario: d.color_primario, iva_defecto: iva, validez_dias: dias,
      prefijo: d.prefijo.trim().toUpperCase(), moneda: d.moneda.trim().toUpperCase(), condiciones: d.condiciones.trim(),
    };
    await conBoton(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api.empresa.actualizar(datos);
        guardarConfiguracion(r.configuracion);
        window.dispatchEvent(new CustomEvent('marca-actualizada'));
        toast('Configuración guardada.');
      } catch (error) {
        errorForm(form, error.message);
      }
    });
  });

  // ---- Logo
  contenedor.querySelector('#archivo-logo')?.addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type)) return toast('El logo debe ser PNG, JPG o WEBP.', 'error');
    if (archivo.size > MAX_LOGO) return toast('El logo no puede pesar más de 2 MB.', 'error');
    try {
      await api.empresa.subirLogo(archivo);
      guardarLogoURL(URL.createObjectURL(await api.empresa.logo()));
      pintarLogo();
      window.dispatchEvent(new CustomEvent('marca-actualizada'));
      toast('Logo actualizado.');
    } catch (error) {
      toast(error instanceof ErrorApi ? error.message : 'No se pudo subir el logo.', 'error');
    }
  });

  contenedor.querySelector('#quitar-logo')?.addEventListener('click', async () => {
    const si = await confirmar({ titulo: 'Quitar logo', mensaje: '¿Quitar el logo? Dejará de aparecer en el menú y en los PDF.', textoConfirmar: 'Quitar', peligro: true });
    if (!si) return;
    try {
      await api.empresa.eliminarLogo();
      guardarLogoURL(null);
      pintarLogo();
      window.dispatchEvent(new CustomEvent('marca-actualizada'));
      toast('Logo eliminado.');
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}
