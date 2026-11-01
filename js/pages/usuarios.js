/** Usuarios de la empresa (solo administrador): crear, restablecer contraseña y desactivar. */
import { api } from '../api.js';
import { obtenerSesion } from '../estado.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { abrirModal, bloqueCargando, bloqueError, conBoton, confirmar, errorForm, toast } from '../utils/ui.js';

export const titulo = 'Usuarios';

function abrirFormularioUsuario(alGuardar) {
  abrirModal({
    titulo: 'Nuevo usuario',
    contenido: html`
      <form class="formulario" novalidate>
        <div class="rejilla">
          <div class="campo campo-completo"><label for="u-nombre">Nombre *</label>
            <input class="entrada" id="u-nombre" name="nombre" maxlength="100" required></div>
          <div class="campo campo-completo"><label for="u-email">Correo electrónico *</label>
            <input class="entrada" id="u-email" name="email" type="email" maxlength="100" autocomplete="off" required></div>
          <div class="campo"><label for="u-pass">Contraseña inicial * <span class="ayuda">(mín. 8)</span></label>
            <input class="entrada" id="u-pass" name="password" type="password" maxlength="128" autocomplete="new-password" required></div>
          <div class="campo"><label for="u-rol">Rol</label>
            <select class="entrada" id="u-rol" name="rol">
              <option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select></div>
        </div>
        <p class="ayuda"><strong>Vendedor:</strong> crea y consulta cotizaciones y clientes. <strong>Administrador:</strong> además gestiona catálogo, usuarios y configuración.</p>
        <p class="error-form" role="alert" hidden></p>
        <div class="acciones"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn btn-primario">Crear usuario</button></div>
      </form>`,
    alMontar(modal, cerrar) {
      const form = modal.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorForm(form);
        const d = Object.fromEntries(new FormData(form));
        d.nombre = d.nombre.trim(); d.email = d.email.trim();
        if (!d.nombre || !d.email || !d.password) return errorForm(form, 'Completa todos los campos.');
        if (d.password.length < 8) return errorForm(form, 'La contraseña debe tener al menos 8 caracteres.');
        await conBoton(form.querySelector('[type=submit]'), async () => {
          try { await api.usuarios.crear(d); toast('Usuario creado.'); cerrar(); alGuardar(); } catch (error) { errorForm(form, error.message); }
        });
      });
    },
  });
}

function abrirRestablecer(usuario) {
  abrirModal({
    titulo: `Nueva contraseña para ${usuario.nombre}`,
    ancho: 'chico',
    contenido: html`
      <form class="formulario" novalidate>
        <div class="campo"><label for="rp-pass">Nueva contraseña * <span class="ayuda">(mín. 8)</span></label>
          <input class="entrada" id="rp-pass" name="password" type="password" maxlength="128" autocomplete="new-password" required></div>
        <p class="ayuda">Entrégasela a la persona por un medio seguro. Podrá cambiarla luego desde “Mi cuenta”.</p>
        <p class="error-form" role="alert" hidden></p>
        <div class="acciones"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="submit" class="btn btn-primario">Guardar</button></div>
      </form>`,
    alMontar(modal, cerrar) {
      const form = modal.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorForm(form);
        const { password } = Object.fromEntries(new FormData(form));
        if (password.length < 8) return errorForm(form, 'La contraseña debe tener al menos 8 caracteres.');
        await conBoton(form.querySelector('[type=submit]'), async () => {
          try { await api.usuarios.restablecerPassword(usuario.id, password); toast('Contraseña actualizada.'); cerrar(); } catch (error) { errorForm(form, error.message); }
        });
      });
    },
  });
}

export default async function render({ contenedor }) {
  const yo = obtenerSesion().usuario;
  let usuarios = [];

  montar(contenedor, html`
    <div class="cabecera-pagina">
      <div><h1>Usuarios</h1><p class="subtitulo">Las personas que pueden entrar al sistema de tu negocio.</p></div>
      <button type="button" class="btn btn-primario" data-accion="nuevo">${icono('plus')} Nuevo usuario</button>
    </div>
    <div class="tarjeta tarjeta-sin-relleno"><div id="resultado"></div></div>`);
  const resultado = contenedor.querySelector('#resultado');

  function pintar() {
    montar(resultado, html`
      <table class="tabla tabla-apilada">
        <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody>${usuarios.map((u) => html`
          <tr>
            <td data-label="Usuario" class="celda-principal"><div><strong>${u.nombre}${u.id === yo.id ? ' (tú)' : ''}</strong><span>${u.email}</span></div></td>
            <td data-label="Rol"><span class="insignia insignia-${u.rol}">${u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span></td>
            <td data-label="Estado">${u.activo ? html`<span class="insignia insignia-aceptada">Activo</span>` : html`<span class="insignia insignia-inactivo">Desactivado</span>`}</td>
            <td data-label="" class="acciones-fila">
              ${u.activo ? html`
                <button type="button" class="btn-icono" data-accion="clave" data-id="${u.id}" title="Cambiar contraseña" aria-label="Cambiar contraseña de ${u.nombre}">${icono('llave')}</button>
                ${u.id !== yo.id ? html`<button type="button" class="btn-icono peligro" data-accion="desactivar" data-id="${u.id}" title="Desactivar" aria-label="Desactivar a ${u.nombre}">${icono('basura')}</button>` : ''}` : ''}
            </td>
          </tr>`)}
        </tbody>
      </table>`);
  }

  async function cargar() {
    montar(resultado, bloqueCargando());
    try { usuarios = await api.usuarios.listar(); pintar(); } catch (e) { montar(resultado, bloqueError(e.message)); }
  }

  contenedor.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const usuario = usuarios.find((u) => u.id === Number(boton.dataset.id));
    if (boton.dataset.accion === 'nuevo') abrirFormularioUsuario(cargar);
    else if (boton.dataset.accion === 'reintentar') cargar();
    else if (boton.dataset.accion === 'clave') abrirRestablecer(usuario);
    else if (boton.dataset.accion === 'desactivar') {
      const si = await confirmar({
        titulo: 'Desactivar usuario', textoConfirmar: 'Desactivar', peligro: true,
        mensaje: `¿Desactivar a ${usuario.nombre}? Ya no podrá iniciar sesión. (Si tiene una sesión abierta, puede seguir usándola hasta que expire.)`,
      });
      if (!si) return;
      try { await api.usuarios.desactivar(usuario.id); toast('Usuario desactivado.'); cargar(); } catch (err) { toast(err.message, 'error'); }
    }
  });

  await cargar();
}
