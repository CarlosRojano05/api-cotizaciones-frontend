/** Catálogo de productos y servicios. Todos lo ven; solo el administrador lo modifica. */
import { api } from '../api.js';
import { esAdmin } from '../estado.js';
import { dinero, normalizar } from '../utils/formato.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { aNumero } from '../utils/calculos.js';
import { abrirModal, bloqueCargando, bloqueError, conBoton, confirmar, errorForm, estadoVacio, toast } from '../utils/ui.js';

export const titulo = 'Catálogo';

function abrirFormularioItem({ item = null, alGuardar }) {
  const i = item ?? {};
  abrirModal({
    titulo: item ? 'Editar ítem' : 'Nuevo ítem',
    contenido: html`
      <form class="formulario" novalidate>
        <div class="rejilla">
          <div class="campo campo-completo"><label for="it-nombre">Nombre *</label>
            <input class="entrada" id="it-nombre" name="nombre" maxlength="150" value="${i.nombre}" required></div>
          <div class="campo campo-completo"><label for="it-desc">Descripción</label>
            <textarea class="entrada" id="it-desc" name="descripcion" rows="3" maxlength="1000">${i.descripcion}</textarea></div>
          <div class="campo"><label for="it-precio">Precio unitario *</label>
            <input class="entrada" id="it-precio" name="precio_unitario" type="number" min="0" step="any" inputmode="decimal" value="${i.precio_unitario}" required></div>
          <div class="campo"><label for="it-tipo">Tipo *</label>
            <select class="entrada" id="it-tipo" name="tipo">
              <option value="producto" ${i.tipo === 'producto' ? 'selected' : ''}>Producto</option>
              <option value="servicio" ${i.tipo === 'servicio' ? 'selected' : ''}>Servicio</option>
            </select></div>
        </div>
        <p class="error-form" role="alert" hidden></p>
        <div class="acciones">
          <button type="button" class="btn" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${item ? 'Guardar cambios' : 'Crear ítem'}</button>
        </div>
      </form>`,
    alMontar(modal, cerrar) {
      const form = modal.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorForm(form);
        const campos = Object.fromEntries(new FormData(form));
        const precio = aNumero(campos.precio_unitario);
        if (!campos.nombre.trim()) return errorForm(form, 'El nombre es obligatorio.');
        if (!Number.isFinite(precio) || precio < 0) return errorForm(form, 'El precio debe ser un número igual o mayor que 0.');

        const datos = { nombre: campos.nombre.trim(), descripcion: campos.descripcion.trim(), precio_unitario: precio, tipo: campos.tipo };
        await conBoton(form.querySelector('[type=submit]'), async () => {
          try {
            if (item) await api.items.actualizar(item.id, datos); else await api.items.crear(datos);
            toast(item ? 'Ítem actualizado.' : 'Ítem creado.');
            cerrar();
            alGuardar();
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
  let items = [];
  const filtros = { texto: '', tipo: '' };

  montar(contenedor, html`
    <div class="cabecera-pagina">
      <div><h1>Catálogo</h1><p class="subtitulo" id="conteo"></p></div>
      ${admin ? html`<button type="button" class="btn btn-primario" data-accion="nuevo">${icono('plus')} Nuevo ítem</button>` : ''}
    </div>
    ${admin ? '' : html`<div class="aviso aviso-info">Solo el administrador puede modificar el catálogo.</div>`}
    <div class="tarjeta tarjeta-sin-relleno">
      <div class="barra-herramientas">
        <div class="buscador">${icono('buscar')}
          <input type="search" class="entrada" id="buscar" placeholder="Buscar por nombre o descripción…" aria-label="Buscar en el catálogo"></div>
        <select class="entrada" id="tipo" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option><option value="producto">Productos</option><option value="servicio">Servicios</option>
        </select>
      </div>
      <div id="resultado"></div>
    </div>`);

  const resultado = contenedor.querySelector('#resultado');
  const conteo = contenedor.querySelector('#conteo');

  function pintar() {
    const q = normalizar(filtros.texto);
    const lista = items.filter((i) => (!filtros.tipo || i.tipo === filtros.tipo) && (!q || normalizar(`${i.nombre} ${i.descripcion}`).includes(q)));
    conteo.textContent = `${items.length} ${items.length === 1 ? 'ítem activo' : 'ítems activos'}`;

    if (!items.length) {
      montar(resultado, estadoVacio('El catálogo está vacío', admin ? 'Agrega los productos y servicios que ofreces.' : 'El administrador aún no ha cargado productos o servicios.',
        admin ? html`<button type="button" class="btn btn-primario" data-accion="nuevo">${icono('plus')} Nuevo ítem</button>` : ''));
      return;
    }
    if (!lista.length) { montar(resultado, estadoVacio('Sin resultados', 'Ningún ítem coincide con tu búsqueda.')); return; }

    montar(resultado, html`
      <table class="tabla tabla-apilada">
        <thead><tr><th>Ítem</th><th>Tipo</th><th class="derecha">Precio</th>${admin ? html`<th></th>` : ''}</tr></thead>
        <tbody>${lista.map((i) => html`
          <tr>
            <td data-label="Ítem" class="celda-principal"><div><strong>${i.nombre}</strong><span>${i.descripcion}</span></div></td>
            <td data-label="Tipo"><span class="insignia insignia-${i.tipo}">${i.tipo === 'producto' ? 'Producto' : 'Servicio'}</span></td>
            <td data-label="Precio" class="derecha nowrap negrita">${dinero(i.precio_unitario)}</td>
            ${admin ? html`<td data-label="" class="acciones-fila">
              <button type="button" class="btn-icono" data-accion="editar" data-id="${i.id}" title="Editar" aria-label="Editar ${i.nombre}">${icono('editar')}</button>
              <button type="button" class="btn-icono peligro" data-accion="desactivar" data-id="${i.id}" title="Desactivar" aria-label="Desactivar ${i.nombre}">${icono('basura')}</button></td>` : ''}
          </tr>`)}
        </tbody>
      </table>`);
  }

  async function cargar() {
    montar(resultado, bloqueCargando());
    try { items = await api.items.listar(); pintar(); } catch (e) { montar(resultado, bloqueError(e.message)); }
  }

  contenedor.querySelector('#buscar').addEventListener('input', (e) => { filtros.texto = e.target.value; pintar(); });
  contenedor.querySelector('#tipo').addEventListener('change', (e) => { filtros.tipo = e.target.value; pintar(); });

  contenedor.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const item = items.find((i) => i.id === Number(boton.dataset.id));
    if (boton.dataset.accion === 'nuevo') abrirFormularioItem({ alGuardar: cargar });
    else if (boton.dataset.accion === 'reintentar') cargar();
    else if (boton.dataset.accion === 'editar') abrirFormularioItem({ item, alGuardar: cargar });
    else if (boton.dataset.accion === 'desactivar') {
      const si = await confirmar({
        titulo: 'Desactivar ítem', textoConfirmar: 'Desactivar', peligro: true,
        mensaje: `¿Desactivar "${item.nombre}"? Ya no se podrá usar en cotizaciones nuevas, pero las existentes se conservan.`,
      });
      if (!si) return;
      try { await api.items.desactivar(item.id); toast('Ítem desactivado.'); cargar(); } catch (err) { toast(err.message, 'error'); }
    }
  });

  await cargar();
}
