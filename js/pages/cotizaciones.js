/** Lista de cotizaciones con filtros (los filtra el servidor). */
import { api } from '../api.js';
import { dinero, fechaCorta, insigniaEstado, textoVencimiento } from '../utils/formato.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { bloqueCargando, bloqueError, debounce, estadoVacio } from '../utils/ui.js';

export const titulo = 'Cotizaciones';

export default async function render({ contenedor, params }) {
  const clientes = await api.clientes.listar();
  // Los filtros pueden venir en la dirección: #/cotizaciones?estado=Pendiente (así enlaza el panel)
  const filtros = {
    buscar: params.buscar || '',
    estado: ['Pendiente', 'Aceptada', 'Rechazada'].includes(params.estado) ? params.estado : '',
    cliente_id: /^\d+$/.test(params.cliente_id || '') ? params.cliente_id : '',
    vencidas: params.vencidas === '1' ? '1' : '',
  };

  montar(contenedor, html`
    <div class="cabecera-pagina">
      <div><h1>Cotizaciones</h1><p class="subtitulo">Consulta, filtra y haz seguimiento a tus cotizaciones.</p></div>
    </div>
    <div class="tarjeta tarjeta-sin-relleno">
      <div class="barra-herramientas">
        <div class="buscador">${icono('buscar')}
          <input type="search" class="entrada" id="f-buscar" value="${filtros.buscar}" placeholder="Buscar por número, cliente o identificación…" aria-label="Buscar cotizaciones"></div>
        <select class="entrada" id="f-estado" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          ${['Pendiente', 'Aceptada', 'Rechazada'].map((e) => html`<option value="${e}" ${filtros.estado === e ? 'selected' : ''}>${e}s</option>`)}
        </select>
        <select class="entrada" id="f-cliente" aria-label="Filtrar por cliente">
          <option value="">Todos los clientes</option>
          ${clientes.map((c) => html`<option value="${c.id}" ${String(c.id) === filtros.cliente_id ? 'selected' : ''}>${c.nombre}</option>`)}
        </select>
        <label class="casilla"><input type="checkbox" id="f-vencidas" ${filtros.vencidas ? 'checked' : ''}> Solo vencidas</label>
      </div>
      <div id="resultado"></div>
    </div>`);

  const resultado = contenedor.querySelector('#resultado');
  let peticion = 0;   // si el usuario escribe rápido, solo cuenta la respuesta más reciente

  const hayFiltros = () => Object.values(filtros).some(Boolean);

  async function cargar() {
    const esta = ++peticion;
    // Mantiene la dirección sincronizada (sin recargar la pantalla) para poder copiar o recargar con los mismos filtros
    const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    history.replaceState(null, '', `#/cotizaciones${qs ? `?${qs}` : ''}`);

    montar(resultado, bloqueCargando());
    try {
      const lista = await api.cotizaciones.listar(filtros);
      if (esta !== peticion) return;
      pintar(lista);
    } catch (error) {
      if (esta === peticion) montar(resultado, bloqueError(error.message));
    }
  }

  function pintar(lista) {
    if (!lista.length) {
      montar(resultado, hayFiltros()
        ? estadoVacio('Sin resultados', 'Ninguna cotización coincide con los filtros.', html`<button type="button" class="btn" data-accion="limpiar">Quitar filtros</button>`)
        : estadoVacio('Aún no hay cotizaciones', 'Crea la primera para empezar el seguimiento.', html`<a class="btn btn-primario" href="#/cotizaciones/nueva">${icono('plus')} Nueva cotización</a>`));
      return;
    }
    const suma = lista.reduce((acc, c) => acc + Number(c.total), 0);
    montar(resultado, html`
      <table class="tabla tabla-apilada">
        <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th><th>Estado</th><th class="derecha">Total</th></tr></thead>
        <tbody>${lista.map((c) => html`
          <tr class="fila-click" data-href="#/cotizaciones/${c.id}">
            <td data-label="Número" class="negrita nowrap"><a href="#/cotizaciones/${c.id}">${c.numero_formateado}</a></td>
            <td data-label="Cliente" class="celda-principal"><div><strong>${c.cliente_nombre}</strong><span>${c.cliente_identificacion}</span></div></td>
            <td data-label="Fecha" class="nowrap">${fechaCorta(c.fecha)}</td>
            <td data-label="Vencimiento" class="celda-principal"><div><strong class="nowrap">${fechaCorta(c.fecha_vencimiento)}</strong>
              ${c.estado === 'Pendiente' ? html`<span>${textoVencimiento(c.fecha_vencimiento)}</span>` : ''}</div></td>
            <td data-label="Estado">${insigniaEstado(c.estado, c.vencida)}</td>
            <td data-label="Total" class="derecha nowrap negrita">${dinero(c.total)}</td>
          </tr>`)}
        </tbody>
      </table>
      <div class="tabla-pie"><span>${lista.length} ${lista.length === 1 ? 'cotización' : 'cotizaciones'}</span><span>Suma: <strong>${dinero(suma)}</strong></span></div>`);
  }

  const alEscribir = debounce(() => cargar(), 300);
  contenedor.querySelector('#f-buscar').addEventListener('input', (e) => { filtros.buscar = e.target.value.trim(); alEscribir(); });
  contenedor.querySelector('#f-estado').addEventListener('change', (e) => { filtros.estado = e.target.value; cargar(); });
  contenedor.querySelector('#f-cliente').addEventListener('change', (e) => { filtros.cliente_id = e.target.value; cargar(); });
  contenedor.querySelector('#f-vencidas').addEventListener('change', (e) => { filtros.vencidas = e.target.checked ? '1' : ''; cargar(); });

  contenedor.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (accion === 'reintentar') return cargar();
    if (accion === 'limpiar') {
      Object.keys(filtros).forEach((k) => { filtros[k] = ''; });
      contenedor.querySelector('#f-buscar').value = '';
      contenedor.querySelector('#f-estado').value = '';
      contenedor.querySelector('#f-cliente').value = '';
      contenedor.querySelector('#f-vencidas').checked = false;
      return cargar();
    }
    const fila = e.target.closest('[data-href]');
    if (fila && !e.target.closest('a')) location.hash = fila.dataset.href;
    return undefined;
  });

  await cargar();
}
