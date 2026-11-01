/** Mi cuenta: datos del usuario, cambio de contraseña y cierre de sesión. */
import { api } from '../api.js';
import { cerrarSesion } from '../estado.js';
import { html, montar } from '../utils/html.js';
import { icono } from '../utils/iconos.js';
import { conBoton, errorForm, navegar, toast } from '../utils/ui.js';

export const titulo = 'Mi cuenta';

export default async function render({ contenedor }) {
  const p = await api.perfil();

  montar(contenedor, html`
    <div class="cabecera-pagina"><div><h1>Mi cuenta</h1><p class="subtitulo">Tus datos y tu contraseña.</p></div></div>
    <div class="dos-columnas">
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Mis datos</h2>
        <div class="dato"><span>Nombre</span>${p.nombre}</div>
        <div class="dato"><span>Correo</span>${p.email}</div>
        <div class="dato"><span>Negocio</span>${p.empresa_nombre}</div>
        <div class="dato"><span>Rol</span><div><span class="insignia insignia-${p.rol}">${p.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span></div></div>
        <button type="button" class="btn" id="btn-cerrar" style="margin-top:.5rem">${icono('salir')} Cerrar sesión</button>
      </section>
      <section class="tarjeta" style="margin-top:0">
        <h2 class="tarjeta-titulo">Cambiar contraseña</h2>
        <form class="formulario" id="form-clave" novalidate>
          <div class="campo"><label for="c-actual">Contraseña actual</label>
            <input class="entrada" id="c-actual" name="actual" type="password" autocomplete="current-password" required></div>
          <div class="campo"><label for="c-nueva">Contraseña nueva <span class="ayuda">(mín. 8 caracteres)</span></label>
            <input class="entrada" id="c-nueva" name="nueva" type="password" autocomplete="new-password" maxlength="128" required></div>
          <div class="campo"><label for="c-nueva2">Repite la nueva contraseña</label>
            <input class="entrada" id="c-nueva2" name="nueva2" type="password" autocomplete="new-password" maxlength="128" required></div>
          <p class="error-form" role="alert" hidden></p>
          <div class="acciones"><button type="submit" class="btn btn-primario">Cambiar contraseña</button></div>
        </form>
      </section>
    </div>`);

  contenedor.querySelector('#btn-cerrar').addEventListener('click', () => { cerrarSesion(); navegar('/login'); });

  const form = contenedor.querySelector('#form-clave');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorForm(form);
    const { actual, nueva, nueva2 } = Object.fromEntries(new FormData(form));
    if (!actual || !nueva) return errorForm(form, 'Completa los campos.');
    if (nueva.length < 8) return errorForm(form, 'La contraseña nueva debe tener al menos 8 caracteres.');
    if (nueva !== nueva2) return errorForm(form, 'Las contraseñas nuevas no coinciden.');
    await conBoton(form.querySelector('[type=submit]'), async () => {
      try { await api.cambiarPassword(actual, nueva); toast('Contraseña actualizada.'); form.reset(); } catch (error) { errorForm(form, error.message); }
    });
  });
}
