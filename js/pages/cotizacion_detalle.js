/** Detalle de una cotización: datos, líneas, totales, cambio de estado, historial, PDF y anulación. */
import { api } from '../api.js';
import { esAdmin } from '../estado.js';
import { dinero, fechaCorta, fechaHora, insigniaEstado, numero, textoVencimiento } from '../utils/formato.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { bloqueCargando, bloqueError, conBoton, confirmar, descargarBlob, errorForm, navegar, toast } from '../utils/ui.js';

export const titulo = 'Detalle de cotización';

const ESTADOS = ['Pendiente', 'Aceptada', 'Rechazada'];

export default async function render({ contenedor, id }) {
  const admin = esAdmin();

  async function cargar() {
    const [c, historial] = await Promise.all([api.cotizaciones.obtener(id), api.cotizaciones.historial(id)]);
    pintar(c, historial);
  }

  function pintar(c, historial) {
    const otrosEstados = ESTADOS.filter((e) => e !== c.estado);
    montar(contenedor, html`
      <p class="pequeno"><a href="#/cotizaciones">← Volver a cotizaciones</a></p>
      <div class="detalle-cabecera">
        <div>
          <h1>${c.numero_formateado} ${insigniaEstado(c.estado, c.vencida)}</h1>
          <p class="subtitulo">Creada el ${fechaCorta(c.fecha)} · Válida hasta ${fechaCorta(c.fecha_vencimiento)}${c.estado === 'Pendiente' ? html` (${textoVencimiento(c.fecha_vencimiento)})` : ''}</p>
        </div>
        <div class="grupo-botones">
          <button type="button" class="btn" data-accion="ver-pdf">${icono('ojo')} Ver PDF</button>
          <button type="button" class="btn" data-accion="bajar-pdf">${icono('descargar')} Descargar</button>
          <a class="btn" href="#/cotizaciones/nueva?duplicar=${c.id}">${icono('copiar')} Duplicar</a>
          ${admin ? html`<button type="button" class="btn btn-peligro" data-accion="anular">${icono('basura')} Anular</button>` : ''}
        </div>
      </div>

      ${c.vencida ? html`<div class="aviso aviso-peligro">${icono('alerta')}<div>Esta cotización <strong>venció</strong> y sigue pendiente. Contacta al cliente o actualiza su estado.</div></div>` : ''}

      <div class="dos-columnas">
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Cliente</h2>
          <div class="dato"><span>Nombre</span>${c.cliente_nombre}</div>
          <div class="dato"><span>Identificación</span>${c.cliente_identificacion}</div>
          <div class="dato"><span>Teléfono</span>${c.cliente_telefono || '—'}</div>
          <div class="dato"><span>Correo</span>${c.cliente_email || '—'}</div>
          <div class="dato"><span>Dirección</span>${c.cliente_direccion || '—'}</div>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Seguimiento</h2>
          <form class="formulario" id="form-estado" novalidate>
            <div class="campo"><label for="nuevo-estado">Cambiar el estado a</label>
              <select class="entrada" id="nuevo-estado" name="estado">${otrosEstados.map((e) => html`<option value="${e}">${e}</option>`)}</select></div>
            <div class="campo"><label for="comentario">Comentario (opcional)</label>
              <input class="entrada" id="comentario" name="comentario" maxlength="255" placeholder="Ej.: El cliente confirmó por WhatsApp"></div>
            <p class="error-form" role="alert" hidden></p>
            <div class="acciones"><button type="submit" class="btn btn-primario">Actualizar estado</button></div>
          </form>
        </section>
      </div>

      <section class="tarjeta tarjeta-sin-relleno" style="margin-top:1rem">
        <table class="tabla tabla-apilada">
          <thead><tr><th>#</th><th>Descripción</th><th class="derecha">Cantidad</th><th class="derecha">Valor unitario</th><th class="derecha">Subtotal</th></tr></thead>
          <tbody>${c.detalles_cotizaciones.map((d, i) => html`
            <tr>
              <td data-label="#">${i + 1}</td>
              <td data-label="Descripción" class="celda-principal"><div><strong>${d.item_nombre}</strong><span>${d.item_descripcion}</span></div></td>
              <td data-label="Cantidad" class="derecha">${numero(d.cantidad)}</td>
              <td data-label="Valor unitario" class="derecha nowrap">${dinero(d.precio_unitario)}</td>
              <td data-label="Subtotal" class="derecha nowrap negrita">${dinero(d.subtotal_linea)}</td>
            </tr>`)}
          </tbody>
        </table>
        <div style="padding:1rem 1.15rem">
          <div class="totales">
            <div><span>Subtotal</span><span>${dinero(c.subtotal)}</span></div>
            ${Number(c.descuento) > 0 ? html`<div><span>Descuento</span><span>− ${dinero(c.descuento)}</span></div>` : ''}
            <div><span>IVA (${numero(c.iva_porcentaje)}%)</span><span>${dinero(c.impuesto)}</span></div>
            <div class="total-final"><span>Total</span><span>${dinero(c.total)}</span></div>
          </div>
        </div>
      </section>

      ${c.notas ? html`<section class="tarjeta"><h2 class="tarjeta-titulo">Notas</h2><p class="nota">${c.notas}</p></section>` : ''}

      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Historial de cambios</h2>
        <ul class="linea-tiempo">${historial.slice().reverse().map((h) => html`
          <li>
            <div><strong>${h.estado_anterior ? html`${h.estado_anterior} → ${h.estado_nuevo}` : h.estado_nuevo}</strong>${h.comentario ? html` — ${h.comentario}` : ''}</div>
            <div class="cuando">${fechaHora(h.fecha)} · ${h.usuario_nombre || 'Usuario eliminado'}</div>
          </li>`)}
        </ul>
      </section>`);

    // ---- Cambio de estado
    const form = contenedor.querySelector('#form-estado');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorForm(form);
      const { estado, comentario } = Object.fromEntries(new FormData(form));
      await conBoton(form.querySelector('[type=submit]'), async () => {
        try {
          await api.cotizaciones.cambiarEstado(id, estado, comentario.trim());
          toast(`Cotización marcada como ${estado.toLowerCase()}.`);
          await cargar();
        } catch (error) {
          errorForm(form, error.message);
        }
      });
    });
  }

  // ---- PDF: el navegador no puede pedirlo con un enlace normal (necesita el token), así que
  //      se descarga con fetch, se convierte en un archivo temporal y se abre.
  async function pdf(boton, descargar) {
    const nombre = `${contenedor.querySelector('h1').firstChild.textContent.trim()}.pdf`;
    const ventana = descargar ? null : window.open('', '_blank');   // se abre ya, para que el navegador no la bloquee
    await conBoton(boton, async () => {
      try {
        const archivo = await api.cotizaciones.pdf(id);
        if (descargar) {
          descargarBlob(archivo, nombre);
        } else {
          const url = URL.createObjectURL(archivo);
          if (ventana) ventana.location.href = url; else window.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } catch (error) {
        ventana?.close();
        toast(error.message, 'error');
      }
    });
  }

  contenedor.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    switch (boton.dataset.accion) {
      case 'ver-pdf': pdf(boton, false); break;
      case 'bajar-pdf': pdf(boton, true); break;
      case 'reintentar': cargar().catch((err) => montar(contenedor, bloqueError(err.message))); break;
      case 'anular': {
        const si = await confirmar({
          titulo: 'Anular cotización', textoConfirmar: 'Anular', peligro: true,
          mensaje: 'La cotización dejará de aparecer en las listas. Su número no se reutiliza. ¿Continuar?',
        });
        if (!si) return;
        try { await api.cotizaciones.anular(id); toast('Cotización anulada.'); navegar('/cotizaciones'); } catch (err) { toast(err.message, 'error'); }
        break;
      }
      default:
    }
  });

  montar(contenedor, bloqueCargando());
  await cargar();
}
