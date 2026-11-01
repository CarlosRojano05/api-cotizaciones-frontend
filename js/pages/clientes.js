/** Clientes: lista con búsqueda, y formulario para crear / editar / desactivar. */
import { api } from '../api.js';
import { esAdmin } from '../estado.js';
import { normalizar } from '../utils/formato.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { abrirModal, bloqueCargando, bloqueError, conBoton, confirmar, errorForm, estadoVacio, toast } from '../utils/ui.js';

export const titulo = 'Clientes';

/**
 * Ventana con el formulario de cliente. Se exporta porque también la usa la pantalla
 * "Nueva cotización" (para crear un cliente sin salir de ella).
 */
export function abrirFormularioCliente({ cliente = null, alGuardar } = {}) {
  const c = cliente ?? {};
  abrirModal({
    titulo: cliente ? 'Editar cliente' : 'Nuevo cliente',
    contenido: html`
      <form class="formulario" novalidate>
        <div class="rejilla">
          <div class="campo campo-completo"><label for="cl-nombre">Nombre o razón social *</label>
            <input class="entrada" id="cl-nombre" name="nombre" maxlength="150" value="${c.nombre}" required></div>
          <div class="campo"><label for="cl-ident">Identificación (NIT o cédula) *</label>
            <input class="entrada" id="cl-ident" name="identificacion" maxlength="20" value="${c.identificacion}" required></div>
          <div class="campo"><label for="cl-tel">Teléfono</label>
            <input class="entrada" id="cl-tel" name="telefono" type="tel" maxlength="20" value="${c.telefono}"></div>
          <div class="campo campo-completo"><label for="cl-email">Correo electrónico</label>
            <input class="entrada" id="cl-email" name="email" type="email" maxlength="100" value="${c.email}"></div>
          <div class="campo campo-completo"><label for="cl-dir">Dirección</label>
            <input class="entrada" id="cl-dir" name="direccion" maxlength="255" value="${c.direccion}"></div>
        </div>
        <p class="error-form" role="alert" hidden></p>
        <div class="acciones">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
        </div>
      </form>`,
    alMontar(modal, cerrar) {
      const form = modal.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorForm(form);
        const datos = Object.fromEntries(new FormData(form));
        Object.keys(datos).forEach((k) => { datos[k] = datos[k].trim(); });
        if (!datos.nombre || !datos.identificacion) return errorForm(form, 'El nombre y la identificación son obligatorios.');
        if (datos.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email)) return errorForm(form, 'El correo no parece válido.');

        await conBoton(form.querySelector('[type=submit]'), async () => {
          try {
            const respuesta = cliente ? await api.clientes.actualizar(cliente.id, datos) : await api.clientes.crear(datos);
            toast(cliente ? 'Cliente actualizado.' : 'Cliente creado.');
            cerrar();
            alGuardar?.(cliente ? cliente.id : respuesta.id);
          } catch (error) {
            errorForm(form, error.message);
          }
        });
      });
    },
  });
}

export default async function render({ contenedor }) {
  const admin = esAdmin();
  let clientes = [];
  let filtro = '';

  montar(contenedor, html`
    <div class="cabecera-pagina">
      <div><h1>Clientes</h1><p class="subtitulo" id="conteo"></p></div>
      <button type="button" class="btn btn-primario" data-accion="nuevo">${icono('plus')} Nuevo cliente</button>
    </div>
    <div class="tarjeta tarjeta-sin-relleno">
      <div class="barra-herramientas">
        <div class="buscador">${icono('buscar')}
          <input type="search" class="entrada" id="buscar" placeholder="Buscar por nombre, identificación, teléfono o correo…" aria-label="Buscar clientes"></div>
      </div>
      <div id="resultado"></div>
    </div>`);

  const resultado = contenedor.querySelector('#resultado');
  const conteo = contenedor.querySelector('#conteo');

  function pintar() {
    const q = normalizar(filtro);
    const lista = q ? clientes.filter((c) => normalizar(`${c.nombre} ${c.identificacion} ${c.telefono} ${c.email}`).includes(q)) : clientes;
    conteo.textContent = `${clientes.length} ${clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}`;

    if (!clientes.length) {
      montar(resultado, estadoVacio('Aún no tienes clientes', 'Crea tu primer cliente para empezar a cotizar.',
        html`<button type="button" class="btn btn-primario" data-accion="nuevo">${icono('plus')} Nuevo cliente</button>`));
      return;
    }
    if (!lista.length) { montar(resultado, estadoVacio('Sin resultados', 'Ningún cliente coincide con tu búsqueda.')); return; }

    montar(resultado, html`
      <table class="tabla tabla-apilada">
        <thead><tr><th>Cliente</th><th>Identificación</th><th>Teléfono</th><th>Correo</th><th></th></tr></thead>
        <tbody>${lista.map((c) => html`
          <tr>
            <td data-label="Cliente" class="celda-principal"><div><strong>${c.nombre}</strong><span>${c.direccion}</span></div></td>
            <td data-label="Identificación" class="nowrap">${c.identificacion}</td>
            <td data-label="Teléfono" class="nowrap">${c.telefono || '—'}</td>
            <td data-label="Correo">${c.email || '—'}</td>
            <td data-label="" class="acciones-fila">
              <a class="btn btn-suave btn-sm" href="#/cotizaciones/nueva?cliente=${c.id}">Cotizar</a>
              <button type="button" class="btn-icono" data-accion="editar" data-id="${c.id}" title="Editar" aria-label="Editar ${c.nombre}">${icono('editar')}</button>
              ${admin ? html`<button type="button" class="btn-icono peligro" data-accion="desactivar" data-id="${c.id}" title="Desactivar" aria-label="Desactivar ${c.nombre}">${icono('basura')}</button>` : ''}
            </td>
          </tr>`)}
        </tbody>
      </table>`);
  }

  async function cargar() {
    montar(resultado, bloqueCargando());
    try { clientes = await api.clientes.listar(); pintar(); } catch (e) { montar(resultado, bloqueError(e.message)); }
  }

  contenedor.querySelector('#buscar').addEventListener('input', (e) => { filtro = e.target.value; pintar(); });

  contenedor.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const cliente = clientes.find((c) => c.id === Number(boton.dataset.id));
    switch (boton.dataset.accion) {
      case 'nuevo': abrirFormularioCliente({ alGuardar: cargar }); break;
      case 'editar': abrirFormularioCliente({ cliente, alGuardar: cargar }); break;
      case 'reintentar': cargar(); break;
      case 'desactivar': {
        const si = await confirmar({
          titulo: 'Desactivar cliente', textoConfirmar: 'Desactivar', peligro: true,
          mensaje: `¿Desactivar a "${cliente.nombre}"? Dejará de aparecer en tu lista, pero sus cotizaciones anteriores se conservan.`,
        });
        if (!si) return;
        try { await api.clientes.desactivar(cliente.id); toast('Cliente desactivado.'); cargar(); } catch (err) { toast(err.message, 'error'); }
        break;
      }
      default:
    }
  });

  await cargar();
}
