/**
 * Nueva cotización: la pantalla más interactiva.
 *
 * Idea clave: el "estado" (state) vive en UN objeto de JavaScript. Los campos de la pantalla
 * solo lo muestran y lo modifican. Al escribir se actualiza el objeto y se recalculan los totales
 * tocando SOLO los números que cambian (no se redibuja todo, así el cursor no se pierde).
 *
 * Esto es exactamente lo que React automatiza con "useState": aquí lo hacemos a mano para entenderlo.
 */
import { api } from '../api.js';
import { esAdmin, obtenerConfiguracion } from '../estado.js';
import { aNumero, calcularTotales } from '../utils/calculos.js';
import { dinero, hoyISO, sumarDias } from '../utils/formato.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { bloqueCargando, conBoton, errorForm, estadoVacio, navegar, toast } from '../utils/ui.js';
import { abrirFormularioCliente } from './clientes.js';

export const titulo = 'Nueva cotización';

export default async function render({ contenedor, params }) {
  montar(contenedor, bloqueCargando());
  const config = obtenerConfiguracion();
  let [clientes, items] = await Promise.all([api.clientes.listar(), api.items.listar()]);

  if (!items.length) {
    montar(contenedor, estadoVacio('Tu catálogo está vacío', esAdmin()
      ? 'Antes de cotizar necesitas al menos un producto o servicio en el catálogo.'
      : 'El administrador aún no ha cargado productos o servicios en el catálogo.',
    esAdmin() ? html`<a class="btn btn-primario" href="#/items">Ir al catálogo</a>` : ''));
    return;
  }

  // ------------------------------------------------------------ Estado de la pantalla
  let contador = 0;
  const nuevaLinea = (datos = {}) => ({ clave: ++contador, itemId: datos.itemId ?? '', cantidad: datos.cantidad ?? '1', precio: datos.precio ?? '' });
  const estado = {
    clienteId: /^\d+$/.test(params.cliente || '') ? params.cliente : '',
    lineas: [nuevaLinea()],
    descuento: '0',
    iva: String(config?.iva_defecto ?? 19),
    vencimiento: sumarDias(hoyISO(), config?.validez_dias ?? 15),
    notas: '',
  };

  // "Duplicar": precarga los datos de una cotización existente
  if (/^\d+$/.test(params.duplicar || '')) {
    try {
      const origen = await api.cotizaciones.obtener(Number(params.duplicar));
      const lineas = []; const omitidos = [];
      origen.detalles_cotizaciones.forEach((d) => {
        if (items.some((i) => i.id === d.item_id)) lineas.push(nuevaLinea({ itemId: d.item_id, cantidad: String(d.cantidad), precio: String(d.precio_unitario) }));
        else omitidos.push(d.item_nombre);
      });
      if (lineas.length) estado.lineas = lineas;
      if (clientes.some((c) => c.id === origen.cliente_id)) estado.clienteId = String(origen.cliente_id);
      estado.descuento = String(origen.descuento);
      estado.iva = String(origen.iva_porcentaje);
      estado.notas = origen.notas ?? '';
      if (omitidos.length) toast(`Estos ítems ya no están en el catálogo y se omitieron: ${omitidos.join(', ')}.`, 'info');
    } catch (error) {
      toast(`No se pudo precargar la cotización: ${error.message}`, 'error');
    }
  }

  // ------------------------------------------------------------ Estructura de la pantalla
  const opcionesClientes = () => html`
    <option value="">Selecciona un cliente…</option>
    ${clientes.map((c) => html`<option value="${c.id}" ${String(c.id) === String(estado.clienteId) ? 'selected' : ''}>${c.nombre} (${c.identificacion})</option>`)}`;

  const filaLinea = (l) => html`
    <tr data-linea="${l.clave}">
      <td data-label="Producto o servicio">
        <select class="entrada" data-campo="itemId" aria-label="Producto o servicio">
          <option value="">Selecciona…</option>
          ${items.map((i) => html`<option value="${i.id}" ${String(i.id) === String(l.itemId) ? 'selected' : ''}>${i.nombre} · ${dinero(i.precio_unitario)}</option>`)}
        </select></td>
      <td class="col-cant" data-label="Cantidad">
        <input class="entrada" data-campo="cantidad" type="number" min="0" step="any" inputmode="decimal" value="${l.cantidad}" aria-label="Cantidad"></td>
      <td class="col-precio" data-label="Precio unitario">
        <input class="entrada" data-campo="precio" type="number" min="0" step="any" inputmode="decimal" value="${l.precio}" aria-label="Precio unitario"></td>
      <td class="col-sub" data-label="Subtotal"><span data-subtotal>${dinero(0)}</span></td>
      <td class="col-x" data-label=""><button type="button" class="btn-icono peligro" data-accion="quitar" title="Quitar línea" aria-label="Quitar línea">${icono('basura')}</button></td>
    </tr>`;

  montar(contenedor, html`
    <p class="pequeno"><a href="#/cotizaciones">← Volver a cotizaciones</a></p>
    <div class="cabecera-pagina"><div><h1>Nueva cotización</h1>
      <p class="subtitulo">Elige el cliente, agrega los productos o servicios y revisa el total antes de guardar.</p></div></div>

    <form id="form-cot" novalidate>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">1. Cliente y vigencia</h2>
        <div class="rejilla">
          <div class="campo"><label for="n-cliente">Cliente *</label>
            <select class="entrada" id="n-cliente">${opcionesClientes()}</select>
            <button type="button" class="btn btn-suave btn-sm" data-accion="nuevo-cliente" style="align-self:flex-start;margin-top:.3rem">${icono('plus', 15)} Nuevo cliente</button></div>
          <div class="campo"><label for="n-vence">Válida hasta</label>
            <input class="entrada" id="n-vence" type="date" min="${hoyISO()}" value="${estado.vencimiento}">
            <span class="ayuda">Por defecto: ${config?.validez_dias ?? 15} días desde hoy.</span></div>
        </div>
      </section>

      <section class="tarjeta tarjeta-sin-relleno">
        <h2 class="tarjeta-titulo" style="padding:1.15rem 1.15rem 0">2. Productos y servicios</h2>
        <table class="tabla tabla-apilada tabla-lineas">
          <thead><tr><th>Producto o servicio</th><th class="col-cant">Cantidad</th><th class="col-precio">Precio unitario</th><th class="derecha col-sub">Subtotal</th><th class="col-x"></th></tr></thead>
          <tbody id="lineas"></tbody>
        </table>
        <div style="padding:.9rem 1.15rem"><button type="button" class="btn btn-suave" data-accion="agregar">${icono('plus')} Agregar línea</button></div>
      </section>

      <div class="dos-columnas" style="margin-top:1rem">
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">3. Notas</h2>
          <div class="campo"><label for="n-notas" class="solo-lector">Notas</label>
            <textarea class="entrada" id="n-notas" rows="5" maxlength="2000" placeholder="Ej.: Entrega en 3 días hábiles. Incluye instalación.">${estado.notas}</textarea>
            <span class="ayuda">Aparecen en el PDF. Las condiciones generales de tu negocio se agregan solas.</span></div>
        </section>
        <section class="tarjeta" style="margin-top:0">
          <h2 class="tarjeta-titulo">4. Totales</h2>
          <div class="panel-totales">
            <div class="fila"><span>Subtotal</span><strong id="t-subtotal">${dinero(0)}</strong></div>
            <div class="fila"><label for="n-descuento">Descuento</label>
              <input class="entrada" id="n-descuento" type="number" min="0" step="any" inputmode="decimal" value="${estado.descuento}"></div>
            <div class="fila"><label for="n-iva">IVA (%)</label>
              <input class="entrada" id="n-iva" type="number" min="0" max="100" step="any" inputmode="decimal" value="${estado.iva}"></div>
            <div class="fila"><span class="suave">Valor del IVA</span><span id="t-impuesto">${dinero(0)}</span></div>
            <div class="fila total-final"><span>Total</span><span id="t-total">${dinero(0)}</span></div>
            <p class="ayuda" id="t-aviso" role="status"></p>
          </div>
        </section>
      </div>

      <p class="error-form" role="alert" hidden style="margin-top:1rem"></p>
      <div class="acciones" style="margin-top:1rem">
        <a class="btn" href="#/cotizaciones">Cancelar</a>
        <button type="submit" class="btn btn-primario">Guardar cotización</button>
      </div>
    </form>`);

  const form = contenedor.querySelector('#form-cot');
  const cuerpoLineas = contenedor.querySelector('#lineas');

  // ------------------------------------------------------------ Funciones de pintado y cálculo
  function pintarLineas() {
    montar(cuerpoLineas, html`${estado.lineas.map(filaLinea)}`);
    recalcular();
  }

  function recalcular() {
    const lineas = estado.lineas.map((l) => ({ cantidad: aNumero(l.cantidad), precio: aNumero(l.precio) }));
    const t = calcularTotales(lineas, aNumero(estado.descuento) || 0, aNumero(estado.iva) || 0);
    cuerpoLineas.querySelectorAll('tr[data-linea]').forEach((fila, i) => {
      fila.querySelector('[data-subtotal]').textContent = dinero(t.subtotales[i]);
    });
    contenedor.querySelector('#t-subtotal').textContent = dinero(t.subtotal);
    contenedor.querySelector('#t-impuesto').textContent = dinero(t.impuesto);
    contenedor.querySelector('#t-total').textContent = dinero(t.total);
    contenedor.querySelector('#t-aviso').textContent = t.descuento > t.subtotal ? '⚠ El descuento no puede ser mayor que el subtotal.' : '';
    return t;
  }

  // ------------------------------------------------------------ Eventos
  form.addEventListener('input', () => errorForm(form));     // al corregir algo, el mensaje de error se quita
  form.addEventListener('change', () => errorForm(form));
  cuerpoLineas.addEventListener('input', (e) => {
    const fila = e.target.closest('tr[data-linea]');
    const campo = e.target.dataset.campo;
    if (!fila || !campo || campo === 'itemId') return;
    estado.lineas.find((l) => l.clave === Number(fila.dataset.linea))[campo] = e.target.value;
    recalcular();
  });

  cuerpoLineas.addEventListener('change', (e) => {
    if (e.target.dataset.campo !== 'itemId') return;
    const fila = e.target.closest('tr[data-linea]');
    const linea = estado.lineas.find((l) => l.clave === Number(fila.dataset.linea));
    linea.itemId = e.target.value;
    const item = items.find((i) => String(i.id) === e.target.value);
    linea.precio = item ? String(item.precio_unitario) : '';      // al elegir un ítem se propone su precio de catálogo
    fila.querySelector('[data-campo="precio"]').value = linea.precio;
    recalcular();
  });

  contenedor.querySelector('#n-cliente').addEventListener('change', (e) => { estado.clienteId = e.target.value; });
  contenedor.querySelector('#n-vence').addEventListener('input', (e) => { estado.vencimiento = e.target.value; });
  contenedor.querySelector('#n-notas').addEventListener('input', (e) => { estado.notas = e.target.value; });
  contenedor.querySelector('#n-descuento').addEventListener('input', (e) => { estado.descuento = e.target.value; recalcular(); });
  contenedor.querySelector('#n-iva').addEventListener('input', (e) => { estado.iva = e.target.value; recalcular(); });

  contenedor.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (accion === 'agregar') {
      estado.lineas.push(nuevaLinea());
      pintarLineas();
      cuerpoLineas.querySelector('tr:last-child select').focus();
    } else if (accion === 'quitar') {
      const fila = e.target.closest('tr[data-linea]');
      if (estado.lineas.length === 1) { estado.lineas = [nuevaLinea()]; } else {
        estado.lineas = estado.lineas.filter((l) => l.clave !== Number(fila.dataset.linea));
      }
      pintarLineas();
    } else if (accion === 'nuevo-cliente') {
      abrirFormularioCliente({
        alGuardar: async (nuevoId) => {
          clientes = await api.clientes.listar();
          estado.clienteId = String(nuevoId);
          montar(contenedor.querySelector('#n-cliente'), opcionesClientes());
        },
      });
    }
  });

  // ------------------------------------------------------------ Guardar
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorForm(form);
    const falla = (mensaje) => { errorForm(form, mensaje); form.querySelector('.error-form').scrollIntoView({ block: 'center' }); };

    if (!estado.clienteId) return falla('Selecciona un cliente.');
    for (const [i, l] of estado.lineas.entries()) {
      const n = i + 1;
      if (!l.itemId) return falla(`En la línea ${n}, selecciona un producto o servicio.`);
      if (!(aNumero(l.cantidad) > 0)) return falla(`En la línea ${n}, la cantidad debe ser mayor que 0.`);
      if (!(aNumero(l.precio) >= 0)) return falla(`En la línea ${n}, escribe un precio válido (0 o más).`);
    }
    const t = recalcular();
    const iva = aNumero(estado.iva);
    if (!(iva >= 0 && iva <= 100)) return falla('El IVA debe estar entre 0 y 100.');
    const descuento = aNumero(estado.descuento);
    if (estado.descuento !== '' && !(descuento >= 0)) return falla('El descuento no puede ser negativo.');
    if (t.descuento > t.subtotal) return falla('El descuento no puede ser mayor que el subtotal.');
    if (estado.vencimiento && estado.vencimiento < hoyISO()) return falla('La fecha de vencimiento no puede estar en el pasado.');

    const datos = {
      cliente_id: Number(estado.clienteId),
      descuento: t.descuento,
      iva_porcentaje: iva,
      items: estado.lineas.map((l) => ({ item_id: Number(l.itemId), cantidad: aNumero(l.cantidad), precio_unitario: aNumero(l.precio) })),
    };
    if (estado.vencimiento) datos.fecha_vencimiento = estado.vencimiento;
    if (estado.notas.trim()) datos.notas = estado.notas.trim();

    await conBoton(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api.cotizaciones.crear(datos);
        toast(`Cotización ${r.numero_formateado} creada.`);
        navegar(`/cotizaciones/${r.cotizacion_id}`);
      } catch (error) {
        falla(error.message);
      }
    });
  });

  pintarLineas();
}
