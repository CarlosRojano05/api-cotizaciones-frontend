/** Panel principal: resumen de cotizaciones, alertas de vencimiento y gráfica de los últimos meses. */
import { api } from '../api.js';
import { obtenerSesion } from '../estado.js';
import { abreviar, dinero, fechaCorta, insigniaEstado, nombreMes } from '../utils/formato.js';
import { crudo, html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';

export const titulo = 'Panel';

/** Gráfica de barras en SVG puro (sin librerías): lo cotizado vs. lo aceptado, mes a mes. */
function grafica(meses) {
  const maximo = Math.max(...meses.map((m) => Math.max(m.total_cotizado, m.total_aceptado)));
  if (maximo <= 0) {
    return html`<div class="bloque-estado vacio"><p>Aún no hay cotizaciones en estos meses.</p></div>`;
  }
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const tope = Math.ceil(maximo / magnitud) * magnitud;          // 850.000 -> 900.000
  const [ancho, alto, izq, der, arriba, abajo] = [480, 250, 52, 8, 12, 28];
  const areaAlto = alto - arriba - abajo;
  const grupo = (ancho - izq - der) / meses.length;
  const barra = Math.min(26, grupo / 2 - 4);
  const y = (valor) => arriba + areaAlto - (valor / tope) * areaAlto;

  const lineas = [0, 1, 2, 3, 4].map((i) => {
    const valor = (tope / 4) * i;
    return `<line class="eje" x1="${izq}" x2="${ancho - der}" y1="${y(valor)}" y2="${y(valor)}"/>` +
           `<text x="${izq - 6}" y="${y(valor) + 4}" text-anchor="end">${abreviar(valor)}</text>`;
  }).join('');

  const barras = meses.map((m, i) => {
    const x0 = izq + i * grupo + grupo / 2;
    const rect = (clase, valor, desplazamiento, etiqueta) => valor > 0
      ? `<rect class="${clase}" x="${x0 + desplazamiento}" y="${y(valor)}" width="${barra}" height="${arriba + areaAlto - y(valor)}" rx="3">` +
        `<title>${nombreMes(m.mes)}: ${etiqueta} ${dinero(valor)}</title></rect>` : '';
    return rect('barra-cotizado', m.total_cotizado, -barra - 1, 'cotizado') +
           rect('barra-aceptado', m.total_aceptado, 1, 'aceptado') +
           `<text x="${x0}" y="${alto - 8}" text-anchor="middle">${nombreMes(m.mes)}</text>`;
  }).join('');

  const resumen = meses.map((m) => `${nombreMes(m.mes)}: ${dinero(m.total_cotizado)} cotizado, ${dinero(m.total_aceptado)} aceptado`).join('; ');
  return html`
    <div class="grafica">
      <svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Cotizado y aceptado por mes. ${resumen}">${crudo(lineas + barras)}</svg>
      <div class="leyenda"><span><i style="background:var(--color-primario-medio)"></i>Cotizado</span><span><i style="background:var(--color-primario)"></i>Aceptado</span></div>
    </div>`;
}

export default async function render({ contenedor }) {
  const d = await api.dashboard();
  const nombre = obtenerSesion().usuario.nombre.split(' ')[0];
  const sinCerradas = d.tasa_aceptacion === null;
  const venc = d.pendientes.vencidas;
  const porVencer = d.pendientes.por_vencer_7_dias;

  montar(contenedor, html`
    <div class="cabecera-pagina">
      <div><h1>Hola, ${nombre} 👋</h1><p class="subtitulo">Así van las cotizaciones de tu negocio.</p></div>
    </div>

    <div class="kpis">
      <a class="kpi kpi-pendiente" href="#/cotizaciones?estado=Pendiente">
        <div class="kpi-etiqueta">Pendientes</div><div class="kpi-valor">${d.por_estado.Pendiente.cantidad}</div>
        <div class="kpi-detalle">${dinero(d.por_estado.Pendiente.total)} por cerrar</div></a>
      <a class="kpi kpi-aceptada" href="#/cotizaciones?estado=Aceptada">
        <div class="kpi-etiqueta">Aceptadas</div><div class="kpi-valor">${d.por_estado.Aceptada.cantidad}</div>
        <div class="kpi-detalle">${dinero(d.por_estado.Aceptada.total)} vendidos</div></a>
      <a class="kpi kpi-rechazada" href="#/cotizaciones?estado=Rechazada">
        <div class="kpi-etiqueta">Rechazadas</div><div class="kpi-valor">${d.por_estado.Rechazada.cantidad}</div>
        <div class="kpi-detalle">${dinero(d.por_estado.Rechazada.total)}</div></a>
      <div class="kpi kpi-tasa ${sinCerradas ? 'kpi-sin-datos' : ''}">
        <div class="kpi-etiqueta">Tasa de aceptación</div>
        <div class="kpi-valor">${sinCerradas ? '—' : `${d.tasa_aceptacion.toLocaleString('es-CO')}%`}</div>
        <div class="kpi-detalle">${sinCerradas ? 'Aún no hay cotizaciones cerradas' : 'Aceptadas entre las cerradas'}</div></div>
    </div>

    <div class="kpis">
      <a class="kpi kpi-alerta" href="#/cotizaciones?vencidas=1">
        <div class="kpi-etiqueta">${icono('alerta', 15)} Vencidas sin respuesta</div><div class="kpi-valor">${venc.cantidad}</div>
        <div class="kpi-detalle">${venc.cantidad ? `${dinero(venc.total)} — haz seguimiento` : 'Todo al día'}</div></a>
      <a class="kpi" href="#/cotizaciones?estado=Pendiente">
        <div class="kpi-etiqueta">${icono('reloj', 15)} Vencen en 7 días</div><div class="kpi-valor">${porVencer.cantidad}</div>
        <div class="kpi-detalle">${porVencer.cantidad ? dinero(porVencer.total) : 'Nada por vencer pronto'}</div></a>
      <div class="kpi">
        <div class="kpi-etiqueta">Este mes</div><div class="kpi-valor">${d.mes_actual.cantidad}</div>
        <div class="kpi-detalle">${dinero(d.mes_actual.total_cotizado)} cotizados · ${dinero(d.mes_actual.total_aceptado)} aceptados</div></div>
    </div>

    <div class="paneles">
      <section class="tarjeta"><h2 class="tarjeta-titulo">Últimos 6 meses</h2>${grafica(d.por_mes)}</section>
      <section class="tarjeta tarjeta-sin-relleno">
        <h2 class="tarjeta-titulo" style="padding:1rem 1.15rem 0">Cotizaciones recientes</h2>
        ${d.recientes.length ? html`
          <table class="tabla tabla-apilada"><thead><tr><th>Cotización</th><th>Estado</th><th class="derecha">Total</th></tr></thead><tbody>
            ${d.recientes.map((c) => html`<tr class="fila-click" data-href="#/cotizaciones/${c.id}">
              <td data-label="Cotización" class="celda-principal"><div><strong><a href="#/cotizaciones/${c.id}">${c.numero_formateado}</a></strong><span>${c.cliente_nombre} · ${fechaCorta(c.fecha)}</span></div></td>
              <td data-label="Estado">${insigniaEstado(c.estado, c.vencida)}</td>
              <td data-label="Total" class="derecha nowrap">${dinero(c.total)}</td></tr>`)}
          </tbody></table>` : html`<div class="bloque-estado vacio"><p>Todavía no has creado cotizaciones.</p><a class="btn btn-primario" href="#/cotizaciones/nueva">Crear la primera</a></div>`}
      </section>
    </div>`);

  contenedor.addEventListener('click', (e) => {
    const fila = e.target.closest('[data-href]');
    if (fila && !e.target.closest('a')) location.hash = fila.dataset.href;
  });
}
